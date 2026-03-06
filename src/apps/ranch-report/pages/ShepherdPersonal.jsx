import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    subscribeToShepherdGroups,
    subscribeToShepherdReport,
    updateShepherdMember,
    setShepherdReport
} from '../shepherdSync.js';
import {
    getSundayOfWeek,
    shiftSunday,
    getWeekLabel,
    safeText,
    normalizeLeaders,
    normalizeMembers,
    computeMetaFromRows
} from '../utils.js';

export default function ShepherdPersonal({ user }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSunday = searchParams.get('sunday') || getSundayOfWeek(new Date());
    const [sunday, setSunday] = useState(initialSunday);

    const [groups, setGroups] = useState({});
    const [groupsFetched, setGroupsFetched] = useState(false);
    const [report, setReport] = useState(null);
    const [prevReport, setPrevReport] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [localUnlock, setLocalUnlock] = useState(false);

    useEffect(() => {
        setLocalUnlock(false);
    }, [sunday]);

    // 1. 모든 목장 정보 가져오기 (내 이름 찾기 위함)
    useEffect(() => {
        const unsub = subscribeToShepherdGroups((val) => {
            setGroups(val || {});
            setGroupsFetched(true);
        });
        return () => unsub?.();
    }, []);

    // 2. 로그인한 사용자의 정보 찾기 (목장 ID, 멤버 Key)
    const myMatch = useMemo(() => {
        if (!user?.name || !groups) return null;
        const userName = user.name.trim();
        for (const [gId, g] of Object.entries(groups)) {
            const members = g.members || {};
            for (const [mKey, m] of Object.entries(members)) {
                if (m.name === userName) {
                    return { groupId: gId, memberKey: mKey, group: g, memberInfo: m };
                }
            }
        }
        return null;
    }, [groups, user?.name]);

    const groupId = myMatch?.groupId;
    const memberKey = myMatch?.memberKey;

    useEffect(() => {
        if (!sunday || !groupId) {
            if (!groupId) setIsFetching(false);
            return;
        }
        setIsFetching(true);
        const unsub = subscribeToShepherdReport(sunday, groupId, (val) => {
            setReport(val);
            setIsFetching(false);
        });
        return () => unsub?.();
    }, [sunday, groupId]);

    useEffect(() => {
        if (!sunday || !groupId) return;
        const prevSunday = shiftSunday(sunday, -1);
        const unsub = subscribeToShepherdReport(prevSunday, groupId, setPrevReport);
        return () => unsub?.();
    }, [sunday, groupId]);


    // 내 데이터 추출
    const myData = useMemo(() => {
        return report?.members?.[memberKey] || null;
    }, [report, memberKey]);

    // 4. 보고서가 아직 없을 때 초기화 로직 (보좌용)
    async function ensureReport() {
        if (report || !groupId || !myMatch?.group) return;

        const baseMembers = normalizeMembers(myMatch.group.members || {});
        const initialMembers = {};
        baseMembers.forEach((m) => {
            initialMembers[m.key] = {
                name: m.name || '',
                sunday: false,
                cell: false,
                wed: false,
                dawnCount: 0,
                vipCount: 0,
                vipNames: '',
                bibleReading: false,
                prayer: '',
            };
        });

        const initial = {
            groupId,
            groupName: myMatch.group.name || '',
            leaders: normalizeLeaders(myMatch.group.leaders),
            sunday,
            members: initialMembers,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            submittedAt: null,
            meta: computeMetaFromRows(Object.values(initialMembers), true)
        };

        await setShepherdReport(sunday, groupId, initial);
    }

    const patchMyData = async (patch) => {
        if (!groupId || !memberKey) return;
        if (!report) {
            await ensureReport();
        }
        await updateShepherdMember(sunday, groupId, memberKey, {
            ...patch,
            ...(myData?.isPersonalReported ? { reportedAt: Date.now() } : {})
        });
    };

    const handleComplete = async () => {
        if (!groupId || !memberKey) return;
        if (!report) {
            await ensureReport();
        }
        await updateShepherdMember(sunday, groupId, memberKey, {
            isPersonalReported: true,
            reportedAt: Date.now()
        });
    };

    const handleRevert = async () => {
        if (!groupId || !memberKey) return;
        if (!report) return;
        await updateShepherdMember(sunday, groupId, memberKey, {
            isPersonalReported: false,
            reportedAt: null
        });
    };

    if (isFetching || !groupsFetched) {
        return <div style={centerMsg}>데이터를 불러오는 중...</div>;
    }

    if (!myMatch) {
        return (
            <div style={page}>
                <div style={container}>
                    <div style={box}>
                        <h2 style={{ color: '#DC2626' }}>목원 정보를 찾을 수 없습니다.</h2>
                        <p style={{ lineHeight: 1.6, color: '#4B5563' }}>
                            현재 로그인하신 이름(<b>{user?.name}</b>)이 목장 구성에 등록되어 있지 않습니다.
                            관리자에게 목원 등록을 요청해 주세요.
                        </p>
                        <button onClick={() => navigate('/shepherd/list')} style={primaryBtn}>목록으로</button>
                    </div>
                </div>
            </div>
        );
    }

    const isFinalSubmitted = !!report?.submittedAt;
    const isLocked = (myData?.isPersonalReported && !localUnlock) || isFinalSubmitted;

    return (
        <div style={page}>
            <div style={container}>
                {/* 헤더 섹션 */}
                <div style={header}>
                    <button onClick={() => setSunday(shiftSunday(sunday, -1))} style={arrowBtn}>◀</button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>{getWeekLabel(sunday)}</div>
                    </div>
                    <button onClick={() => setSunday(shiftSunday(sunday, 1))} style={arrowBtn}>▶</button>
                </div>

                {/* 메인 카드 */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={avatar}>{user.name?.slice(0, 1)}</div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px' }}>{user.name} 성도님</div>
                            <div style={{ fontSize: 15, color: '#0071E3', fontWeight: 700, marginTop: 4 }}>{myMatch.group.name} 목자에게 보고합니다</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: 20 }}>
                        {/* 출석 체크 */}
                        <section>
                            <h3 style={sectionTitle}>예배 및 모임 참여</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                <CheckBadge
                                    label="주일예배"
                                    checked={!!myData?.sunday}
                                    onChange={(v) => patchMyData({ sunday: v })}
                                    color="#EBF5FF" textColor="#2563EB"
                                    disabled={isLocked}
                                />
                                <CheckBadge
                                    label={<><span style={{ display: 'block' }}>목장</span><span style={{ display: 'block' }}>(오후예배)</span></>}
                                    checked={!!myData?.cell}
                                    onChange={(v) => patchMyData({ cell: v })}
                                    color="#F0FDF4" textColor="#16A34A"
                                    disabled={isLocked}
                                />
                                <CheckBadge
                                    label="수요예배"
                                    checked={!!myData?.wed}
                                    onChange={(v) => patchMyData({ wed: v })}
                                    color="#FEF2F2" textColor="#DC2626"
                                    disabled={isLocked}
                                />
                            </div>
                        </section>

                        {/* 특별 활동 */}
                        <section>
                            <h3 style={sectionTitle}>경건 훈련</h3>
                            <div style={{ display: 'grid', gap: 12 }}>
                                <div style={{ ...inputRow, opacity: isLocked ? 0.6 : 1 }}>
                                    <label style={inputLabel}>새벽기도 횟수</label>
                                    <div style={counterContainer}>
                                        <button onClick={() => patchMyData({ dawnCount: Math.max(0, (myData?.dawnCount || 0) - 1) })} style={countBtn} disabled={isLocked}>-</button>
                                        <div style={countVal}>{myData?.dawnCount || 0}</div>
                                        <button onClick={() => patchMyData({ dawnCount: Math.min(6, (myData?.dawnCount || 0) + 1) })} style={countBtn} disabled={isLocked}>+</button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', opacity: isLocked ? 0.6 : 1 }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>{parseInt(sunday.slice(5, 7), 10)}월 성경러닝크루 참여</div>
                                    </div>
                                    <Toggle checked={!!myData?.bibleReading} onChange={(v) => patchMyData({ bibleReading: v })} disabled={isLocked} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', opacity: isLocked ? 0.6 : 1 }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>지난 주 기도의 향 참여</div>
                                    </div>
                                    <Toggle checked={!!myData?.prayerScent} onChange={(v) => patchMyData({ prayerScent: v })} disabled={isLocked} />
                                </div>
                            </div>
                        </section>

                        {/* 153 VIP 및 기도제목 */}
                        <section>
                            <h3 style={sectionTitle}>오늘 전도한 vip 명단</h3>
                            <div style={{ display: 'grid', gap: 12 }}>
                                <div>
                                    <input
                                        disabled={isLocked}
                                        value={myData?.vipNames || ''}
                                        onChange={(e) => {
                                            const names = e.target.value;
                                            const count = names.split(/\s+/).filter(Boolean).length;
                                            patchMyData({ vipNames: names, vipCount: count });
                                        }}
                                        placeholder="예) 홍길동 김철수"
                                        style={{ ...textInput, opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'default' : 'text' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h3 style={{ ...sectionTitle, margin: 0 }}>개인 기도제목</h3>
                                    </div>

                                    <div style={{ display: 'grid', gap: 10 }}>
                                        <textarea
                                            value={myData?.prayer || ''}
                                            onChange={(e) => patchMyData({ prayer: e.target.value })}
                                            placeholder={safeText(prevReport?.members?.[memberKey]?.prayer) || "목자님께 전달하고 싶은 기도제목을 적어주세요."}
                                            rows={3}
                                            style={{ ...textarea, opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'default' : 'text' }}
                                            disabled={isLocked}
                                        />
                                        {!myData?.prayer && prevReport?.members?.[memberKey]?.prayer && !isLocked && (
                                            <button
                                                onClick={() => patchMyData({ prayer: prevReport.members[memberKey].prayer })}
                                                style={{ ...miniBtn, alignSelf: 'flex-start', background: '#F0F9FF', border: '1px solid #0071E3', fontSize: 12 }}
                                            >
                                                지난주 기도제목 불러오기
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div style={{ marginTop: 32 }}>
                        <button
                            onClick={
                                isFinalSubmitted
                                    ? null
                                    : isLocked
                                        ? () => setLocalUnlock(true)
                                        : () => { handleComplete(); setLocalUnlock(false); }
                            }
                            style={isFinalSubmitted ? finishBtnDisabled : (isLocked ? finishBtn : finishBtnSuccess)}
                            disabled={isFinalSubmitted}
                        >
                            {isFinalSubmitted ? '<교회에 보고됨>' : isLocked ? '수정하기' : '목자에게 보고합니다'}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: 13, color: isFinalSubmitted ? '#FF3B30' : '#86868B', marginTop: 14, lineHeight: 1.5, fontWeight: isFinalSubmitted ? 700 : 500 }}>
                            {isFinalSubmitted ? (
                                <>목장보고서가 교회에 제출된 상태입니다.<br />수정을 원하시면 목자에게 연락하세요.</>
                            ) : isLocked ? (
                                <>보고가 완료되었습니다.<br />수정하려면 <b>[수정하기]</b> 버튼을 눌러주세요.</>
                            ) : (
                                <><b>[목자에게 보고합니다]</b> 버튼을 눌러야<br />목장 보고서에 최종 반영됩니다.</>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- 하위 컴포넌트 ---
function CheckBadge({ label, checked, onChange, color, textColor, disabled }) {
    return (
        <div
            onClick={() => {
                if (!disabled) onChange(!checked);
            }}
            style={{
                padding: '14px 6px',
                borderRadius: 16,
                background: checked ? color : '#F8FAFC',
                border: checked ? `1.5px solid ${textColor}` : '1.5px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: disabled ? 'none' : (checked ? `0 4px 12px ${color}` : 'none'),
                opacity: disabled ? 0.5 : 1
            }}
        >
            <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: checked ? `6px solid ${textColor}` : '2px solid #CBD5E1',
                background: '#fff',
                boxSizing: 'border-box',
                transition: 'border 0.25s',
                margin: '0 auto' // Ensure it centers horizontally
            }} />
            <span style={{ fontSize: typeof label === 'string' && label.length > 4 ? 12 : 13, fontWeight: 700, color: checked ? textColor : '#64748B', whiteSpace: 'nowrap', letterSpacing: '-0.5px', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
        </div>
    );
}

function Toggle({ checked, onChange, disabled }) {
    return (
        <div
            onClick={() => {
                if (!disabled) onChange(!checked);
            }}
            style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                background: checked ? '#34C759' : '#E5E5EA',
                position: 'relative',
                cursor: disabled ? 'default' : 'pointer',
                transition: 'background 0.3s ease-in-out',
                opacity: disabled ? 0.5 : 1
            }}
        >
            <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 2,
                left: checked ? 24 : 2,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
        </div>
    );
}

// --- 스타일 ---
const page = { minHeight: '100vh', background: '#F5F5F7', paddingBottom: 60 };
const container = { maxWidth: 520, margin: '0 auto', padding: '0 16px' };
const centerMsg = { display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#86868B', fontWeight: 600 };

const header = {
    padding: '28px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const arrowBtn = {
    width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#FFFFFF',
    color: '#0071E3', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 'bold', fontSize: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.1s'
};

const card = {
    background: '#FFFFFF',
    borderRadius: 28,
    padding: '28px 24px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)'
};

const avatar = {
    width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #007AFF 0%, #0056B3 100%)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700,
    boxShadow: '0 4px 10px rgba(0, 122, 255, 0.3)'
};

const sectionTitle = { fontSize: 16, fontWeight: 800, color: '#0056B3', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 };

const inputRow = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#FAFAFC', borderRadius: 16, border: '1px solid #E5E5EA'
};

const inputLabel = { fontSize: 15, fontWeight: 600, color: '#1D1D1F' };

const counterContainer = { display: 'flex', alignItems: 'center', gap: 14 };
const countBtn = { width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#E5E5EA', cursor: 'pointer', fontWeight: 600, fontSize: 18, color: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const countVal = { fontSize: 17, fontWeight: 700, color: '#1D1D1F', minWidth: 24, textAlign: 'center' };

const smallLabel = { fontSize: 13, fontWeight: 600, color: '#86868B', display: 'block', marginBottom: 8 };
const textInput = { width: '100%', padding: '14px 16px', borderRadius: 16, border: '1px solid #E5E5EA', background: '#FAFAFC', fontSize: 15, color: '#1D1D1F', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' };
const textarea = { width: '100%', padding: '14px 16px', borderRadius: 16, border: '1px solid #E5E5EA', background: '#FAFAFC', fontSize: 15, color: '#1D1D1F', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, transition: 'border-color 0.2s, box-shadow 0.2s' };

const primaryBtn = { width: '100%', padding: '16px', borderRadius: 18, border: 'none', background: '#0071E3', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 16, boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)' };
const finishBtn = { width: '100%', padding: '16px', borderRadius: 18, border: 'none', background: '#1D1D1F', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(29, 29, 31, 0.2)', transition: 'background 0.2s' };
const finishBtnSuccess = { width: '100%', padding: '16px', borderRadius: 18, border: 'none', background: '#34C759', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)', transition: 'background 0.2s' };
const finishBtnDisabled = { width: '100%', padding: '16px', borderRadius: 18, border: 'none', background: '#8E8E93', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'not-allowed', opacity: 0.8 };
const miniBtn = {
    padding: '6px 14px',
    borderRadius: 14,
    border: 'none',
    background: '#F2F2F7',
    color: '#0071E3',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
};

const box = { background: '#fff', padding: 28, borderRadius: 24, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };

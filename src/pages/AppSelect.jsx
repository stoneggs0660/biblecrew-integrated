import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PrayerScentModal from '../apps/ranch-report/components/PrayerScentModal.jsx';
import { getSundayOfWeek, normalizeLeaders } from '../apps/ranch-report/utils.js';
import { subscribeToPrayerScent, subscribeToShepherdGroups, subscribeToShepherdReport, subscribeToMainNotice } from '../apps/ranch-report/shepherdSync.js';

export default function AppSelect({ user, onLogout }) {
    const navigate = useNavigate();
    const [isPrayerScentModalOpen, setIsPrayerScentModalOpen] = useState(false);
    const [prayerScentData, setPrayerScentData] = useState({});
    const [notice, setNotice] = useState('');
    const sunday = getSundayOfWeek(new Date());

    useEffect(() => {
        const unsub = subscribeToMainNotice((val) => {
            const text = (val?.text ?? '').toString();
            setNotice(text);
        });
        return () => unsub?.();
    }, []);

    useEffect(() => {
        if (!isPrayerScentModalOpen) return;
        const ym = sunday.slice(0, 7);
        const unsub = subscribeToPrayerScent(ym, setPrayerScentData);
        return () => unsub?.();
    }, [isPrayerScentModalOpen, sunday]);

    // 개인경건보고 제출 여부 확인 로직
    const [groups, setGroups] = useState({});
    const [report, setReport] = useState(null);
    const [isFetchingGroup, setIsFetchingGroup] = useState(true);
    const [isFetchingReport, setIsFetchingReport] = useState(true);

    useEffect(() => {
        setIsFetchingGroup(true);
        const unsub = subscribeToShepherdGroups((data) => {
            setGroups(data);
            setIsFetchingGroup(false);
        });
        return () => unsub?.();
    }, []);

    const myMatch = useMemo(() => {
        if (!user?.name || !groups) return null;
        const userName = user.name.trim();
        for (const [gId, g] of Object.entries(groups)) {
            const members = g.members || {};
            for (const [mKey, m] of Object.entries(members)) {
                if (m.name === userName) {
                    return { groupId: gId, memberKey: mKey, group: g };
                }
            }
        }
        return null;
    }, [groups, user?.name]);

    const groupId = myMatch?.groupId;
    const memberKey = myMatch?.memberKey;

    useEffect(() => {
        if (!sunday || !groupId) {
            setIsFetchingReport(false);
            return;
        }
        setIsFetchingReport(true);
        const unsub = subscribeToShepherdReport(sunday, groupId, (data) => {
            setReport(data);
            setIsFetchingReport(false);
        });
        return () => unsub?.();
    }, [sunday, groupId]);

    const needsPersonalReport = useMemo(() => {
        if (isFetchingGroup || isFetchingReport) return false;
        if (!groupId || !memberKey) return false;

        const myData = report?.members?.[memberKey];
        const isReported = !!myData?.isPersonalReported;
        const isSubmitted = !!report?.submittedAt;

        // 1. 본인이 보고를 완료했고(isReported)
        // 2. 혹은 목자가 교회에 최종 제출을 완료했다면(isSubmitted) 
        // 배지가 사라집니다. 즉, 둘 다 아닐 때만 '작성 대기'가 유지됩니다.
        return !isReported && !isSubmitted;
    }, [report, groupId, memberKey, isFetchingGroup, isFetchingReport]);

    const isLeader = useMemo(() => {
        if (isFetchingGroup) return false;
        if (!myMatch?.group || !user?.uid) return false;
        const leaders = normalizeLeaders(myMatch.group.leaders);
        return leaders.includes(user.uid);
    }, [isFetchingGroup, myMatch, user]);

    const needsShepherdReport = useMemo(() => {
        if (isFetchingGroup || isFetchingReport) return false;
        if (!isLeader || !groupId) return false;
        // 목자인데, 이번 주 보고서를 아직 최종 제출하지 않았거나(submittedAt 누락/null),
        // 제출을 '취소'하여 submittedAt 속성이 삭제/초기화된 경우 true
        return !report || !report.submittedAt;
    }, [isFetchingGroup, isFetchingReport, isLeader, groupId, report]);

    const isAllMembersPersonalReported = useMemo(() => {
        if (isFetchingGroup || isFetchingReport) return false;
        if (!isLeader || !groupId) return false;
        if (!report || report.submittedAt) return false;

        const members = myMatch?.group?.members || {};
        const memberKeys = Object.keys(members);
        if (memberKeys.length === 0) return false;

        const reportMembers = report.members || {};
        for (const key of memberKeys) {
            if (!reportMembers[key]?.isPersonalReported) {
                return false;
            }
        }
        return true;
    }, [isFetchingGroup, isFetchingReport, isLeader, groupId, report, myMatch]);

    return (
        <div style={{ minHeight: '100vh', background: '#F5F5F7', padding: '40px 20px 80px' }}>
            <div className="container animate-fade-in" style={{ maxWidth: 1000 }}>
                {/* Header - iOS Style Large Title */}
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 30,
                }}>
                    <div>
                        <div style={{ fontSize: 15, color: '#86868B', fontWeight: 500, marginBottom: 4 }}>
                            안녕하세요, 마산회원교회
                        </div>
                        <div style={{ fontSize: 20, color: '#0071E3', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.4px' }}>
                            하나님을 섬기는 예배자
                        </div>
                        <h2 className="title-large" style={{ margin: 0, lineHeight: 1.2, fontSize: 32 }}>
                            <span style={{ color: '#1D1D1F' }}>{user.name}</span> 님
                        </h2>
                    </div>
                    <button
                        onClick={onLogout}
                        style={{
                            background: '#E5E5EA',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            color: '#0071E3',
                            fontSize: '15px',
                            fontWeight: 600
                        }}
                    >
                        로그아웃
                    </button>
                </header>

                {/* Notice Banner */}
                {notice && (
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        padding: '16px 20px',
                        marginBottom: 30,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        borderLeft: '4px solid #0071E3',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0071E3' }}>📢 공지사항</div>
                        <div style={{ fontSize: 15, color: '#1D1D1F', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {notice}
                        </div>
                    </div>
                )}

                {/* Compact Grid Layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: window.innerWidth < 480 ? 12 : 24,
                    maxWidth: 760,
                    margin: '0 auto'
                }}>
                    {/* Bible Crew App - Top Left */}
                    <div
                        onClick={() => navigate('/bible-crew')}
                        className="apple-card"
                        style={{
                            cursor: 'pointer',
                            padding: window.innerWidth < 480 ? '20px 10px' : '30px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: window.innerWidth < 480 ? 160 : 200,
                            position: 'relative',
                            overflow: 'hidden',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            border: 'none',
                            boxShadow: '0 12px 30px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: -20, right: -20,
                            width: 100, height: 100,
                            background: 'rgba(255, 255, 255, 0.15)',
                            borderRadius: '50%',
                            filter: 'blur(30px)'
                        }} />
                        <div style={{
                            fontSize: window.innerWidth < 480 ? 32 : 44,
                            marginBottom: window.innerWidth < 480 ? 8 : 16,
                            background: 'rgba(255, 255, 255, 0.2)',
                            width: window.innerWidth < 480 ? 60 : 80,
                            height: window.innerWidth < 480 ? 60 : 80,
                            borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            🏃
                        </div>
                        <h3 className="title-medium" style={{ margin: 0, fontSize: window.innerWidth < 480 ? 16 : 20, fontWeight: 800, letterSpacing: '-0.5px', wordBreak: 'keep-all', color: '#FFFFFF' }}>성경러닝크루</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: window.innerWidth < 480 ? 11 : 13, color: 'rgba(255, 255, 255, 0.85)', textAlign: 'center', letterSpacing: '-0.3px', wordBreak: 'keep-all', fontWeight: 500, lineHeight: 1.2 }}>
                            말씀으로 달리는 일상
                        </p>
                    </div>

                    {/* Personal Devotion App - Top Right */}
                    <div
                        onClick={() => navigate(`/shepherd/personal?sunday=${encodeURIComponent(sunday)}`)}
                        className="apple-card"
                        style={{
                            cursor: 'pointer',
                            padding: window.innerWidth < 480 ? '20px 10px' : '30px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: window.innerWidth < 480 ? 160 : 200,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {needsPersonalReport && (
                            <div style={{
                                position: 'absolute',
                                top: window.innerWidth < 480 ? 10 : 16,
                                right: window.innerWidth < 480 ? 10 : 16,
                                background: '#FEF2F2',
                                color: '#DC2626',
                                padding: '4px 8px',
                                borderRadius: 100,
                                fontSize: 10,
                                fontWeight: 800,
                                border: '1px solid #FCA5A5',
                                zIndex: 10
                            }}>
                                작성 대기
                            </div>
                        )}
                        <div style={{
                            position: 'absolute',
                            top: -20, right: -20,
                            width: 80, height: 80,
                            background: '#0071E3',
                            opacity: 0.1,
                            borderRadius: '50%',
                            filter: 'blur(20px)'
                        }} />
                        <div style={{
                            fontSize: window.innerWidth < 480 ? 32 : 44,
                            marginBottom: window.innerWidth < 480 ? 8 : 16,
                            background: '#F0F9FF',
                            width: window.innerWidth < 480 ? 60 : 80,
                            height: window.innerWidth < 480 ? 60 : 80,
                            borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            📝
                        </div>
                        <h3 className="title-medium" style={{ margin: 0, fontSize: window.innerWidth < 480 ? 16 : 20, fontWeight: 800, letterSpacing: '-0.5px', wordBreak: 'keep-all' }}>개인경건보고</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: window.innerWidth < 480 ? 10 : 13, color: '#86868B', textAlign: 'center', letterSpacing: '-0.3px', wordBreak: 'keep-all', fontWeight: 500, lineHeight: 1.2 }}>
                            당신의 귀한 삶을 목자에게 알려주세요
                        </p>
                    </div>

                    {/* Prayer Scent App - Bottom Left */}
                    <div
                        onClick={() => setIsPrayerScentModalOpen(true)}
                        className="apple-card"
                        style={{
                            cursor: 'pointer',
                            padding: window.innerWidth < 480 ? '20px 10px' : '30px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: window.innerWidth < 480 ? 160 : 200,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: -20, right: -20,
                            width: 80, height: 80,
                            background: '#EF4444',
                            opacity: 0.1,
                            borderRadius: '50%',
                            filter: 'blur(20px)'
                        }} />
                        <div style={{
                            marginBottom: window.innerWidth < 480 ? 8 : 16,
                            background: '#FEF2F2',
                            width: window.innerWidth < 480 ? 60 : 80,
                            height: window.innerWidth < 480 ? 60 : 80,
                            borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <img src="/icons/fire.png" alt="기도의 향" style={{ width: window.innerWidth < 480 ? 32 : 44, height: window.innerWidth < 480 ? 32 : 44, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                            <span style={{ fontSize: window.innerWidth < 480 ? 32 : 44, display: 'none' }}>🔥</span>
                        </div>
                        <h3 className="title-medium" style={{ margin: 0, fontSize: window.innerWidth < 480 ? 16 : 20, fontWeight: 800, letterSpacing: '-0.5px', wordBreak: 'keep-all' }}>기도의 향</h3>
                    </div>

                    {/* Shepherd Report App - Bottom Right */}
                    <div
                        onClick={() => navigate('/shepherd')}
                        className="apple-card"
                        style={{
                            cursor: 'pointer',
                            padding: window.innerWidth < 480 ? '20px 10px' : '30px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: window.innerWidth < 480 ? 160 : 200,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {needsShepherdReport && !isAllMembersPersonalReported && (
                            <div style={{
                                position: 'absolute',
                                top: window.innerWidth < 480 ? 10 : 16,
                                right: window.innerWidth < 480 ? 10 : 16,
                                background: '#FEF2F2',
                                color: '#DC2626',
                                padding: '4px 8px',
                                borderRadius: 100,
                                fontSize: 10,
                                fontWeight: 800,
                                border: '1px solid #FCA5A5',
                                zIndex: 10
                            }}>
                                작성 대기
                            </div>
                        )}
                        {needsShepherdReport && isAllMembersPersonalReported && (
                            <div style={{
                                position: 'absolute',
                                top: window.innerWidth < 480 ? 10 : 16,
                                right: window.innerWidth < 480 ? 10 : 16,
                                background: '#F5F3FF',
                                color: '#7C3AED',
                                padding: '4px 8px',
                                borderRadius: 100,
                                fontSize: 10,
                                fontWeight: 800,
                                border: '1px solid #DDD6FE',
                                zIndex: 10
                            }}>
                                목원보고완료
                            </div>
                        )}
                        <div style={{
                            position: 'absolute',
                            top: -20, right: -20,
                            width: 80, height: 80,
                            background: '#8B5CF6',
                            opacity: 0.1,
                            borderRadius: '50%',
                            filter: 'blur(20px)'
                        }} />
                        <div style={{
                            fontSize: window.innerWidth < 480 ? 32 : 44,
                            marginBottom: window.innerWidth < 480 ? 8 : 16,
                            background: '#F5F3FF',
                            width: window.innerWidth < 480 ? 60 : 80,
                            height: window.innerWidth < 480 ? 60 : 80,
                            borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            🐑
                        </div>
                        <h3 className="title-medium" style={{ margin: 0, fontSize: window.innerWidth < 480 ? 16 : 20, fontWeight: 800, letterSpacing: '-0.5px', wordBreak: 'keep-all' }}>목자보고</h3>
                    </div>

                    {isPrayerScentModalOpen && (
                        <PrayerScentModal
                            user={user}
                            sunday={sunday}
                            data={prayerScentData}
                            onClose={() => setIsPrayerScentModalOpen(false)}
                        />
                    )}
                </div>
            </div>
        </div >
    );
}


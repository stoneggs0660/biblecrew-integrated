import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { subscribeToShepherdGroup, subscribeToShepherdReport, setShepherdReport, patchShepherdReport, updateShepherdMember } from '../shepherdSync.js';
import { getSundayOfWeek, shiftSunday, getWeekLabel, normalizeMembers, computeMetaFromRows, safeText, normalizeLeaders } from '../utils.js';
import { db } from '../../../firebase';
import { ref, get } from 'firebase/database';

export default function ShepherdWrite({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initSunday = searchParams.get('sunday') || getSundayOfWeek(new Date());
  const initGroupId = searchParams.get('groupId') || '';

  const [sunday, setSunday] = useState(initSunday);
  const [groupId, setGroupId] = useState(initGroupId);
  const [group, setGroup] = useState(null);
  const [groupFetched, setGroupFetched] = useState(false);
  const [report, setReport] = useState(null);
  const [latestPrevReport, setLatestPrevReport] = useState(null);
  const [adminOk, setAdminOk] = useState(() => sessionStorage.getItem('shepherd_admin_ok') === '1');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 720 : false));
  const [prayerEditKey, setPrayerEditKey] = useState(null);
  const [prayerDrafts, setPrayerDrafts] = useState({});
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => setAdminOk(sessionStorage.getItem('shepherd_admin_ok') === '1'), []);
  useEffect(() => setSearchParams({ sunday, groupId }, { replace: true }), [sunday, groupId, setSearchParams]);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToShepherdGroup(groupId, (val) => {
      setGroup(val);
      setGroupFetched(true);
    });
    return () => unsub?.();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !sunday) {
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    const unsub = subscribeToShepherdReport(sunday, groupId, (val) => {
      setReport(val);
      setIsFetching(false);
    });
    return () => unsub?.();
  }, [groupId, sunday]);

  useEffect(() => {
    if (!groupId || !sunday) {
      setLatestPrevReport(null);
      return;
    }

    let isCancelled = false;

    async function findLatest() {
      // Search back up to 12 weeks
      for (let i = 1; i <= 12; i++) {
        const targetSunday = shiftSunday(sunday, -i);
        // Use shepherdSync's logic pattern or direct ref
        const reportRef = ref(db, `shepherd/reports/${targetSunday}/${groupId}`);
        try {
          const snap = await get(reportRef);
          if (isCancelled) return;
          if (snap.exists()) {
            setLatestPrevReport(snap.val());
            return;
          }
        } catch (e) {
          console.error("Error searching back:", e);
        }
      }
      if (!isCancelled) setLatestPrevReport(null);
    }

    findLatest();
    return () => { isCancelled = true; };
  }, [groupId, sunday]);

  const leaders = useMemo(() => normalizeLeaders(group?.leaders), [group]);
  const canAccess = useMemo(() => {
    if (adminOk) return true;
    if (!user?.uid) return false;
    return leaders.includes(user.uid);
  }, [adminOk, leaders, user]);

  const baseMemberRows = useMemo(() => normalizeMembers(group?.members || {}), [group]);

  const mergedRows = useMemo(() => {
    const reportMembers = report?.members || {};
    return baseMemberRows.map((m) => {
      const r = reportMembers[m.key] || {};
      return {
        key: m.key,
        name: m.name || r.name || '',
        birthday: m.birthday || '',
        org: m.org || '',
        sunday: !!r.sunday,
        cell: !!r.cell,
        wed: !!r.wed,
        dawnCount: Number.isFinite(r.dawnCount) ? r.dawnCount : (parseInt(r.dawnCount || 0, 10) || 0),
        vipCount: Number.isFinite(r.vipCount) ? r.vipCount : (parseInt(r.vipCount || 0, 10) || 0),
        vipNames: r.vipNames || '',
        bibleReading: !!r.bibleReading,
        prayer: r.prayer || '',
        isPersonalReported: !!r.isPersonalReported,
        reportedAt: r.reportedAt || 0,
      };
    });
  }, [baseMemberRows, report]);

  const hasMeeting = report?.hasMeeting !== false;
  const meta = useMemo(() => computeMetaFromRows(mergedRows, hasMeeting), [mergedRows, hasMeeting]);

  useEffect(() => {
    if (!groupId || !sunday || !group || isFetching) return;
    if (report) return;

    const initialMembers = {};
    baseMemberRows.forEach((m) => {
      initialMembers[m.key] = {
        name: m.name || '',
        sunday: false,
        cell: false,
        wed: false,
        dawnCount: 0,
        evangelismCount: 0,
        vipCount: 0,
        vipNames: '',
        bibleReading: false,
        prayer: '',
      };
    });

    const initial = {
      groupId,
      groupName: group?.name || '',
      leaders: normalizeLeaders(group?.leaders),
      sunday,
      members: initialMembers,
      // Note fields (reportNote, prayerNote, vipList) are omitted here to enable dynamic inheritance 
      // via the ?? operator in the UI. This ensures changes propagate until modified next week.
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submittedAt: null,
      meta: { ...meta },
    };

    setShepherdReport(sunday, groupId, initial).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, groupId, sunday, group, isFetching]);

  useEffect(() => {
    if (!report) return;
    patchShepherdReport(sunday, groupId, { meta }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meta.totalMembers,
    meta.sundayAttendance,
    meta.cellAttendance,
    meta.wedAttendance,
    meta.dawnTotal,
    meta.bibleReadingAttendance,
    meta.vipCount,
    JSON.stringify(meta.vipNames || []),
    JSON.stringify(meta.absentees || []),
  ]);

  if (!user || !user.uid) return <Navigate to='/login' replace />;
  if (!groupId) {
    return (
      <div style={pageWrap}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>목장을 선택해 주세요.</div>
        <button onClick={() => navigate('/shepherd/list')} style={btn}>목장 목록으로</button>
      </div>
    );
  }

  if (isFetching || (groupId && !groupFetched)) {
    return (
      <div style={pageWrap}>
        <div style={{ textAlign: 'center', padding: 40, fontSize: 16, fontWeight: 900, color: '#6B7280' }}>
          보고서 데이터를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div style={pageWrap}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>접근 권한이 없습니다.</div>
        <div style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.6 }}>
          현재 계정(<b>{user.uid}</b>)은 이 목장 보고서를 열람/작성할 권한이 없습니다.
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/shepherd/list')} style={btn}>목장 목록</button>
          <button onClick={() => navigate('/shepherd/admin')} style={btn}>관리자</button>
        </div>
      </div>
    );
  }

  const submitted = !!(report?.submittedAt);

  const handleToggleSubmit = async () => {
    if (submitted) {
      patchShepherdReport(sunday, groupId, { submittedAt: null });
    } else {
      const now = Date.now();
      const promises = [];
      for (const row of mergedRows) {
        if (!row.isPersonalReported) {
          promises.push(patchMember(sunday, groupId, row.key, { isPersonalReported: true, reportedAt: now }));
        }
      }
      promises.push(patchShepherdReport(sunday, groupId, { submittedAt: now }));
      await Promise.all(promises);
    }
  };

  return (
    <div style={{ ...pageWrap, maxWidth: 1100 }}>
      <div style={topRow}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>{group?.name || '목장'} 보고서</div>
          <div style={{ marginTop: 8, color: '#4B5563', fontSize: 16, fontWeight: 700 }}>목자: {(leaders || []).join(', ') || '-'}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setSunday(shiftSunday(sunday, -1))} style={arrowBtn}>◀</button>
          <div style={{ fontWeight: 800, color: '#1D1D1F', fontSize: 16 }}>{getWeekLabel(sunday)}</div>
          <button onClick={() => setSunday(shiftSunday(sunday, 1))} style={arrowBtn}>▶</button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
        <div style={box}>
          <div style={{ fontWeight: 800, marginBottom: 16, color: '#1D1D1F', fontSize: 16 }}>목장전체</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10 }}>
            <Stat label='재적' value={meta.totalMembers} />
            <Stat label='주일예배' value={meta.sundayAttendance} />
            <Stat label='목장모임' value={meta.cellAttendance} />
            <Stat label='새벽합계' value={meta.dawnTotal} />
            <Stat label='수요' value={meta.wedAttendance} />
            <Stat label='러닝크루' value={meta.bibleReadingAttendance} />
            <Stat label='153 VIP' value={meta.vipCount} />
          </div>

          <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
            <div style={subLine}>
              <div style={subLabel}>예비목원 명단</div>
              <div style={{ ...subValue, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={report?.vipList ?? latestPrevReport?.vipList ?? ''}
                      onChange={(e) => patchShepherdReport(sunday, groupId, { vipList: e.target.value })}
                      disabled={submitted}
                      rows={2}
                      style={{ ...textarea, fontSize: 13, padding: '10px', opacity: submitted ? 0.6 : 1 }}
                      placeholder="예비목원 명단 (예: 홍길동 김영희 ...)"
                    />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#718096', background: '#F7FAFC', padding: '4px 8px', borderRadius: 6 }}>
                  <span style={{ fontWeight: 800 }}>예비목원:</span> 목장매칭 후 생삶 미수료자 명단
                </div>
              </div>
            </div>

            <div style={subLine}>
              <div style={subLabel}>153 VIP 명단</div>
              <div style={{ ...subValue, flex: 1 }}>
                <div>{meta.vipNames && meta.vipNames.length > 0 ? meta.vipNames.join(', ') : '없음'}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: '#718096', background: '#F7FAFC', padding: '4px 8px', borderRadius: 6 }}>
                  <span style={{ fontWeight: 800 }}>VIP:</span> 우리목장의 153 전도로 처음교회 온 vip 명단
                </div>
              </div>
            </div>

            <div style={subLine}>
              <div style={subLabel}>주일 결석자 명단</div>
              <div style={subValue}>{meta.absentees.length ? meta.absentees.join(', ') : '없음'}</div>
            </div>
          </div>
        </div>

        <div style={{ color: '#E53E3E', fontWeight: 800, fontSize: 13, lineHeight: 1.6, background: '#FFF5F5', padding: '16px 20px', borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#C53030' }}>
            1. 아래에 &lt;보고미완료&gt; 목원에게 보고를 작성하도록 알려주세요.<br />
            2. 목원의 보고가 늦어지면, 따로 연락하여 내용을 받아서 목자가 직접 아래를 작성해 보고해 주세요.<br />
            3. 보고 내용이 맞는지 확인 후, 페이지 아래 끝 &lt;보고하기&gt;를 눌러주세요.
          </span>
        </div>

        <div>
          {isMobile ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {mergedRows.map((row) => {
                const prevPrayer = safeText(latestPrevReport?.members?.[row.key]?.prayer);
                const curPrayer = safeText(row.prayer);
                const effectivePrayer = curPrayer || prevPrayer;
                const prayerEditing = prayerEditKey === row.key;

                return (
                  <div key={row.key} style={memberCard}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 800, color: '#1D1D1F', fontSize: 18, letterSpacing: '-0.3px' }}>{row.name || '(이름)'}</div>
                        {!row.isPersonalReported && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '4px 8px', borderRadius: 12 }}>
                            ✖ 보고미완료
                          </span>
                        )}
                        {row.isPersonalReported && (!report?.submittedAt || row.reportedAt <= report.submittedAt) && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '4px 8px', borderRadius: 12 }}>
                            ✔ 보고완료
                          </span>
                        )}
                        {row.isPersonalReported && report?.submittedAt && row.reportedAt > report.submittedAt && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '4px 8px', borderRadius: 12 }}>
                            ✍ 수정됨
                          </span>
                        )}
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: 14, color: '#86868B', fontWeight: 600 }}>{row.org || ''}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                      <CheckBadge label="주일" checked={!!row.sunday} onChange={(v) => patchMember(sunday, groupId, row.key, { sunday: v })} color="#E3F2FD" textColor="#0D47A1" disabled={submitted} />
                      <CheckBadge label={hasMeeting ? "목장" : "모임없음"} checked={!!row.cell} onChange={(v) => hasMeeting && patchMember(sunday, groupId, row.key, { cell: v })} color="#E8F5E9" textColor="#1B5E20" disabled={!hasMeeting || submitted} />
                      <CheckBadge label="수요" checked={!!row.wed} onChange={(v) => patchMember(sunday, groupId, row.key, { wed: v })} color="#FFF3E0" textColor="#E65100" disabled={submitted} />
                      <CheckBadge label="러닝" checked={!!row.bibleReading} onChange={(v) => patchMember(sunday, groupId, row.key, { bibleReading: v })} color="#F3E5F5" textColor="#7B1FA2" disabled={submitted} />
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', borderRadius: 10, border: '1px solid #D1D5DB', padding: '0 8px', height: 40, flexShrink: 0, opacity: submitted ? 0.6 : 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#4B5563', marginRight: 4 }}>새벽</span>
                        <input
                          type='number'
                          inputMode='numeric'
                          disabled={submitted}
                          value={Number.isFinite(row.dawnCount) && row.dawnCount > 0 ? row.dawnCount : ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                            patchMember(sunday, groupId, row.key, { dawnCount: Math.min(6, val) });
                          }}
                          style={{ width: 28, background: 'transparent', border: 'none', color: submitted ? '#9CA3AF' : '#111827', fontSize: 15, fontWeight: 900, textAlign: 'center', outline: 'none', padding: 0 }}
                          placeholder="0"
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', borderRadius: 10, border: '1px solid #D1D5DB', padding: '0 8px', height: 40, flexShrink: 0, opacity: submitted ? 0.6 : 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#4B5563', marginRight: 4 }}>VIP</span>
                        <input
                          type='number'
                          inputMode='numeric'
                          disabled={submitted}
                          value={Number.isFinite(row.vipCount) && row.vipCount > 0 ? row.vipCount : ''}
                          onChange={(e) => patchMember(sunday, groupId, row.key, { vipCount: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
                          style={{ width: 28, background: 'transparent', border: 'none', color: submitted ? '#9CA3AF' : '#111827', fontSize: 15, fontWeight: 900, textAlign: 'center', outline: 'none', padding: 0 }}
                          placeholder="0"
                        />
                      </div>

                      <label style={{ flex: 1, minWidth: 0, height: 40, boxSizing: 'border-box', padding: '4px 10px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: submitted ? 'default' : 'text', opacity: submitted ? 0.6 : 1 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#6B7280', lineHeight: 1 }}>VIP 이름 (띄어쓰기로 복수)</span>
                        <input
                          disabled={submitted}
                          value={row.vipNames || ''}
                          onChange={(e) => {
                            const names = e.target.value;
                            const count = names.split(/\s+/).filter(Boolean).length;
                            patchMember(sunday, groupId, row.key, { vipNames: names, vipCount: count });
                          }}
                          style={{ width: '100%', background: 'transparent', border: 'none', color: submitted ? '#9CA3AF' : '#111827', fontSize: 14, fontWeight: 700, outline: 'none', padding: 0, marginTop: 2 }}
                        />
                      </label>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 900, color: '#374151', fontSize: 13 }}>기도제목</div>
                        {!submitted && <button onClick={() => setPrayerEditKey(prayerEditing ? null : row.key)} style={miniBtn}>변경</button>}
                      </div>

                      {!prayerEditing ? (
                        <div style={{ marginTop: 8, padding: '12px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', color: '#1E293B', fontSize: 14, fontWeight: 700, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {effectivePrayer || <span style={{ color: '#94A3B8' }}>작성된 기도제목이 없습니다.</span>}
                        </div>
                      ) : (
                        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                          <textarea
                            value={prayerDrafts[row.key] ?? effectivePrayer ?? ''}
                            onChange={(e) => setPrayerDrafts((p) => ({ ...(p || {}), [row.key]: e.target.value }))}
                            rows={3}
                            style={textarea}
                            placeholder="기도제목"
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button onClick={() => setPrayerEditKey(null)} style={btn}>닫기</button>
                            <button
                              onClick={async () => {
                                await patchMember(sunday, groupId, row.key, { prayer: prayerDrafts[row.key] });
                                setPrayerEditKey(null);
                              }}
                              style={primaryBtn}
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <Th>이름</Th>
                    <Th>주일</Th>
                    <Th>목장</Th>
                    <Th>수요</Th>
                    <Th>새벽</Th>
                    <Th>러닝</Th>
                    <Th>VIP</Th>
                    <Th>개인 기도제목</Th>
                  </tr>
                </thead>
                <tbody>
                  {mergedRows.map((row) => {
                    const prevPrayer = safeText(latestPrevReport?.members?.[row.key]?.prayer);
                    const curPrayer = safeText(row.prayer);
                    const effectivePrayer = curPrayer || prevPrayer;

                    return (
                      <tr key={row.key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <div style={{ fontWeight: 800, color: '#1D1D1F' }}>{row.name || ''}</div>
                            <div style={{ flexDirection: 'column', display: 'flex' }}>
                              {!row.isPersonalReported && (
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '1px 4px', borderRadius: 4 }}>
                                  보고미완료
                                </span>
                              )}
                              {row.isPersonalReported && (!report?.submittedAt || row.reportedAt <= report.submittedAt) && (
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '1px 4px', borderRadius: 4 }}>
                                  보고완료
                                </span>
                              )}
                              {row.isPersonalReported && report?.submittedAt && row.reportedAt > report.submittedAt && (
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '1px 4px', borderRadius: 4 }}>
                                  수정됨
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>{row.org || ''}</div>
                          </div>
                        </Td>
                        <Td><Chk checked={!!row.sunday} onChange={(v) => patchMember(sunday, groupId, row.key, { sunday: v })} disabled={submitted} /></Td>
                        <Td><Chk checked={!!row.cell} onChange={(v) => hasMeeting && patchMember(sunday, groupId, row.key, { cell: v })} disabled={!hasMeeting || submitted} /></Td>
                        <Td><Chk checked={!!row.wed} onChange={(v) => patchMember(sunday, groupId, row.key, { wed: v })} disabled={submitted} /></Td>
                        <Td><Num value={row.dawnCount} onChange={(n) => patchMember(sunday, groupId, row.key, { dawnCount: n })} placeholder="새벽" max={6} disabled={submitted} /></Td>
                        <Td><Chk checked={!!row.bibleReading} onChange={(v) => patchMember(sunday, groupId, row.key, { bibleReading: v })} disabled={submitted} /></Td>
                        <Td>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <Num value={row.vipCount} onChange={(n) => patchMember(sunday, groupId, row.key, { vipCount: n })} placeholder="0" disabled={submitted} />
                            <input
                              value={row.vipNames || ''}
                              onChange={(e) => {
                                const names = e.target.value;
                                const count = names.split(/\s+/).filter(Boolean).length;
                                patchMember(sunday, groupId, row.key, { vipNames: names, vipCount: count });
                              }}
                              disabled={submitted}
                              placeholder="VIP 이름"
                              style={input}
                            />
                          </div>
                        </Td>
                        <Td>
                          <input
                            value={effectivePrayer}
                            onChange={(e) => patchMember(sunday, groupId, row.key, { prayer: e.target.value })}
                            disabled={submitted}
                            placeholder="기도제목"
                            style={input}
                          />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ ...label, marginBottom: 0 }}>목장 보고사항</label>
          </div>
          <textarea
            value={report?.reportNote ?? latestPrevReport?.reportNote ?? ''}
            onChange={(e) => patchShepherdReport(sunday, groupId, { reportNote: e.target.value })}
            disabled={submitted}
            style={{ ...textarea, opacity: submitted ? 0.6 : 1, cursor: submitted ? 'default' : 'text' }}
            rows={4}
            placeholder='목장 보고사항을 입력해 주세요'
          />

          <div style={{ height: 24 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ ...label, marginBottom: 0 }}>목장 기도제목</label>
          </div>
          <textarea
            value={report?.prayerNote ?? latestPrevReport?.prayerNote ?? ''}
            onChange={(e) => patchShepherdReport(sunday, groupId, { prayerNote: e.target.value })}
            disabled={submitted}
            style={{ ...textarea, opacity: submitted ? 0.6 : 1, cursor: submitted ? 'default' : 'text' }}
            rows={4}
            placeholder='목장 기도제목을 입력해 주세요'
          />

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, width: '100% border-box' }}>
            <button
              onClick={handleToggleSubmit}
              style={submitted ? { ...btn, background: '#1D1D1F', color: '#FFFFFF', padding: '16px 24px', fontSize: 18, width: '100%', borderRadius: 16 } : { ...primaryBtn, padding: '16px 24px', fontSize: 18, width: '100%', borderRadius: 16 }}
            >
              {submitted ? '수정하기' : '교회에 보고하기'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#86868B', marginTop: 4, lineHeight: 1.5, fontWeight: 700 }}>
              {submitted ? (
                <>보고가 완료되었습니다.<br />수정하려면 <b>[수정하기]</b> 버튼을 눌러주세요.</>
              ) : (
                <><b>[교회에 보고하기]</b>를 눌러야 최종 반영됩니다.</>
              )}
            </p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ ...btn, width: '100%', padding: '14px', fontSize: 15, borderRadius: 16, border: '1px solid #D1D5DB' }}>
              ↑ 상단으로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function patchMember(sunday, groupId, memberKey, patch) {
  return updateShepherdMember(sunday, groupId, memberKey, patch).catch(console.error);
}

function Stat({ label, value, disabled }) {
  return (
    <div style={{ ...statBox, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ color: '#86868B', fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: '#1D1D1F' }}>{value}</div>
    </div>
  );
}

function Chk({ checked, onChange, disabled }) {
  return (
    <input
      type='checkbox'
      checked={!!checked}
      onChange={(e) => !disabled && onChange?.(e.target.checked)}
      disabled={disabled}
      style={{ width: 18, height: 18, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    />
  );
}

function Num({ value, onChange, placeholder, small, max, disabled }) {
  return (
    <input
      type='number'
      inputMode='numeric'
      disabled={disabled}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const val = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
        const limited = max !== undefined ? Math.min(max, val) : val;
        onChange?.(limited);
      }}
      placeholder={placeholder}
      style={{ ...(small ? tinyNumInput : numInput), opacity: disabled ? 0.6 : 1 }}
      min={0}
      max={max}
    />
  );
}

function Th({ children }) {
  return <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #9CA3AF', fontSize: 13, color: '#374151' }}>{children}</th>;
}

function Td({ children, style }) {
  return <td style={{ padding: '10px 8px', borderBottom: '1px solid #F7FAFC', verticalAlign: 'top', ...(style || {}) }}>{children}</td>;
}

function CheckBadge({ label, checked, onChange, color, textColor, disabled }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px 0',
        borderRadius: 10,
        background: disabled ? '#E0E0E0' : (checked ? color : '#F5F7FA'),
        border: disabled ? '1px solid #D1D5DB' : (checked ? `1px solid ${color}` : '1px solid #D1D5DB'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.3 : 1,
        filter: disabled ? 'grayscale(100%)' : 'none',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: checked ? `5px solid ${textColor}` : '2px solid #9CA3AF',
        background: '#fff',
        boxSizing: 'border-box'
      }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: checked ? textColor : '#4B5563' }}>{label}</span>
    </div>
  );
}

const memberCard = {
  padding: '24px 20px',
  borderRadius: 20,
  background: '#FFFFFF',
  border: 'none',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const pageWrap = { padding: '30px 20px', maxWidth: 980, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh' };

const topRow = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  marginBottom: 24,
};

const arrowBtn = {
  padding: '8px 14px',
  borderRadius: 14,
  border: 'none',
  background: '#E5E5EA',
  color: '#1D1D1F',
  fontWeight: 800,
  cursor: 'pointer'
};

const miniBtn = {
  padding: '6px 12px',
  borderRadius: 12,
  border: 'none',
  background: '#F0F9FF',
  color: '#0071E3',
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer'
};

const box = {
  padding: '24px 20px',
  borderRadius: 20,
  border: 'none',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  background: '#FFFFFF',
};

const statBox = {
  padding: '12px 16px',
  borderRadius: 16,
  border: 'none',
  background: '#F5F5F7'
};

const btn = {
  padding: '14px 20px',
  borderRadius: 16,
  border: 'none',
  background: '#FFFFFF',
  color: '#1D1D1F',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const primaryBtn = { ...btn, background: '#0071E3', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)' };

const input = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 16,
  border: 'none',
  background: '#F5F5F7',
  color: '#1D1D1F',
  outline: 'none',
  fontSize: 15,
};

const numInput = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 16,
  border: 'none',
  background: '#F5F5F7',
  color: '#1D1D1F',
  outline: 'none',
  fontSize: 15,
};

const tinyNumInput = {
  width: 44,
  padding: '6px 8px',
  borderRadius: 12,
  border: 'none',
  background: '#E5E5EA',
  color: '#1D1D1F',
  outline: 'none',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 800
};

const textarea = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 16,
  border: 'none',
  background: '#F5F5F7',
  color: '#1D1D1F',
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  fontSize: 15,
  lineHeight: 1.5,
};

const label = { display: 'block', fontWeight: 900, marginBottom: 6, color: '#111827' };
const subLine = { display: 'flex', gap: 10, alignItems: 'flex-start' };
const subLabel = { minWidth: 140, fontWeight: 900, color: '#374151' };
const subValue = { color: '#111827', lineHeight: 1.5, fontWeight: 700 };

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { subscribeToShepherdGroups, subscribeToShepherdReport, subscribeToShepherdNotice } from '../shepherdSync.js';
import { getSundayOfWeek, shiftSunday, getWeekLabel, formatDateKorean, normalizeLeaders } from '../utils.js';

export default function ShepherdList({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSunday = searchParams.get('sunday') || getSundayOfWeek(new Date());
  const [sunday, setSunday] = useState(initialSunday);
  const [groups, setGroups] = useState({});
  const [adminOk, setAdminOk] = useState(() => sessionStorage.getItem('shepherd_admin_ok') === '1');
  const DEFAULT_NOTICE = '목자는 본인 목장만 작성/열람 가능합니다.\n(관리자 모드에서는 전체 열람/수정 가능)';
  const [noticeText, setNoticeText] = useState('');

  useEffect(() => setAdminOk(sessionStorage.getItem('shepherd_admin_ok') === '1'), []);
  useEffect(() => setSearchParams({ sunday }, { replace: true }), [sunday, setSearchParams]);

  useEffect(() => {
    const unsub = subscribeToShepherdGroups((val) => setGroups(val || {}));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsub = subscribeToShepherdNotice((val) => {
      const txt = (val?.text ?? '').toString();
      setNoticeText(txt || DEFAULT_NOTICE);
    });
    return () => unsub?.();
  }, []);

  const myUid = user?.uid;

  const groupList = useMemo(() => {
    const all = Object.entries(groups || {}).map(([id, g]) => ({ id, ...(g || {}) }));
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return all; // 1페이지는 누구나 전체 목장 목록/상태를 볼 수 있음
  }, [groups]);

  const [reportStatus, setReportStatus] = useState({});

  useEffect(() => {
    const unsubs = [];
    const next = {};
    setReportStatus({});

    groupList.forEach((g) => {
      const unsub = subscribeToShepherdReport(sunday, g.id, (report) => {
        const submittedAt = report?.submittedAt || null;
        setReportStatus((prev) => ({
          ...prev,
          [g.id]: { exists: !!report, submittedAt, updatedAt: report?.updatedAt || null }
        }));
      });
      unsubs.push(unsub);
      next[g.id] = { exists: false, submittedAt: null, updatedAt: null };
    });

    setReportStatus(next);
    return () => unsubs.forEach((u) => u && u());
  }, [groupList, sunday]);

  return (
    <div style={page}>
      <div style={{ padding: '30px 20px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: '#1D1D1F', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>주일 목장 보고서</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setSunday(shiftSunday(sunday, -1))} style={arrowBtn}>◀</button>
            <div style={{ fontWeight: 800, color: '#1D1D1F', fontSize: 16 }}>{getWeekLabel(sunday)}</div>
            <button onClick={() => setSunday(shiftSunday(sunday, 1))} style={arrowBtn}>▶</button>
          </div>
        </div>

        {noticeText ? (
          <div style={noticeBox}>
            <div style={{ fontWeight: 800, marginBottom: 4, color: '#0071E3', fontSize: 13 }}>📢 공지사항</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#1D1D1F', fontSize: 15, lineHeight: 1.5 }}>{noticeText}</div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {groupList.length === 0 ? (
            <div style={emptyBox}>
              등록된 목장이 없거나, 내 계정({user?.uid})에 연결된 목장이 없습니다.
              <div style={{ marginTop: 8 }}>
                관리자는 <b>관리</b> 페이지에서 &lt;목장구성&gt;을 먼저 등록해 주세요.
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => navigate('/shepherd/admin')} style={primaryBtn}>관리 페이지</button>
                {adminOk && (
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('shepherd_admin_ok');
                      setAdminOk(false);
                    }}
                    style={{ ...ghostBtn, marginLeft: 8 }}
                  >
                    관리자 모드 해제
                  </button>
                )}
              </div>
            </div>
          ) : (
            groupList.map((g) => {
              const st = reportStatus[g.id] || {};
              const done = !!st.submittedAt;
              const leaders = normalizeLeaders(g.leaders);
              const isLeader = !!myUid && leaders.includes(myUid);
              const canOpen = adminOk || isLeader;
              return (
                <button
                  key={g.id}
                  onClick={() => navigate(`/shepherd/write?sunday=${encodeURIComponent(sunday)}&groupId=${encodeURIComponent(g.id)}`)}
                  style={{ ...cardBtn, opacity: canOpen ? 1 : 0.55 }}
                  disabled={!canOpen}
                >
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.3px' }}>{g.name || '(이름없음)'}</div>
                      <div style={{ marginTop: 6, color: '#86868B', fontSize: 13, fontWeight: 600 }}>
                        목자: {leaders.join(', ') || '-'}
                      </div>
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: 14,
                        background: done ? '#F0FDF4' : '#FEF2F2',
                        color: done ? '#16A34A' : '#DC2626',
                        fontSize: 13,
                        fontWeight: 800
                      }}>
                        {done ? '✔ 보고완료' : '✖ 미작성'}
                      </div>
                      <div style={{ marginTop: 8, color: '#A1A1AA', fontSize: 12, fontWeight: 600 }}>
                        {st.updatedAt ? `${formatDateKorean(new Date(st.updatedAt).toISOString().slice(0, 10))}` : '제출 기록 없음'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/shepherd/admin')} style={secondaryBtn}>관리</button>
        </div>
      </div>

    </div>
  );
}

const page = {
  minHeight: '100vh',
  background: '#F5F5F7'
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

const cardBtn = {
  width: '100%',
  padding: '20px',
  borderRadius: 20,
  border: 'none',
  background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  cursor: 'pointer',
  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
  textAlign: 'left'
};

const emptyBox = {
  padding: '24px',
  borderRadius: 20,
  border: 'none',
  background: '#FFFFFF',
  lineHeight: 1.6,
  color: '#1D1D1F',
  fontWeight: 600,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const noticeBox = {
  marginBottom: 20,
  padding: '16px 20px',
  borderRadius: 16,
  border: 'none',
  background: '#FFFFFF',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  borderLeft: '4px solid #0071E3'
};

const primaryBtn = {
  padding: '12px 20px',
  borderRadius: 14,
  border: 'none',
  background: '#0071E3',
  color: '#FFFFFF',
  fontWeight: 800,
  cursor: 'pointer'
};

const secondaryBtn = {
  padding: '12px 20px',
  borderRadius: 14,
  border: 'none',
  background: '#E5E5EA',
  color: '#0071E3',
  fontWeight: 800,
  cursor: 'pointer'
};

const ghostBtn = {
  padding: '12px 20px',
  borderRadius: 14,
  border: 'none',
  background: '#F3F4F6',
  color: '#1D1D1F',
  fontWeight: 800,
  cursor: 'pointer'
};


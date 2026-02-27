import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { verifyAdminPassword } from '../../../firebaseSync.js';
import { subscribeToShepherdGroups, createShepherdGroup, updateShepherdGroup, deleteShepherdGroup, subscribeToShepherdNotice, setShepherdNotice, subscribeToMainNotice, setMainNotice, subscribeToPrayerScent, applyPrayerScent, cancelPrayerScent } from '../shepherdSync.js';
import { getSundayOfWeek, shiftSunday, getWeekLabel, normalizeMembers, safeText, normalizeLeaders } from '../utils.js';
import ShepherdSettlement from './ShepherdSettlement.jsx';

export default function ShepherdAdmin({ user }) {
  const navigate = useNavigate();
  const [adminOk, setAdminOk] = useState(() => sessionStorage.getItem('shepherd_admin_ok') === '1');
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [view, setView] = useState('groups'); // groups|summary|prayers|notice|mainNotice|settlement

  useEffect(() => {
    setAdminOk(sessionStorage.getItem('shepherd_admin_ok') === '1');
  }, []);

  if (!user || !user.uid) return <Navigate to='/login' replace />;

  async function handleVerify() {
    setPwdError('');
    try {
      const res = await verifyAdminPassword(pwd);
      if (res?.ok) {
        sessionStorage.setItem('shepherd_admin_ok', '1');
        setAdminOk(true);
        setPwd('');
      } else {
        setPwdError('비밀번호가 올바르지 않습니다.');
      }
    } catch (e) {
      setPwdError(e?.message || '인증 실패');
    }
  }

  function logoutAdmin() {
    sessionStorage.removeItem('shepherd_admin_ok');
    setAdminOk(false);
    setView('groups');
  }

  if (!adminOk) {
    return (
      <div style={{ padding: '60px 40px', maxWidth: 460, margin: '60px auto', background: '#FFFFFF', borderRadius: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#1D1D1F' }}>관리자 인증</h2>
        <div style={{ color: '#86868B', fontSize: 13, lineHeight: 1.5, marginBottom: 24, fontWeight: 500 }}>
          관리자 비밀번호로 접속합니다.<br />(성경러닝크루 관리자 pwd와 동일)
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <input
            type='password'
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder='관리자 비밀번호'
            style={input}
          />
          <button onClick={handleVerify} style={primaryBtn}>확인</button>
          {pwdError ? <div style={{ color: '#FF3B30', fontWeight: 800, fontSize: 13, textAlign: 'center' }}>{pwdError}</div> : null}
          <button onClick={() => navigate('/shepherd/list')} style={btn}>목록으로</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px 20px', maxWidth: 1100, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>목자보고서 관리자</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/shepherd/list')} style={btn}>목록</button>
          <button onClick={logoutAdmin} style={btn}>관리자 로그아웃</button>
        </div>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#E5E5EA', padding: 4, borderRadius: 16 }}>
          <button onClick={() => setView('groups')} style={tabBtn(view === 'groups')}>목장구성</button>
          <button onClick={() => setView('summary')} style={tabBtn(view === 'summary')}>주일결산</button>
          <button onClick={() => setView('settlement')} style={tabBtn(view === 'settlement')}>목장·개인결산</button>
          <button onClick={() => setView('prayers')} style={tabBtn(view === 'prayers')}>보고/기도제목</button>
          <button onClick={() => setView('prayerScent')} style={tabBtn(view === 'prayerScent')}>기도의 향</button>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#D1E9FF', padding: 4, borderRadius: 16 }}>
          <button onClick={() => setView('notice')} style={tabBtnBlue(view === 'notice')}>공지(목자보고서)</button>
          <button onClick={() => setView('mainNotice')} style={tabBtnBlue(view === 'mainNotice')}>공지(앱메인)</button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {view === 'groups' ? <GroupsView /> : null}
        {view === 'summary' ? <SundaySummaryView /> : null}
        {view === 'settlement' ? <ShepherdSettlement user={user} /> : null}
        {view === 'prayers' ? <PrayersView /> : null}
        {view === 'prayerScent' ? <PrayerScentAdminView /> : null}
        {view === 'notice' ? <NoticeView /> : null}
        {view === 'mainNotice' ? <MainNoticeView /> : null}
      </div>
    </div>
  );
}

function GroupsView() {
  const [groups, setGroups] = useState({});
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const unsub = subscribeToShepherdGroups((val) => setGroups(val || {}));
    return () => unsub?.();
  }, []);

  const list = useMemo(() => {
    const all = Object.entries(groups || {}).map(([id, g]) => ({ id, ...(g || {}) }));
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return all;
  }, [groups]);

  const selected = selectedId ? ({ id: selectedId, ...(groups[selectedId] || {}) }) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12 }}>
      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 900 }}>목장 목록</div>
          <CreateGroupInline onCreated={(id) => setSelectedId(id)} />
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {list.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedId(g.id)}
              style={{ ...listBtn, ...(selectedId === g.id ? listBtnActive : {}) }}
            >
              {g.name || '(이름없음)'}
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>목자: {normalizeLeaders(g.leaders).join(', ') || '-'}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={box}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>목장 구성 편집</div>
        {selected ? (
          <GroupEditor groupId={selected.id} group={selected} />
        ) : (
          <div style={{ opacity: 0.8 }}>왼쪽에서 목장을 선택하세요.</div>
        )}
      </div>
    </div>
  );
}

function CreateGroupInline({ onCreated }) {
  const [name, setName] = useState('');
  const [leaders, setLeaders] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function create() {
    setErr('');
    const n = name.trim();
    if (!n) {
      setErr('목장 이름을 입력해 주세요.');
      return;
    }
    const leaderArr = leaders.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    try {
      setBusy(true);
      const res = await createShepherdGroup({
        name: n,
        leaders: leaderArr,
        members: {},
      });
      setName('');
      setLeaders('');
      onCreated?.(res?.id);
    } catch (e) {
      setErr(e?.message || '생성 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder='목장 이름' style={{ ...miniInput, width: 120 }} />
      <input value={leaders} onChange={(e) => setLeaders(e.target.value)} placeholder='목자 이름(복수가능, 띄어쓰기)' style={{ ...miniInput, width: 200 }} />
      <button onClick={create} disabled={busy} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }}>추가</button>
      {err ? <div style={{ color: '#DC2626', fontWeight: 800, fontSize: 12 }}>{err}</div> : null}
    </div>
  );
}

function formatBirthdate(val) {
  if (!val) return '';
  // 숫자만 추출
  let digits = val.replace(/[^0-9]/g, '');

  // 6자리(YYMMDD) 또는 8자리(YYYYMMDD) 처리
  if (digits.length === 8) {
    // YYYYMMDD -> YY-MM-DD
    return `${digits.slice(2, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  } else if (digits.length === 6) {
    // YYMMDD -> YY-MM-DD
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
  }

  // 이미 YY-MM-DD 형식인 경우나 YYYY-MM-DD 형식인 경우 처리
  const parts = val.split('-');
  if (parts.length === 3) {
    let [y, m, d] = parts;
    if (y.length === 4) y = y.slice(2);
    return `${y.padStart(2, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return val;
}

function GroupEditor({ groupId, group }) {
  const [name, setName] = useState(group?.name || '');
  const [leaders, setLeaders] = useState(normalizeLeaders(group?.leaders).join(' '));
  const [members, setMembers] = useState(() => normalizeMembers(group?.members || {}).map((m) => ({
    key: m.key,
    name: m.name || '',
    birthday: m.birthday || '',
    org: m.org || '',
  })));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setName(group?.name || '');
    setLeaders(normalizeLeaders(group?.leaders).join(' '));
    setMembers(normalizeMembers(group?.members || {}).map((m) => ({
      key: m.key,
      name: m.name || '',
      birthday: m.birthday || '',
      org: m.org || '',
    })));
  }, [groupId, group]);

  function addMemberRow() {
    setMembers((prev) => [...prev, { key: `m_${Date.now()}_${Math.random().toString(16).slice(2)}`, name: '', birthday: '', org: '' }]);
  }

  function removeMemberRow(key) {
    setMembers((prev) => prev.filter((m) => m.key !== key));
  }

  async function save() {
    setMsg('');
    setErr('');
    try {
      const leaderArr = leaders.split(/\s+/).map((s) => s.trim()).filter(Boolean);
      const membersObj = {};
      members.forEach((m) => {
        const nm = (m.name || '').trim();
        if (!nm) return;
        membersObj[m.key] = {
          name: nm,
          birthday: (m.birthday || '').trim(),
          org: (m.org || '').trim(),
        };
      });
      await updateShepherdGroup(groupId, {
        name: name.trim(),
        leaders: leaderArr,
        members: membersObj,
      });
      setMsg('저장되었습니다.');
    } catch (e) {
      setErr(e?.message || '저장 실패');
    }
  }

  async function removeGroup() {
    if (!confirm('이 목장을 삭제할까요? (구성만 삭제, 과거 보고서 데이터는 남을 수 있습니다)')) return;
    try {
      await deleteShepherdGroup(groupId);
      setMsg('삭제되었습니다.');
    } catch (e) {
      setErr(e?.message || '삭제 실패');
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={label}>목장 이름</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
        </div>
        <div>
          <div style={label}>목자 이름(복수 가능, 쉼표)</div>
          <input value={leaders} onChange={(e) => setLeaders(e.target.value)} style={input} placeholder='예) 홍길동, 김철수' />
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontWeight: 900 }}>목원</div>
        <button onClick={addMemberRow} style={btn}>목원 추가</button>
      </div>

      <div style={{ marginTop: 10, overflowX: 'auto' }}>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>이름</th>
              <th style={th}>생일</th>
              <th style={th}>기관</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.key}>
                <td style={td}>
                  <input
                    value={safeText(m.name)}
                    onChange={(e) => setMembers((prev) => prev.map((x) => x.key === m.key ? { ...x, name: e.target.value } : x))}
                    style={miniInput}
                  />
                </td>
                <td style={td}>
                  <input
                    value={safeText(m.birthday)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMembers((prev) => prev.map((x) => x.key === m.key ? { ...x, birthday: val } : x));
                    }}
                    onBlur={(e) => {
                      const formatted = formatBirthdate(e.target.value);
                      setMembers((prev) => prev.map((x) => x.key === m.key ? { ...x, birthday: formatted } : x));
                    }}
                    style={miniInput}
                    placeholder='YY-MM-DD'
                  />
                </td>
                <td style={td}><input value={safeText(m.org)} onChange={(e) => setMembers((prev) => prev.map((x) => x.key === m.key ? { ...x, org: e.target.value } : x))} style={miniInput} /></td>
                <td style={td}><button onClick={() => removeMemberRow(m.key)} style={miniBtn}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button onClick={save} style={primaryBtn}>저장</button>
        <button onClick={removeGroup} style={dangerBtn}>목장 삭제</button>
      </div>

      {msg ? <div style={{ marginTop: 10, fontWeight: 900 }}>{msg}</div> : null}
      {err ? <div style={{ marginTop: 10, color: '#DC2626', fontWeight: 900 }}>{err}</div> : null}
    </div>
  );
}

function SundaySummaryView() {
  const [sunday, setSunday] = useState(getSundayOfWeek(new Date()));
  const [groups, setGroups] = useState({});
  const [reports, setReports] = useState({});

  useEffect(() => {
    const unsub = subscribeToShepherdGroups((val) => setGroups(val || {}));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const db2 = getDatabase();
    const r = ref(db2, `shepherd/reports/${sunday}`);
    const unsub = onValue(r, (snap) => setReports(snap.val() || {}));
    return () => unsub?.();
  }, [sunday]);

  const list = useMemo(() => {
    const all = Object.entries(groups || {}).map(([id, g]) => ({ id, ...(g || {}) }));
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return all;
  }, [groups]);

  const tableRows = useMemo(() => {
    return list.map((g) => {
      const r = reports[g.id] || null;
      const meta = r?.meta || {};
      const vipNames = meta.vipNames || [];
      const absentees = meta.absentees || [];

      return {
        groupName: g.name || '(이름없음)',
        totalMembers: parseInt(meta.totalMembers || 0, 10) || 0,
        sundayAttendance: parseInt(meta.sundayAttendance || 0, 10) || 0,
        dawnTotal: parseInt(meta.dawnTotal || 0, 10) || 0,
        wedAttendance: parseInt(meta.wedAttendance || 0, 10) || 0,
        cellAttendance: parseInt(meta.cellAttendance || 0, 10) || 0,
        bibleReadingAttendance: parseInt(meta.bibleReadingAttendance || 0, 10) || 0,
        vipCount: parseInt(meta.vipCount || 0, 10) || 0,
        vipNames: Array.isArray(vipNames) ? vipNames : [],
        vipList: r?.vipList || '',
        absentees: Array.isArray(absentees) ? absentees : [],
        hasMeeting: r?.hasMeeting !== false, // Default to true
      };
    }).map(row => {
      // 모임이 없는 경우, 목장 합계(cellAttendance)를 0으로 실시간 보정
      if (!row.hasMeeting) {
        return { ...row, cellAttendance: 0 };
      }
      return row;
    });
  }, [list, reports]);

  const totals = useMemo(() => {
    return tableRows.reduce(
      (acc, r) => {
        acc.totalMembers += r.totalMembers;
        acc.sundayAttendance += r.sundayAttendance;
        acc.dawnTotal += r.dawnTotal;
        acc.wedAttendance += r.wedAttendance;
        acc.cellAttendance += r.cellAttendance;
        acc.bibleReadingAttendance += r.bibleReadingAttendance;
        acc.vipCount += r.vipCount;
        return acc;
      },
      { totalMembers: 0, sundayAttendance: 0, dawnTotal: 0, wedAttendance: 0, cellAttendance: 0, bibleReadingAttendance: 0, vipCount: 0 }
    );
  }, [tableRows]);

  const [msg, setMsg] = useState('');

  // Mass update function
  async function setAllMeetingStatus(hasMeeting) {
    // 요청사항: 확인창 없이 즉시 설정
    // if (!confirm(`현재 주일(${getWeekLabel(sunday)})의 모든 목장 모임을 '${hasMeeting ? '있음' : '없음'}'으로 설정하시겠습니까?`)) return;

    const updates = {};
    list.forEach(g => {
      updates[`shepherd/reports/${sunday}/${g.id}/hasMeeting`] = hasMeeting;
    });

    try {
      const db2 = getDatabase();
      await update(ref(db2), updates);
      setMsg('설정되었습니다.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
      alert('오류가 발생했습니다: ' + e.message);
    }
  }

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ fontWeight: 800, color: '#1D1D1F', fontSize: 18 }}>주일결산(표)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setSunday(shiftSunday(sunday, -1))} style={btn} className="no-print">◀</button>
          <div style={{ fontWeight: 800, color: '#1D1D1F', fontSize: 16 }}>{getWeekLabel(sunday)}</div>
          <button onClick={() => setSunday(shiftSunday(sunday, 1))} style={btn} className="no-print">▶</button>
          <button
            onClick={() => window.print()}
            style={{ ...primaryBtn, background: '#34C759', color: '#fff', boxShadow: '0 4px 12px rgba(52, 199, 89, 0.25)', marginLeft: 8 }}
            className="no-print"
          >
            🖨️ 문서 출력
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
          }
          table { width: 100% !important; border: 1px solid #000 !important; }
          th, td { border: 1px solid #000 !important; padding: 4px !important; font-size: 10px !important; }
        }
      `}</style>

      <div style={{
        marginTop: 12, padding: '16px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        ...(tableRows.every(r => r.hasMeeting) ? { background: '#ECFDF5' } :
          tableRows.every(r => !r.hasMeeting) ? { background: '#FFF5F5' } :
            { background: '#F5F5F7' })
      }} className="no-print">
        <div style={{ fontSize: 14, fontWeight: 700, color: tableRows.every(r => r.hasMeeting) ? '#065F46' : '#1D1D1F' }}>
          일괄 설정: {tableRows.every(r => r.hasMeeting) ? '모든 목장 모임 있음' : (tableRows.every(r => !r.hasMeeting) ? '모든 목장 모임 없음' : '이번 주 모든 목장의 모임 유무를 설정합니다.')}
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#E5E5EA', padding: 4, borderRadius: 12 }}>
          <button
            onClick={() => setAllMeetingStatus(true)}
            style={tabBtn(tableRows.every(r => r.hasMeeting))}
          >
            목장 모임 있음
          </button>
          <button
            onClick={() => setAllMeetingStatus(false)}
            style={{ ...tabBtn(!tableRows.every(r => r.hasMeeting) && tableRows.every(r => !r.hasMeeting)), color: (!tableRows.every(r => r.hasMeeting) && tableRows.every(r => !r.hasMeeting)) ? '#FF3B30' : '#86868B' }}
          >
            목장 모임 없음
          </button>
        </div>
      </div>
      {msg && <div style={{ marginTop: 12, textAlign: 'center', fontWeight: 800, color: '#34C759', background: '#ECFDF5', padding: '10px 16px', borderRadius: 12, fontSize: 14 }} className="no-print">{msg}</div>}

      <div style={{ marginTop: 16, overflowX: 'auto' }} className="printable-area">
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 980, borderRadius: 20, overflow: 'hidden', background: '#FFFFFF' }}>
          <thead>
            <tr>
              <th style={th}>목장</th>
              <th style={th}>재적</th>
              <th style={th}>주일예배</th>
              <th style={th}>새벽합계</th>
              <th style={th}>수요합계</th>
              <th style={th}>목장합계</th>
              <th style={th}>성경러닝</th>
              <th style={th}>VIP합계</th>
              <th style={th}>VIP명단</th>
              <th style={th}>예비목원</th>
              <th style={th}>주일결석자</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r, idx) => (
              <tr key={idx} style={idx % 2 === 0 ? {} : { background: '#F5F5F7' }}>
                <td style={{ ...td, fontWeight: 700, color: '#1D1D1F' }}>
                  {r.groupName}
                  {r.hasMeeting === false && <span style={{ marginLeft: 6, fontSize: 11, color: '#FF3B30', background: '#FFF5F5', padding: '4px 8px', borderRadius: 12, fontWeight: 800 }}>모임없음</span>}
                </td>
                <td style={td}>{r.totalMembers}</td>
                <td style={td}>{r.sundayAttendance}</td>
                <td style={td}>{r.dawnTotal}</td>
                <td style={td}>{r.wedAttendance}</td>
                <td style={{ ...td, color: r.hasMeeting === false ? '#FF3B30' : 'inherit', opacity: r.hasMeeting === false ? 0.6 : 1 }}>
                  {r.hasMeeting === false ? '-' : r.cellAttendance}
                </td>
                <td style={td}>{r.bibleReadingAttendance}</td>
                <td style={td}>{r.vipCount}</td>
                <td style={{ ...td, whiteSpace: 'pre-wrap' }}>{r.vipNames.length ? r.vipNames.join(', ') : ''}</td>
                <td style={{ ...td, whiteSpace: 'pre-wrap', fontSize: 12 }}>{r.vipList || ''}</td>
                <td style={{ ...td, whiteSpace: 'pre-wrap' }}>{r.absentees.length ? r.absentees.join(', ') : ''}</td>
              </tr>
            ))}

            <tr style={{ background: '#F0F9FF' }}>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>합계</td>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>{totals.totalMembers}</td>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>{totals.sundayAttendance}</td>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>{totals.dawnTotal}</td>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>{totals.wedAttendance}</td>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>{totals.cellAttendance}</td>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>{totals.bibleReadingAttendance}</td>
              <td style={{ ...td, fontWeight: 800, color: '#0071E3' }}>{totals.vipCount}</td>
              <td style={td}></td>
              <td style={td}></td>
              <td style={td}></td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div >
  );
}


function PrayersView() {
  const [sunday, setSunday] = useState(getSundayOfWeek(new Date()));
  const [groups, setGroups] = useState({});
  const [reports, setReports] = useState({});

  useEffect(() => {
    const unsub = subscribeToShepherdGroups((val) => setGroups(val || {}));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const db2 = getDatabase();
    const r = ref(db2, `shepherd/reports/${sunday}`);
    const unsub = onValue(r, (snap) => setReports(snap.val() || {}));
    return () => unsub?.();
  }, [sunday]);

  const list = useMemo(() => {
    const all = Object.entries(groups || {}).map(([id, g]) => ({ id, ...(g || {}) }));
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return all;
  }, [groups]);

  const groupCards = useMemo(() => {
    const out = [];
    list.forEach((g) => {
      const r = reports[g.id] || null;
      if (!r) return;

      const card = {
        id: g.id,
        groupName: g.name,
        reportNote: safeText(r.reportNote).trim(),
        prayerNote: safeText(r.prayerNote).trim(),
        memberPrayers: []
      };

      const members = r.members || {};
      // Sort members by name if needed, but keeping current approach
      Object.values(members).forEach((m) => {
        const t = safeText(m?.prayer).trim();
        if (t) card.memberPrayers.push({ name: m?.name || '목원', text: t });
      });

      if (card.reportNote || card.prayerNote || card.memberPrayers.length > 0) {
        out.push(card);
      }
    });
    return out;
  }, [list, reports]);

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900 }}>보고 및 기도제목 모아보기</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setSunday(shiftSunday(sunday, -1))} style={btn}>◀</button>
          <div style={{ fontWeight: 900 }}>{getWeekLabel(sunday)}</div>
          <button onClick={() => setSunday(shiftSunday(sunday, 1))} style={btn}>▶</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 16 }}>
        {groupCards.length === 0 ? (
          <div style={{ opacity: 0.8 }}>등록된 보고 및 기도제목이 없습니다.</div>
        ) : (
          groupCards.map((card) => (
            <div key={card.id} style={{ ...subBox, borderLeft: '4px solid #0071E3', padding: '16px 20px' }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#1D1D1F', marginBottom: 12, borderBottom: '1px solid #F2F2F7', paddingBottom: 8 }}>
                {card.groupName} 목장
              </div>

              {card.reportNote && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: '#2563EB', fontSize: 13, marginBottom: 4 }}>[보고사항]</div>
                  <div style={{ opacity: 0.85, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14 }}>{card.reportNote}</div>
                </div>
              )}

              {card.prayerNote && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: '#10B981', fontSize: 13, marginBottom: 4 }}>[목장기도제목]</div>
                  <div style={{ opacity: 0.85, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14 }}>{card.prayerNote}</div>
                </div>
              )}

              {card.memberPrayers.length > 0 && (
                <div>
                  <div style={{ fontWeight: 800, color: '#4B5563', fontSize: 13, marginBottom: 4 }}>[목원기도제목]</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {card.memberPrayers.map((m, idx) => (
                      <div key={idx} style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 800, color: '#1D1D1F' }}>{m.name}:</span> <span style={{ opacity: 0.85 }}>{m.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


function NoticeView() {
  const [notice, setNotice] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const unsub = subscribeToShepherdNotice((val) => {
      const text = (val?.text ?? '').toString();
      setNotice(text);
    });
    return () => unsub?.();
  }, []);

  async function save() {
    setMsg('');
    setErr('');
    try {
      await setShepherdNotice(notice, sessionStorage.getItem('login_name') || 'admin');
      setMsg('저장되었습니다.');
      setTimeout(() => setMsg(''), 1500);
    } catch (e) {
      setErr(e?.message || '저장 실패');
    }
  }

  return (
    <div style={box}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>목자보고서 공지</div>
      <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.6 }}>
        목자보고서 1페이지 상단에 표시될 공지 문구를 관리합니다.
      </div>

      <textarea
        value={notice}
        onChange={(e) => setNotice(e.target.value)}
        placeholder='공지 문구를 입력해 주세요.'
        style={{ ...input, minHeight: 120, resize: 'vertical' }}
      />

      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={save} style={primaryBtn}>저장</button>
      </div>

      {msg ? <div style={{ marginTop: 10, fontWeight: 900, color: '#166534' }}>{msg}</div> : null}
      {err ? <div style={{ marginTop: 10, color: '#DC2626', fontWeight: 900 }}>{err}</div> : null}
    </div>
  );
}


function MainNoticeView() {
  const [notice, setNotice] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const unsub = subscribeToMainNotice((val) => {
      const text = (val?.text ?? '').toString();
      setNotice(text);
    });
    return () => unsub?.();
  }, []);

  async function save() {
    setMsg('');
    setErr('');
    try {
      await setMainNotice(notice, sessionStorage.getItem('login_name') || 'admin');
      setMsg('저장되었습니다.');
      setTimeout(() => setMsg(''), 1500);
    } catch (e) {
      setErr(e?.message || '저장 실패');
    }
  }

  return (
    <div style={box}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>앱 메인화면 공지</div>
      <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.6 }}>
        앱 로그인 후 표시되는 첫 화면(앱 선택 화면) 상단의 공지 배너 문구를 관리합니다.
      </div>

      <textarea
        value={notice}
        onChange={(e) => setNotice(e.target.value)}
        placeholder='앱 메인화면에 표시될 공지 문구를 입력해 주세요.'
        style={{ ...input, minHeight: 120, resize: 'vertical' }}
      />

      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={save} style={{ ...primaryBtn, background: '#4F46E5', borderColor: '#4338CA' }}>저장</button>
      </div>

      {msg ? <div style={{ marginTop: 10, fontWeight: 900, color: '#166534' }}>{msg}</div> : null}
      {err ? <div style={{ marginTop: 10, color: '#DC2626', fontWeight: 900 }}>{err}</div> : null}
    </div>
  );
}

function PrayerScentAdminView() {
  const [ym, setYm] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [data, setData] = useState({});
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetToRemove, setTargetToRemove] = useState(null);

  useEffect(() => {
    const unsub = subscribeToPrayerScent(ym, setData);
    return () => unsub?.();
  }, [ym]);

  const [y, m] = ym.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dateRows = [];
  for (let i = 1; i <= daysInMonth; i++) {
    dateRows.push(`${ym}-${String(i).padStart(2, '0')}`);
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return alert('이름을 입력하세요.');
    if (!newDate.startsWith(ym)) return alert('선택한 월에 해당하는 날짜를 입력하세요.');

    // 사무실 신청자는 'office-' 접두어를 사용한 UID 생성
    const officeUid = `office_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    try {
      await applyPrayerScent(newDate, officeUid, name);
      setNewName('');
    } catch (e) {
      alert('추가 실패: ' + e.message);
    }
  }

  async function confirmRemove() {
    if (!targetToRemove) return;
    try {
      await cancelPrayerScent(targetToRemove.date, targetToRemove.uid);
      setTargetToRemove(null);
    } catch (e) {
      alert('취소 실패: ' + e.message);
    }
  }

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900 }}>기도의 향 신청 현황 관리</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="no-print">
          <input
            type="month"
            value={ym}
            onChange={(e) => setYm(e.target.value)}
            style={{ ...miniInput, padding: '8px' }}
          />
          <button
            onClick={() => window.print()}
            style={{ ...btn, background: '#10B981', color: '#fff', border: 'none' }}
          >
            🖨️ 문서 출력
          </button>
        </div>
      </div>

      <div style={{
        marginTop: 16, padding: 16, background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB'
      }} className="no-print">
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🏢 사무실 직접 신청 기입</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={miniInput}
          />
          <input
            placeholder="성함"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={miniInput}
          />
          <button onClick={handleAdd} style={primaryBtn}>추가</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }} className="printable-area">
        <h3 style={{ textAlign: 'center', marginBottom: 16 }} className="only-print">{y}년 {m}월 기도의 향 참여 신청자 현황</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 120 }}>날짜</th>
                <th style={{ ...th, width: 80 }}>인원</th>
                <th style={th}>신청자 이름</th>
              </tr>
            </thead>
            <tbody>
              {dateRows.map(date => {
                const applicants = Object.entries(data[date] || {}).map(([uid, info]) => ({ uid, ...info }));
                const isSelectedMonth = date.startsWith(ym);
                if (!isSelectedMonth) return null;

                return (
                  <tr key={date} style={{ background: applicants.length > 0 ? '#fff' : '#F9FAFB' }}>
                    <td style={{ ...td, fontWeight: 800, textAlign: 'center' }}>
                      {parseInt(date.slice(8), 10)}일
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 900, color: applicants.length > 0 ? '#2563EB' : '#94A3B8' }}>
                      {applicants.length}명
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {applicants.length === 0 ? (
                          <span style={{ fontSize: 13, color: '#CBD5E1' }}>신청자 없음</span>
                        ) : (
                          applicants.map(a => (
                            <div key={a.uid} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 10px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
                              fontSize: 13, fontWeight: 700
                            }}>
                              {a.name}
                              {a.uid.startsWith('office_') && (
                                <span style={{ fontSize: 10, color: '#6366F1' }}>[사무실]</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setTargetToRemove({ date, uid: a.uid, name: a.name })}
                                style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                                className="no-print"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          .only-print { display: block !important; }
          .no-print { display: none !important; }
          .printable-area { visibility: visible !important; position: static !important; width: 100% !important; }
          table { width: 100% !important; border: 1px solid #000 !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #000 !important; padding: 8px !important; font-size: 12px !important; }
        }
        .only-print { display: none; }
      `}</style>

      {
        targetToRemove && (
          <div style={modalOverlayStyle} className="no-print">
            <div style={modalContentStyle}>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>기도의 향 삭제</div>
              <div style={{ fontSize: 15, color: '#374151', marginBottom: 24, lineHeight: 1.5 }}>
                정말로 <b>{targetToRemove.name}</b>님의 {parseInt(targetToRemove.date.slice(8), 10)}일자 신청을 삭제하시겠습니까?
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setTargetToRemove(null)} style={btn}>닫기</button>
                <button onClick={confirmRemove} style={dangerBtn}>삭제하기</button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: 20, background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ color: '#86868B', fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#1D1D1F' }}>{value}</div>
    </div>
  );
}

const box = {
  padding: '24px 20px',
  borderRadius: 24,
  border: 'none',
  background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const subBox = {
  padding: '16px 14px',
  borderRadius: 16,
  border: 'none',
  background: '#F5F5F7',
};

const btn = {
  padding: '12px 16px',
  borderRadius: 14,
  border: 'none',
  background: '#FFFFFF',
  color: '#1D1D1F',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const primaryBtn = {
  ...btn,
  background: '#0071E3',
  color: '#FFFFFF',
  boxShadow: '0 4px 12px rgba(0, 113, 227, 0.25)',
};

const dangerBtn = {
  ...btn,
  background: '#FF3B30',
  color: '#FFFFFF',
  boxShadow: '0 4px 12px rgba(255, 59, 48, 0.25)',
};

const input = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  border: 'none',
  background: '#F5F5F7',
  color: '#1D1D1F',
  outline: 'none',
  fontSize: 15,
};

const miniInput = {
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  background: '#F5F5F7',
  color: '#1D1D1F',
  outline: 'none',
  fontSize: 14,
  fontWeight: 600
};

const miniBtn = {
  padding: '8px 12px',
  borderRadius: 12,
  border: 'none',
  background: '#F5F5F7',
  color: '#0071E3',
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer'
};

const tabBtn = (active) => ({
  padding: '8px 16px',
  borderRadius: 12,
  border: 'none',
  background: active ? '#FFFFFF' : 'transparent',
  color: active ? '#1D1D1F' : '#86868B',
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  transition: 'all 0.2s',
  outline: 'none',
});

const tabBtnBlue = (active) => ({
  ...tabBtn(active),
  background: active ? '#0071E3' : 'transparent',
  color: active ? '#FFFFFF' : '#0071E3',
});

const listBtn = {
  padding: '16px 14px',
  borderRadius: 16,
  border: 'none',
  background: '#FFFFFF',
  color: '#1D1D1F',
  cursor: 'pointer',
  textAlign: 'left',
  fontWeight: 800,
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  fontSize: 15,
};

const listBtnActive = {
  background: '#F0F9FF',
  color: '#0071E3',
};

const label = { fontWeight: 700, color: '#86868B', fontSize: 13, marginBottom: 6 };
const th = { textAlign: 'left', padding: '14px 12px', borderBottom: 'none', fontSize: 13, color: '#86868B', fontWeight: 800, background: '#F5F5F7' };
const td = { padding: '14px 12px', borderBottom: '1px solid #F5F5F7', color: '#1D1D1F', fontWeight: 700, fontSize: 14 };

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)'
};

const modalContentStyle = {
  width: '90%', maxWidth: 400, background: '#fff',
  borderRadius: 20, padding: 24,
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  animation: 'slideUp 0.3s ease-out'
};

// confirm 사용을 위해 eslint 무시
/* eslint-disable no-restricted-globals */

import React, { useEffect, useMemo, useState } from 'react';
import { get, getDatabase, ref } from 'firebase/database';
import { subscribeToShepherdGroups } from '../shepherdSync.js';

// 결산(목장/개인) + 엑셀 다운로드
// - 기간은 YYYY-MM ~ YYYY-MM (최대 12개월)
// - 데이터 소스: shepherd/reports/{sunday}/{groupId}

const COLS = [
  { key: 'sunday', label: '주일' },
  { key: 'cell', label: '목장' },
  { key: 'wed', label: '수요' },
  { key: 'dawn', label: '새벽' },
  { key: 'crew', label: '성경러닝' },
  { key: 'vip', label: 'VIP' },
];

export default function ShepherdSettlement({ user }) {
  const [tab, setTab] = useState('group'); // group|person|total
  const [groups, setGroups] = useState({});
  const [groupId, setGroupId] = useState('all');
  const [personQuery, setPersonQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState('all');
  const [birthStart, setBirthStart] = useState('');
  const [birthEnd, setBirthEnd] = useState('');
  const [fromYm, setFromYm] = useState(() => formatYm(new Date()));
  const [toYm, setToYm] = useState(() => formatYm(new Date()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]); // display rows
  const [metaTitle, setMetaTitle] = useState('');

  useEffect(() => {
    const unsub = subscribeToShepherdGroups((val) => setGroups(val || {}));
    return () => unsub?.();
  }, []);

  const groupList = useMemo(() => {
    const all = Object.entries(groups || {}).map(([id, g]) => ({ id, ...(g || {}) }));
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return all;
  }, [groups]);

  const orgList = useMemo(() => {
    const set = new Set();
    Object.values(groups || {}).forEach(g => {
      Object.values(g.members || {}).forEach(m => {
        if (m.org) set.add(m.org);
      });
    });
    const sorted = Array.from(set);
    sorted.sort();
    return sorted;
  }, [groups]);

  useEffect(() => {
    if (tab === 'group' && !groupId && groupList.length) {
      setGroupId(groupList[0].id);
    }
  }, [tab, groupId, groupList]);

  async function runQuery() {
    setErr('');
    setRows([]);
    setMetaTitle('');

    const rangeErr = validateRange(fromYm, toYm);
    if (rangeErr) {
      setErr(rangeErr);
      return;
    }
    if (tab === 'group' && !groupId) {
      setErr('목장을 선택해 주세요.');
      return;
    }
    if (tab === 'person') {
      const q = personQuery.trim();
      if (!q) {
        setErr('개인 이름을 입력해 주세요.');
        return;
      }
    }

    setBusy(true);
    try {
      const db = getDatabase();
      const snap = await get(ref(db, 'shepherd/reports'));
      const all = snap.val() || {};

      const { startDate, endDate } = ymRangeToDateRange(fromYm, toYm);
      const sundays = Object.keys(all)
        .filter((ymd) => isYmdInRange(ymd, startDate, endDate))
        .sort();

      if (!sundays.length) {
        setErr('선택한 기간에 데이터가 없습니다.');
        return;
      }

      if (tab === 'group') {
        const g = groupList.find((x) => x.id === groupId);
        const title = `목장결산: ${g?.name || '목장'} (${fromYm} ~ ${toYm})`;
        const built = buildGroupRows(sundays, all, groupId);
        setMetaTitle(title);
        setRows(built);
      } else if (tab === 'person') {
        const q = personQuery.trim();
        const title = `개인결산: ${q} (${fromYm} ~ ${toYm})`;
        const built = buildPersonRows(sundays, all, q);
        if (!built.some((r) => r.type === 'week')) {
          setErr('해당 이름으로 검색된 데이터가 없습니다.');
          return;
        }
        setMetaTitle(title);
        setRows(built);
      } else if (tab === 'total') {
        const title = `전체성도결산 (${fromYm} ~ ${toYm})`;
        const built = buildTotalRows(sundays, all, groups, { groupId, org: orgFilter, birthStart, birthEnd });
        setMetaTitle(title);
        setRows(built);
      }
    } catch (e) {
      setErr(e?.message || '조회 실패');
    } finally {
      setBusy(false);
    }
  }

  function downloadExcel() {
    if (!rows?.length) return;
    const filenameBase = tab === 'group' ? '목장결산' : (tab === 'person' ? '개인결산' : '전체성도결산');
    const file = `${filenameBase}_${fromYm}_${toYm}.xlsx`;
    // xlsx 라이브러리 사용 (없으면 CSV로 fallback)
    exportRowsToExcel(rows, metaTitle, file).catch(() => {
      exportRowsToCsv(rows, metaTitle, file.replace(/\.xlsx$/i, '.csv'));
    });
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#E5E5EA', padding: 4, borderRadius: 16, width: 'fit-content' }}>
        <button onClick={() => { setTab('group'); setRows([]); setMetaTitle(''); setGroupId(groupList[0]?.id || ''); }} style={tabBtn(tab === 'group')}>목장결산</button>
        <button onClick={() => { setTab('person'); setRows([]); setMetaTitle(''); }} style={tabBtn(tab === 'person')}>개인결산</button>
        <button onClick={() => { setTab('total'); setRows([]); setMetaTitle(''); setGroupId('all'); }} style={tabBtn(tab === 'total')}>전체성도결산</button>
      </div>

      <div style={box}>
        <div style={{ display: 'grid', gap: 10 }}>
          {tab === 'group' ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={label}>목장 선택</div>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={input}>
                {groupList.map((g) => (
                  <option key={g.id} value={g.id}>{g.name || '(이름없음)'}</option>
                ))}
              </select>
            </div>
          ) : tab === 'person' ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={label}>개인 이름 검색</div>
              <input value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder='이름 입력' style={input} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={label}>목장 선택</div>
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={input}>
                  <option value="all">목원전체 (모든목장)</option>
                  {groupList.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={label}>기관 선택</div>
                <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} style={input}>
                  <option value="all">기관전체</option>
                  {orgList.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={label}>생일년도 (예: 70 ~ 80)</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={birthStart} onChange={(e) => setBirthStart(e.target.value)} placeholder='YY' style={{ ...input, width: '100%' }} />
                <span>~</span>
                <input value={birthEnd} onChange={(e) => setBirthEnd(e.target.value)} placeholder='YY' style={{ ...input, width: '100%' }} />
                {(birthStart || birthEnd) && (
                  <button
                    onClick={() => { setBirthStart(''); setBirthEnd(''); }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#1E293B',
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={label}>시작(YYYY-MM)</div>
              <input type='month' value={fromYm} onChange={(e) => setFromYm(e.target.value)} style={input} />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={label}>종료(YYYY-MM)</div>
              <input type='month' value={toYm} onChange={(e) => setToYm(e.target.value)} style={input} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            <button onClick={runQuery} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.65 : 1 }}>
              {busy ? '조회 중...' : '조회'}
            </button>
            <button onClick={downloadExcel} disabled={!rows.length} style={{ ...ghostBtn, opacity: rows.length ? 1 : 0.5 }}>
              엑셀 다운로드
            </button>
            <div style={{ color: '#86868B', fontSize: 12, fontWeight: 500 }}>
              기간은 최대 12개월까지 선택할 수 있습니다.
            </div>
          </div>

          {err ? <div style={{ color: '#DC2626', fontWeight: 800, marginTop: 10, fontSize: 14 }}>{err}</div> : null}
        </div>
      </div>

      {metaTitle ? (
        <div style={{ fontWeight: 800, color: '#1D1D1F', fontSize: 15, padding: '0 4px' }}>{metaTitle}</div>
      ) : null}

      {rows?.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>{tab === 'total' ? '이름' : '기간'}</th>
                {tab === 'total' ? <th style={{ ...th, textAlign: 'center' }}>생일(나이)</th> : null}
                {tab === 'total' ? <th style={{ ...th, textAlign: 'center' }}>기관</th> : (tab === 'group' ? <th style={{ ...th, textAlign: 'left' }}>목장이름</th> : null)}
                {COLS.map((c) => (
                  <th key={c.key} style={{ ...th, textAlign: 'right' }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                if (r.type === 'blank') {
                  return (
                    <tr key={`b_${idx}`}>
                      <td style={{ ...td, padding: 8 }} colSpan={tab === 'group' ? 1 + 1 + COLS.length : 1 + COLS.length} />
                    </tr>
                  );
                }
                const isSum = r.type === 'monthSum' || r.type === 'totalSum';
                const rowStyle = isSum ? sumRow : (r.type === 'week' ? {} : {});
                return (
                  <tr key={`${r.type}_${idx}`} style={rowStyle}>
                    <td style={{ ...td, textAlign: 'left' }}>{r.label}</td>
                    {tab === 'total' ? <td style={{ ...td, textAlign: 'center' }}>{r.birthday || '-'}</td> : null}
                    {tab === 'total' ? (
                      <td style={{ ...td, textAlign: 'center' }}>{r.org || '-'}</td>
                    ) : (
                      tab === 'group' ? <td style={{ ...td, textAlign: 'left' }}>{r.groupName || ''}</td> : null
                    )}
                    {COLS.map((c) => (
                      <td key={c.key} style={{ ...td, textAlign: 'right', paddingRight: 14 }}>{num(r[c.key])}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ---------------- helpers ----------------

function buildGroupRows(sundays, allReports, groupId) {
  const weekRows = [];
  const byMonth = {};

  for (const sunday of sundays) {
    const gReport = allReports?.[sunday]?.[groupId];
    if (!gReport) continue;
    const m = parseInt(sunday.slice(5, 7), 10);
    const ym = sunday.slice(0, 7);
    const weekIdx = sundayIndexInMonth(sunday);
    const label = `${m}월 ${weekIdx}주`;
    const meta = gReport.meta || {};
    const row = {
      type: 'week',
      label,
      groupName: gReport.groupName || '',
      sunday: toInt(meta.sundayAttendance),
      cell: toInt(meta.cellAttendance),
      wed: toInt(meta.wedAttendance),
      dawn: toInt(meta.dawnTotal),
      crew: toInt(meta.bibleReadingAttendance),
      crewNames: meta.bibleReadingNames || [],
      vip: toInt(meta.vipCount),
      _ym: ym,
      hasMeeting: gReport.hasMeeting !== false,
    };
    // 모임이 없는 경우, 목장 합계(cell)를 0으로 실시간 보정
    if (row.hasMeeting === false) {
      row.cell = 0;
    }
    weekRows.push(row);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(row);
  }

  const months = Object.keys(byMonth).sort();
  const out = [];
  const total = initSumRow();
  const totalCrewSet = new Set();
  for (const ym of months) {
    const rows = byMonth[ym].sort((a, b) => a.label.localeCompare(b.label));
    const monthSum = initSumRow();
    const monthCrewSet = new Set();
    for (const r of rows) {
      out.push(r);
      addToSum(monthSum, r);
      addToSum(total, r);
      (r.crewNames || []).forEach(name => {
        monthCrewSet.add(name);
        totalCrewSet.add(name);
      });
    }
    monthSum.crew = monthCrewSet.size; // 한 달 동안의 고유 참여 인원 수
    const mNum = parseInt(ym.slice(5, 7), 10);
    out.push({ ...monthSum, type: 'monthSum', label: `${mNum}월 합계`, groupName: '' });
    out.push({ type: 'blank' });
  }
  total.crew = totalCrewSet.size; // 전체 기간 동안의 고유 참여 인원 수
  out.push({ ...total, type: 'totalSum', label: '전체 합계', groupName: '' });
  return out;
}

function buildPersonRows(sundays, allReports, queryName) {
  const q = queryName.toLowerCase();
  const weekRows = [];
  const byMonth = {};

  for (const sunday of sundays) {
    const ym = sunday.slice(0, 7);
    const m = parseInt(sunday.slice(5, 7), 10);
    const weekIdx = sundayIndexInMonth(sunday);
    const label = `${m}월 ${weekIdx}주`;

    // across all groups
    const groupsObj = allReports?.[sunday] || {};
    const acc = initSumRow();
    let matched = false;

    for (const gId of Object.keys(groupsObj)) {
      const rep = groupsObj[gId];
      const members = rep?.members || {};
      for (const mk of Object.keys(members)) {
        const mem = members[mk] || {};
        const name = (mem.name || '').toString();
        if (!name) continue;
        if (name.toLowerCase().includes(q)) {
          matched = true;
          acc.sunday += mem.sunday ? 1 : 0;
          acc.cell += mem.cell ? 1 : 0;
          acc.wed += mem.wed ? 1 : 0;
          acc.dawn += toInt(mem.dawnCount);
          acc.crew += mem.bibleReading ? 1 : 0;
          acc.vip += toInt(mem.vipCount);
        }
      }
    }

    if (!matched) continue;

    const row = { type: 'week', label, ...acc, _ym: ym };
    weekRows.push(row);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(row);
  }

  const months = Object.keys(byMonth).sort();
  const out = [];
  const total = initSumRow();
  for (const ym of months) {
    const rows = byMonth[ym].sort((a, b) => a.label.localeCompare(b.label));
    const monthSum = initSumRow();
    let monthParticipated = false;
    for (const r of rows) {
      out.push(r);
      addToSum(monthSum, r);
      addToSum(total, r);
      if (r.crew > 0) monthParticipated = true;
    }
    monthSum.crew = monthParticipated ? 1 : 0; // 개인 결산: 해당 월 참여 여부
    const mNum = parseInt(ym.slice(5, 7), 10);
    out.push({ ...monthSum, type: 'monthSum', label: `${mNum}월 합계` });
    out.push({ type: 'blank' });
  }

  // 개인결산 참여 달수 계산 로직 (전체 합계의 crew 필드를 참여 달수로 덮어쓰기)
  total.crew = months.filter(ym => byMonth[ym].some(r => r.crew > 0)).length;

  out.push({ ...total, type: 'totalSum', label: '전체 합계' });
  return out;
}

function buildTotalRows(sundays, allReports, groupMap, filter) {
  const dataMap = {}; // { memberKey: { label(name), birthday, org, sunday, ... } }

  // 1. 대상 목원 정의
  let targets = [];
  if (filter.groupId === 'all') {
    Object.entries(groupMap).forEach(([gId, g]) => {
      Object.entries(g.members || {}).forEach(([mKey, m]) => {
        targets.push({ key: mKey, groupId: gId, ...m });
      });
    });
  } else {
    const g = groupMap[filter.groupId];
    if (g) {
      Object.entries(g.members || {}).forEach(([mKey, m]) => {
        targets.push({ key: mKey, groupId: filter.groupId, ...m });
      });
    }
  }

  // 필터링
  if (filter.org && filter.org !== 'all') {
    targets = targets.filter(m => m.org === filter.org);
  }
  if (filter.birthStart || filter.birthEnd) {
    const s = parseInt(filter.birthStart, 10);
    const e = parseInt(filter.birthEnd, 10);

    // 2자리 연도를 4자리로 변환하여 비교 (50 미만은 2000년대, 50 이상은 1900년대로 가정)
    const to4 = (yy) => {
      const y = parseInt(yy, 10);
      if (isNaN(y)) return null;
      return y < 50 ? 2000 + y : 1900 + y;
    };

    const s4 = to4(filter.birthStart);
    const e4 = to4(filter.birthEnd);

    targets = targets.filter(m => {
      const bY2 = (m.birthday || '').slice(0, 2);
      const bY4 = to4(bY2);
      if (bY4 === null) return false;
      if (s4 !== null && bY4 < s4) return false;
      if (e4 !== null && bY4 > e4) return false;
      return true;
    });
  }

  // 초기화
  targets.forEach(m => {
    dataMap[m.key] = {
      type: 'person',
      label: m.name,
      birthday: m.birthday,
      org: m.org,
      sunday: 0,
      cell: 0,
      wed: 0,
      dawn: 0,
      crew: 0,
      vip: 0,
    };
  });

  // 합산
  const memberCrewMonths = {}; // { memberKey: Set of YM }
  sundays.forEach(sun => {
    const ym = sun.slice(0, 7);
    const groupsInSun = allReports[sun] || {};
    Object.entries(groupsInSun).forEach(([gId, r]) => {
      const membersInReport = r.members || {};
      Object.entries(membersInReport).forEach(([mKey, rm]) => {
        if (dataMap[mKey]) {
          if (rm.sunday) dataMap[mKey].sunday++;
          if (rm.cell && r.hasMeeting !== false) dataMap[mKey].cell++;
          if (rm.wed) dataMap[mKey].wed++;
          dataMap[mKey].dawn += toInt(rm.dawnCount);
          if (rm.bibleReading) {
            if (!memberCrewMonths[mKey]) memberCrewMonths[mKey] = new Set();
            memberCrewMonths[mKey].add(ym);
          }
          dataMap[mKey].vip += toInt(rm.vipCount);
        }
      });
    });
  });

  // 성경러닝 참여 월수 반영
  Object.keys(dataMap).forEach(mKey => {
    dataMap[mKey].crew = (memberCrewMonths[mKey]?.size || 0);
  });

  const list = Object.values(dataMap);
  list.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  return list;
}

function initSumRow() {
  return { sunday: 0, cell: 0, wed: 0, dawn: 0, crew: 0, vip: 0 };
}

function addToSum(sum, row) {
  sum.sunday += toInt(row.sunday);
  sum.cell += toInt(row.cell);
  sum.wed += toInt(row.wed);
  sum.dawn += toInt(row.dawn);
  sum.crew += toInt(row.crew);
  sum.vip += toInt(row.vip);
}

function toInt(v) {
  const n = parseInt(v ?? 0, 10);
  return Number.isFinite(n) ? n : 0;
}

function num(v) {
  const n = toInt(v);
  return n === 0 ? '0' : String(n);
}

function formatYm(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function validateRange(fromYm, toYm) {
  if (!fromYm || !toYm) return '기간을 선택해 주세요.';
  if (!/^\d{4}-\d{2}$/.test(fromYm) || !/^\d{4}-\d{2}$/.test(toYm)) return '기간 형식이 올바르지 않습니다.';
  const diff = monthDiff(fromYm, toYm);
  if (diff < 0) return '종료 기간이 시작 기간보다 빠릅니다.';
  if (diff > 11) return '기간은 최대 1년(12개월)까지만 선택할 수 있습니다.';
  return '';
}

function monthDiff(fromYm, toYm) {
  const [fy, fm] = fromYm.split('-').map((x) => parseInt(x, 10));
  const [ty, tm] = toYm.split('-').map((x) => parseInt(x, 10));
  return (ty - fy) * 12 + (tm - fm);
}

function ymRangeToDateRange(fromYm, toYm) {
  const [fy, fm] = fromYm.split('-').map((x) => parseInt(x, 10));
  const [ty, tm] = toYm.split('-').map((x) => parseInt(x, 10));
  const startDate = new Date(fy, fm - 1, 1);
  const endDate = new Date(ty, tm, 0); // last day of month
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

function isYmdInRange(ymd, startDate, endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  return dt >= startDate && dt <= endDate;
}

function sundayIndexInMonth(ymd) {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const target = new Date(y, m - 1, d);
  const first = new Date(y, m - 1, 1);
  // 첫 번째 주일 찾기
  const firstSunday = new Date(first);
  const offset = (7 - firstSunday.getDay()) % 7; // day: 0=Sun
  firstSunday.setDate(firstSunday.getDate() + offset);
  if (target < firstSunday) return 1;
  const diffDays = Math.floor((target - firstSunday) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

async function exportRowsToExcel(rows, title, filename) {
  const XLSX = await import('xlsx');
  const aoa = [];
  if (title) {
    aoa.push([title]);
    aoa.push([]);
  }
  const header = ['기간'];
  // groupName column is included in rows for group type, but for excel we always include it if present
  const hasGroup = rows.some((r) => r.groupName != null);
  if (hasGroup) header.push('목장이름');
  COLS.forEach((c) => header.push(c.label));
  aoa.push(header);
  rows.forEach((r) => {
    if (r.type === 'blank') {
      aoa.push([]);
      return;
    }
    const line = [r.label];
    if (hasGroup) line.push(r.groupName || '');
    COLS.forEach((c) => line.push(toInt(r[c.key])));
    aoa.push(line);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '결산');
  XLSX.writeFile(wb, filename);
}

function exportRowsToCsv(rows, title, filename) {
  const hasGroup = rows.some((r) => r.groupName != null);
  const header = ['기간'];
  if (hasGroup) header.push('목장이름');
  COLS.forEach((c) => header.push(c.label));
  const lines = [];
  if (title) lines.push(escapeCsv([title]));
  lines.push(escapeCsv([]));
  lines.push(escapeCsv(header));
  rows.forEach((r) => {
    if (r.type === 'blank') {
      lines.push('');
      return;
    }
    const line = [r.label];
    if (hasGroup) line.push(r.groupName || '');
    COLS.forEach((c) => line.push(String(toInt(r[c.key]))));
    lines.push(escapeCsv(line));
  });
  const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(arr) {
  return (arr || [])
    .map((v) => {
      const s = (v ?? '').toString();
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    })
    .join(',');
}

const box = {
  padding: '24px 20px',
  borderRadius: 20,
  border: 'none',
  background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const label = { fontSize: 13, fontWeight: 700, color: '#86868B', marginBottom: 4 };

const input = {
  padding: '12px 16px',
  borderRadius: 14,
  border: 'none',
  background: '#F5F5F7',
  fontWeight: 600,
  color: '#1D1D1F',
  outline: 'none',
};

const primaryBtn = {
  padding: '12px 20px',
  borderRadius: 14,
  border: 'none',
  background: '#0071E3',
  color: '#FFFFFF',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0, 113, 227, 0.25)',
};

const ghostBtn = {
  padding: '12px 20px',
  borderRadius: 14,
  border: 'none',
  background: '#E5E5EA',
  color: '#1D1D1F',
  fontWeight: 800,
  cursor: 'pointer',
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
});

const table = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  overflow: 'hidden',
  borderRadius: 20,
  border: 'none',
  background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const th = {
  padding: '14px 12px',
  textAlign: 'left',
  fontWeight: 800,
  fontSize: 13,
  color: '#86868B',
  background: '#F5F5F7',
  borderBottom: 'none',
  whiteSpace: 'nowrap',
};

const td = {
  padding: '14px 12px',
  borderBottom: '1px solid #F5F5F7',
  color: '#1D1D1F',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  fontSize: 14,
};

const sumRow = {
  background: '#F0F9FF',
};

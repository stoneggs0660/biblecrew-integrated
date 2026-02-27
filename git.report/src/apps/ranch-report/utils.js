export function formatDateKorean(yyyyMmDd) {
  if (!yyyyMmDd) return '';
  const parts = yyyyMmDd.split('-');
  if (parts.length !== 3) return yyyyMmDd;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!y || !m || !d) return yyyyMmDd;
  return `${y}년 ${m}월 ${d}일`;
}

export function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 오늘이 속한 주의 '주일' 날짜(YYYY-MM-DD)를 반환
export function getSundayOfWeek(baseDate = new Date()) {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=Sun
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return toYmd(d);
}

export function shiftSunday(sundayYmd, deltaWeeks) {
  const [y, m, d] = sundayYmd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + (deltaWeeks * 7));
  return toYmd(dt);
}

export function getWeekLabel(sundayYmd) {
  return `${formatDateKorean(sundayYmd)} (주일)`;
}

export function safeText(v) {
  return (v == null ? '' : String(v));
}

export function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  return [v];
}

// RTDB에서 leaders가 string/object/array 등으로 섞여 저장될 수 있어 안전하게 배열로 정규화
// - array: 그대로
// - string: 쉼표 기준 분리
// - object: values 사용(배열이 객체로 저장된 형태 포함)
export function normalizeLeaders(leaders) {
  if (!leaders) return [];
  if (Array.isArray(leaders)) return leaders.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
  if (typeof leaders === 'string') {
    return leaders.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (typeof leaders === 'object') {
    return Object.values(leaders).map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
  }
  return [String(leaders)].map((s) => s.trim()).filter(Boolean);
}

// members 객체를 정렬된 배열로 변환
export function normalizeMembers(membersObj) {
  const entries = Object.entries(membersObj || {});
  return entries
    .map(([key, m]) => ({ key, ...(m || {}) }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}


export function computeMetaFromRows(rows, hasMeeting = true) {
  const totalMembers = rows.length;

  const sundayAttendance = rows.filter((r) => !!r.sunday).length;
  const cellAttendance = hasMeeting ? rows.filter((r) => !!r.cell).length : 0;
  const wedAttendance = rows.filter((r) => !!r.wed).length;

  const dawnTotal = rows.reduce((sum, r) => sum + (parseInt(r.dawnCount || 0, 10) || 0), 0);
  const bibleReadingAttendance = rows.filter((r) => !!r.bibleReading).length;
  const bibleReadingNames = rows.filter((r) => !!r.bibleReading).map(r => r.name).filter(Boolean);

  const vipCount = rows.reduce((sum, r) => sum + (parseInt(r.vipCount || 0, 10) || 0), 0);
  const vipNames = rows
    .map((r) => {
      const names = safeText(r.vipNames).split(/[, ]+/).filter(Boolean);
      return names.map(v => `${v}(${r.name})`);
    })
    .flat();

  const absentees = rows.filter((r) => !r.sunday).map((r) => r.name).filter(Boolean);

  return {
    totalMembers,
    sundayAttendance,
    cellAttendance,
    wedAttendance,
    dawnTotal,
    bibleReadingAttendance,
    bibleReadingNames,
    vipCount,
    vipNames,
    absentees,
  };
}


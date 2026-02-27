import { db } from '../../firebase';
import { ref, onValue, set, update, push, get, getDatabase } from 'firebase/database';

// Shepherd(목자보고서) RTDB
// shepherd/groups/{groupId}
// shepherd/reports/{sunday}/{groupId}
// shepherd/notice

export function subscribeToShepherdGroups(callback) {
  const r = ref(db, 'shepherd/groups');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

export function subscribeToShepherdGroup(groupId, callback) {
  if (!groupId) return () => { };
  const r = ref(db, `shepherd/groups/${groupId}`);
  const unsub = onValue(r, (snap) => callback(snap.val() || null));
  return unsub;
}

export function subscribeToShepherdReport(sunday, groupId, callback) {
  if (!sunday || !groupId) return () => { };
  const r = ref(db, `shepherd/reports/${sunday}/${groupId}`);
  const unsub = onValue(r, (snap) => callback(snap.val() || null));
  return unsub;
}

export function subscribeToShepherdNotice(callback) {
  const r = ref(db, 'shepherd/notice');
  const unsub = onValue(r, (snap) => callback(snap.val() || null));
  return unsub;
}

export async function setShepherdNotice(text, updatedBy) {
  const db2 = getDatabase();
  const r = ref(db2, 'shepherd/notice');
  const payload = {
    text: (text ?? '').toString(),
    updatedAt: Date.now(),
    updatedBy: (updatedBy ?? '').toString(),
  };
  await set(r, payload);
  return payload;
}

export function subscribeToMainNotice(callback) {
  const r = ref(db, 'main/notice');
  const unsub = onValue(r, (snap) => callback(snap.val() || null));
  return unsub;
}

export async function setMainNotice(text, updatedBy) {
  const db2 = getDatabase();
  const r = ref(db2, 'main/notice');
  const payload = {
    text: (text ?? '').toString(),
    updatedAt: Date.now(),
    updatedBy: (updatedBy ?? '').toString(),
  };
  await set(r, payload);
  return payload;
}

export async function createShepherdGroup(payload) {
  const db2 = getDatabase();
  const baseRef = ref(db2, 'shepherd/groups');
  const newRef = push(baseRef);
  const id = newRef.key;
  const group = {
    name: (payload?.name || '').toString(),
    leaders: Array.isArray(payload?.leaders) ? payload.leaders : [],
    members: payload?.members || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(newRef, group);
  return { id, ...group };
}

export async function updateShepherdGroup(groupId, patch) {
  if (!groupId) return false;
  const db2 = getDatabase();
  const r = ref(db2, `shepherd/groups/${groupId}`);
  const snap = await get(r);
  const cur = snap.val() || {};
  const next = {
    ...cur,
    ...(patch || {}),
    updatedAt: Date.now(),
  };
  await set(r, next);
  return { id: groupId, ...next };
}

export async function deleteShepherdGroup(groupId) {
  if (!groupId) return false;
  const db2 = getDatabase();
  await set(ref(db2, `shepherd/groups/${groupId}`), null);
  return true;
}

export async function patchShepherdReport(sunday, groupId, patch) {
  if (!sunday || !groupId || !patch) return;
  const db2 = getDatabase();
  const r = ref(db2, `shepherd/reports/${sunday}/${groupId}`);
  // update에 null 값이 포함되면 Firebase RTDB는 해당 필드를 삭제합니다.
  await update(r, {
    ...patch,
    updatedAt: Date.now()
  });
}

export function setShepherdReport(sunday, groupId, value) {
  if (!sunday || !groupId) return Promise.resolve(false);
  const r = ref(db, `shepherd/reports/${sunday}/${groupId}`);
  return set(r, value);
}


export function updateShepherdMember(sunday, groupId, memberKey, patch) {
  if (!sunday || !groupId || !memberKey) return Promise.resolve(false);
  const r = ref(db, `shepherd/reports/${sunday}/${groupId}/members/${memberKey}`);
  const next = { ...(patch || {}), updatedAt: Date.now() };
  return update(r, next);
}

// --- 기도의 향 (Prayer Scent) ---

export function subscribeToPrayerScent(ym, callback) {
  if (!ym) return () => { };
  // ym 형식: YYYY-MM
  const db2 = getDatabase();
  const r = ref(db2, 'shepherd/prayerScent');
  const unsub = onValue(r, (snap) => {
    const all = snap.val() || {};
    // 해당 월의 데이터만 필터링해서 전달 (키가 YYYY-MM-DD 형식임을 가정)
    const filtered = {};
    Object.entries(all).forEach(([date, data]) => {
      if (date.startsWith(ym)) {
        filtered[date] = data;
      }
    });
    callback(filtered);
  });
  return unsub;
}

export async function applyPrayerScent(date, uid, name) {
  if (!date || !uid) return false;
  const db2 = getDatabase();
  const r = ref(db2, `shepherd/prayerScent/${date}/${uid}`);
  await set(r, {
    name,
    timestamp: Date.now()
  });
  return true;
}

export async function cancelPrayerScent(date, uid) {
  if (!date || !uid) return false;
  const db2 = getDatabase();
  const r = ref(db2, `shepherd/prayerScent/${date}/${uid}`);
  await set(r, null);
  return true;
}

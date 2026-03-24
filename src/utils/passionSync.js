import { db } from "../firebase";
import { ref, onValue, set, remove, push } from "firebase/database";

const BASE_PATH = "passion_week/2026";

/**
 * 전용 유틸리티: 날짜별 체크인 및 수동 입력 명단 통합 관리
 */

// 1. 실시간 체크인 데이터 구독 (일반 사용자)
export function subscribeToPassionChecks(callback) {
    const path = ref(db, `${BASE_PATH}/checkins`);
    return onValue(path, (snap) => callback(snap.val() || {}));
}

// 2. 관리자 수동 입력 명단 구독
export function subscribeToPassionManualEntries(callback) {
    const path = ref(db, `${BASE_PATH}/manual_entries`);
    return onValue(path, (snap) => callback(snap.val() || {}));
}

// 3. 사용자 본인 체크인 저장/해제
export function savePassionCheck(dateId, uid, name, checked) {
    const path = ref(db, `${BASE_PATH}/checkins/${dateId}/${uid}`);
    if (checked) {
        return set(path, { name, timestamp: Date.now() });
    } else {
        return remove(path);
    }
}

// 4. 관리자: 수동 명단 추가
export function addPassionManualEntry(dateId, name) {
    const path = ref(db, `${BASE_PATH}/manual_entries/${dateId}`);
    const newRef = push(path);
    return set(newRef, { name, timestamp: Date.now() });
}

// 5. 관리자: 수동 명단 삭제
export function removePassionManualEntry(dateId, entryId) {
    const path = ref(db, `${BASE_PATH}/manual_entries/${dateId}/${entryId}`);
    return remove(path);
}

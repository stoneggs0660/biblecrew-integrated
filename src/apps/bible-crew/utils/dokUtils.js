/**
 * 성경 1독 계산 유틸리티
 * 
 * [조합 규칙]
 * 1순위: 고급반 1개 -> 1독
 * 2순위: 중급반 1개 + 신약초급 1개 -> 1독
 * 3순위: 초급반(구약A) 1개 + 초급반(구약B) 1개 + 신약초급 1개 -> 1독
 * 
 * [입력]
 * earnedMedals: { "2025-01_고급반": "gold", "2025-02_중급반": "silver", ... }
 */

export function calculateDokStatus(earnedMedals = {}) {
    // 1. 수료한 반 목록 추출 및 카운팅
    const inventory = {
        고급반: 0,
        중급반: 0,
        '초급반(구약A)': 0,
        '초급반(구약B)': 0,
        '초급반': 0 // 신약초급
    };

    Object.keys(earnedMedals).forEach(key => {
        const value = earnedMedals[key];

        // key 형식: "YYYY-MM_반이름" 또는 구버전 "YYYY-MM"
        const parts = key.split('_');
        let crewName = '';

        if (parts.length >= 2) {
            crewName = parts[1]; // 신규 포맷
        } else {
            // 과거 포맷: 반 이름이 없다면 메달 종류로 유추
            if (value === 'gold') crewName = '고급반';
            else if (value === 'silver') crewName = '중급반';
            else if (value === 'bronze') crewName = '초급반'; // 과거 동메달은 보통 기본 초급반
        }

        if (crewName && inventory.hasOwnProperty(crewName)) {
            inventory[crewName]++;
        }
    });

    let totalDok = 0;
    let remaining = { ...inventory };

    // 2. 1순위: 고급반 소모
    while (remaining['고급반'] > 0) {
        totalDok++;
        remaining['고급반']--;
    }

    // 3. 2순위: 중급반 + 신약초급 소모
    while (remaining['중급반'] > 0 && remaining['초급반'] > 0) {
        totalDok++;
        remaining['중급반']--;
        remaining['초급반']--;
    }

    // 4. 3순위: 구약A + 구약B + 신약초급 소모
    while (remaining['초급반(구약A)'] > 0 && remaining['초급반(구약B)'] > 0 && remaining['초급반'] > 0) {
        totalDok++;
        remaining['초급반(구약A)']--;
        remaining['초급반(구약B)']--;
        remaining['초급반']--;
    }

    // 소모되지 않고 남은 조각들 필터링
    const fragments = Object.entries(remaining)
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => ({ name, count }));

    return {
        totalDok,
        fragments,
        remaining // 상세 조각 정보 (매핑용)
    };
}


export function calculateDokStatusDetailed(earnedMedals = {}) {
    // 순서 보존을 위해 배열을 유지하는 맵
    const inventory = {
        '고급반': [],
        '중급반': [],
        '초급반(구약A)': [],
        '초급반(구약B)': [],
        '초급반': [] // 신약초급
    };

    // 시간 순 정렬
    const sortedMedals = Object.entries(earnedMedals).sort((a, b) => a[0].localeCompare(b[0]));

    sortedMedals.forEach(([key, value]) => {
        const parts = key.split('_');
        let crewName = '';

        if (parts.length >= 2) {
            crewName = parts[1];
        } else {
            if (value === 'gold') crewName = '고급반';
            else if (value === 'silver') crewName = '중급반';
            else if (value === 'bronze') crewName = '초급반';
        }

        if (crewName && inventory.hasOwnProperty(crewName)) {
            inventory[crewName].push(key);
        }
    });

    let totalDok = 0;
    const usedMedals = []; // 1독에 사용된 메달 기록
    
    // 복사
    let remaining = {};
    for (let k in inventory) remaining[k] = [...inventory[k]];

    // 1순위: 고급반 소모
    while (remaining['고급반'].length > 0) {
        totalDok++;
        usedMedals.push([remaining['고급반'].shift()]);
    }

    // 2순위: 중급반 + 신약초급 소모
    while (remaining['중급반'].length > 0 && remaining['초급반'].length > 0) {
        totalDok++;
        usedMedals.push([
            remaining['중급반'].shift(),
            remaining['초급반'].shift()
        ]);
    }

    // 3순위: 구약A + 구약B + 신약초급 소모
    while (remaining['초급반(구약A)'].length > 0 && remaining['초급반(구약B)'].length > 0 && remaining['초급반'].length > 0) {
        totalDok++;
        usedMedals.push([
            remaining['초급반(구약A)'].shift(),
            remaining['초급반(구약B)'].shift(),
            remaining['초급반'].shift()
        ]);
    }

    // 하위 호환성을 위해 리턴 형태 유지하되 사용된 메달 정보 추가
    const countsOnly = {};
    for (let k in remaining) countsOnly[k] = remaining[k].length;

    return {
        totalDok,
        remaining: countsOnly,
        usedMedals: usedMedals // 어떤 메달 키들이 함께 1독을 만들었는지 리스트
    };
}

# ⛔ 성경러닝크루 핵심 로직 보호 지침 (PROTECTED LOGIC)

이 문서는 성경러닝크루 서비스의 안정성을 유지하기 위해 **수정이 절대 금지**되거나 **극도의 주의**가 필요한 핵심 로직들의 지도를 제공합니다. AI 조수 및 개발자는 관련 작업을 수행하기 전 반드시 이 지도를 확인하십시오.

---

## 1. 수동결산 시스템 (Settlement System)
매달 성경 읽기 결과를 집계하여 메달을 부여하고 명예의 전당을 갱신하는 로직입니다. 멱등성(Idempotency)이 보장되어야 하며, 영수증 기반으로 작동합니다.

- **관련 파일 및 함수**:
  - `src/apps/bible-crew/pages/AdminPage.jsx`: `handleFinalizeSettlement`, `handleGlobalSync`
  - `src/apps/bible-crew/firebaseSync.js`: `saveMonthlyHallOfFame`, `recalculateUserMedals`, `runMedalFixOps`
  - `src/apps/bible-crew/utils/rankingUtils.js`: `calculateMonthlyRankingForMonth`

## 2. 성경 데이터 및 분량 정보 (Bible Data)
성경 66권의 장수와 각 반별 월간 목표 장수를 정의합니다. 이 데이터가 수정되면 모든 사용자의 진행률이 깨집니다.

- **관련 파일**:
  - `src/apps/bible-crew/utils/bibleUtils.js`: `BOOKS` 배열, `OT_A_TOTAL`, `OT_B_TOTAL` 등 상수 및 분량 계산 함수 전체

## 3. 1독 판정 알고리즘 (Dok Status Logic)
획득한 메달 조합을 분석하여 성경 1독 여부를 판정합니다.

- **관련 파일**:
  - `src/apps/bible-crew/utils/dokUtils.js`: `calculateDokStatus`, `calculateDokStatusDetailed`

## 4. 핵심 체크인 로직 (Core Check-in)
성도님들이 매일 성경을 읽고 스탬프를 찍는 가장 중요한 동작입니다.

- **관련 파일 및 함수**:
  - `src/apps/bible-crew/firebaseSync.js`: `saveCrewCheck`

---

## ⚠️ 주의 사항 (Warning)
1. **임의 수정 금지**: 위 로직들은 현재 운영 중인 서비스의 정합성을 보장합니다. 명시적인 요청 없이 코드를 최적화하거나 리팩토링하지 마십시오.
2. **사전 검증**: 만약 수정이 불가피하다면, 반드시 기존의 메달 영수증 구조(`earnedMedals`)가 훼손되지 않는지 먼저 검증해야 합니다.
3. **주석 확인**: 각 함수 상단에 있는 `// ⛔ DO NOT EDIT` 주석을 확인하십시오.

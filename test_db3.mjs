import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import { calculateDokStatus } from './src/apps/bible-crew/utils/dokUtils.js';

const firebaseConfig = {
  databaseURL: "https://biblecrew-e14f3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function test() {
  const s = await get(ref(db, 'users'));
  const users = s.val() || {};
  const targetYm = '2026-02'; // 수정 2026-02
  const achievers = [];

  for (const uid in users) {
    const user = users[uid];
    const medals = user.earnedMedals || {};
    
    // 1. 해당 월(targetYm)에 수여된 메달이 1개라도 있는지 확인
    const hasMedalThisMonth = Object.keys(medals).some(key => key.startsWith(targetYm));
    if (!hasMedalThisMonth) continue;

    const medalsTotal = {};
    const medalsBefore = {};

    Object.entries(medals).forEach(([key, value]) => {
      const keyYm = key.substring(0, 7); // "YYYY-MM" 추출
      if (keyYm <= targetYm) {
        medalsTotal[key] = value;
        if (keyYm < targetYm) {
          medalsBefore[key] = value;
        }
      }
    });

    const totalDokNow = calculateDokStatus(medalsTotal).totalDok;
    const totalDokBefore = calculateDokStatus(medalsBefore).totalDok;

    if (totalDokNow > totalDokBefore) {
      achievers.push({
        name: user.name,
        totalDokNow,
        totalDokBefore
      });
    }
  }
  
  console.log('2026-02 완독자 목록:', JSON.stringify(achievers, null, 2));
  process.exit(0);
}
test();

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://biblecrew-e14f3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function test() {
  const s = await get(ref(db, 'users'));
  const users = s.val() || {};
  const targetYm = '2025-02';
  const achievers = [];

  for (const uid in users) {
    const user = users[uid];
    const medals = user.earnedMedals || {};
    
    const hasMedalThisMonth = Object.keys(medals).some(key => key.startsWith(targetYm));
    if (!hasMedalThisMonth) continue;

    const medalsTotal = {};
    const medalsBefore = {};

    Object.entries(medals).forEach(([key, value]) => {
      const keyYm = key.substring(0, 7); 
      if (keyYm <= targetYm) {
        medalsTotal[key] = value;
        if (keyYm < targetYm) {
          medalsBefore[key] = value;
        }
      }
    });

    const dokUtils = await import('./src/apps/bible-crew/utils/dokUtils.js');
    const totalDokNow = dokUtils.calculateDokStatus(medalsTotal).totalDok;
    const totalDokBefore = dokUtils.calculateDokStatus(medalsBefore).totalDok;

    if (totalDokNow > totalDokBefore) {
      achievers.push({
        name: user.name,
        totalDokNow,
        totalDokBefore,
        earnedMedalsThisMonth: Object.keys(medalsTotal).filter(k => k.startsWith(targetYm))
      });
    }
  }
  
  console.log('--- 2025-02 완독자 ---');
  console.log(JSON.stringify(achievers, null, 2));
  process.exit(0);
}
test().catch(e => console.error(e));

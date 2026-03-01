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
  let c = 0;
  for (const uid in users) {
    if (Object.keys(users[uid].earnedMedals || {}).length > 0) {
      console.log(users[uid].name, users[uid].earnedMedals);
      c++;
      if (c>10) break;
    }
  }
  process.exit(0);
}
test().catch(e => console.error(e));

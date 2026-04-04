import { getMonthDates } from './dateUtils';
import { CREW_KEYS } from './crewConfig';
import { getDailyBiblePortionByCrew } from './bibleUtils';

/**
 * crewsData: Realtime DB /crews 전체 스냅샷
 * usersMap: /users 전체 스냅샷
 */
export function calculateMonthlyRanking(crewsData = {}, usersMap = {}, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dates = getMonthDates(year, month);
  if (!dates || dates.length === 0) {
    return { ranking: [], medalCounts: { gold: 0, silver: 0, bronze: 0 } };
  }

  const crewNames = CREW_KEYS;
  const portionByCrewAndDate = {};

  crewNames.forEach(crew => {
    const portions = getDailyBiblePortionByCrew(crew, dates);
    const map = {};
    portions.forEach(p => {
      map[p.date] = p;
    });
    portionByCrewAndDate[crew] = map;
  });

  const fullList = [];
  crewNames.forEach(crew => {
    const crewNode = crewsData && crewsData[crew];
    const usersNode = crewNode && crewNode.users;
    if (!usersNode) return;

    Object.entries(usersNode).forEach(([uid, u]) => {
      const checks = (u && u.checks) || {};
      let chapters = 0;
      dates.forEach(d => {
        if (checks[d]) {
          const portion = portionByCrewAndDate[crew][d];
          if (portion && typeof portion.chapters === 'number') {
            chapters += portion.chapters;
          }
        }
      });

      if (chapters > 0) {
        const info = usersMap[uid] || {};
        fullList.push({
          uid,
          name: info.name || '이름없음',
          crew: info.crew || crew,
          chapters: chapters
        });
      }
    });
  });

  fullList.sort((a, b) => b.chapters - a.chapters);

  const medalCounts = { gold: 0, silver: 0, bronze: 0 };
  fullList.forEach((u, idx) => {
    let medal = null;
    if (idx === 0) {
      medal = 'gold';
      medalCounts.gold++;
    } else if (idx === 1) {
      medal = 'silver';
      medalCounts.silver++;
    } else if (idx === 2) {
      medal = 'bronze';
      medalCounts.bronze++;
    }
    u.medal = medal;
  });

  return { ranking: fullList, medalCounts };
}

export function calculateMonthlyRankingForMonth(crewsData = {}, usersMap = {}, year, month) {
  const dates = getMonthDates(year, month);
  if (!dates || dates.length === 0) {
    return { ranking: [], medalCounts: { gold: 0, silver: 0, bronze: 0 } };
  }

  const crewNames = CREW_KEYS;
  const portionByCrewAndDate = {};

  crewNames.forEach((crew) => {
    const portions = getDailyBiblePortionByCrew(crew, dates);
    const map = {};
    (portions || []).forEach((p) => {
      if (!p || !p.date) return;
      map[p.date] = p;
    });
    portionByCrewAndDate[crew] = map;
  });

  const fullList = [];
  crewNames.forEach((crew) => {
    const crewNode = crewsData && crewsData[crew];
    const usersNode = crewNode && crewNode.users;
    if (!usersNode) return;

    const portionMap = portionByCrewAndDate[crew] || {};
    let totalTargetChapters = 0;
    Object.values(portionMap).forEach(p => {
      totalTargetChapters += (p.chapters || 0);
    });

    Object.entries(usersNode).forEach(([uid, u]) => {
      const checks = (u && u.checks) || {};
      let chapters = 0;
      dates.forEach((d) => {
        if (checks[d]) {
          const portion = portionMap[d];
          if (portion && typeof portion.chapters === 'number' && portion.chapters > 0) {
            chapters += portion.chapters;
          }
        }
      });

      const info = usersMap[uid] || {};
      let medal = null;
      const isComplete = chapters >= totalTargetChapters && totalTargetChapters > 0;

      if (isComplete) {
        if (crew === '고급반') {
          medal = 'gold';
        } else if (crew === '중급반') {
          medal = 'silver';
        } else if (
          crew === '초급반' ||
          crew.includes('초급반') ||
          crew.includes('파노라마')
        ) {
          medal = 'bronze';
        }
      }

      fullList.push({
        uid,
        name: info.name || '이름없음',
        crew: crew,
        chapters: chapters,
        medal,
      });
    });
  });

  fullList.sort((a, b) => b.chapters - a.chapters);

  const medalCounts = { gold: 0, silver: 0, bronze: 0 };
  fullList.forEach((u) => {
    if (u.medal === 'gold') medalCounts.gold++;
    if (u.medal === 'silver') medalCounts.silver++;
    if (u.medal === 'bronze') medalCounts.bronze++;
  });

  return { ranking: fullList, medalCounts };
}

export async function fetchAllCrewData() { return {}; }
export async function fetchUserNames() { return {}; }
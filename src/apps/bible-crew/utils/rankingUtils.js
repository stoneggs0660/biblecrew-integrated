import { getMonthDates } from './dateUtils';
import { CREW_KEYS } from './crewConfig';
import { getDailyBiblePortionByCrew } from './bibleUtils';

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

  const userTotals = {};

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

                                                                if (!userTotals[uid]) userTotals[uid] = { uid, chapters: 0, crew };
                                userTotals[uid].chapters += chapters;
                        });
  });

  const list = Object.values(userTotals).map(u => {
        const info = usersMap[u.uid] || {};
        return {
                uid: u.uid,
                name: info.name || 'Anonymous',
                crew: info.crew || u.crew,
                chapters: u.chapters
        };
  });

  list.sort((a, b) => b.chapters - a.chapters);

  const medalCounts = { gold: 0, silver: 0, bronze: 0 };
    list.forEach((u, idx) => {
          let medal = null;
          if (u.chapters > 0) {
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
          }
          u.medal = medal;
    });

  return { ranking: list, medalCounts };
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

          const userTotalsForCrew = {};
          const portionMap = portionByCrewAndDate[crew] || {};

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

                  userTotalsForCrew[uid] = { uid, crew, chapters };
          });

          let totalTargetChapters = 0;
          Object.values(portionMap).forEach(p => { totalTargetChapters += (p.chapters || 0); });

          Object.values(userTotalsForCrew).forEach((u) => {
                  const info = usersMap[u.uid] || {};
                  let medal = null;
                  const isComplete = u.chapters >= totalTargetChapters && totalTargetChapters > 0;

                  if (isComplete) {
                                 if (crew === 'Advanced') medal = 'gold';
                          else if (crew === 'Intermediate') medal = 'silver';
                          else if (crew === 'Beginner' || crew.includes('Beginner') || crew.includes('Panorama')) {
                                      medal = 'bronze';
                          }
                  }
            
                          }
                  }

                  fullList.push({
                            uid: u.uid,
                            name: info.name || 'Anonymous',
                            crew: u.crew,
                            chapters: u.chapters,
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

    });

    return { ranking: fullList, medalCounts };
}

export async function fetchAllCrewData() { return {}; }
export async function fetchUserNames() { return {}; }


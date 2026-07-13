// ─────────────────────────────────────────────────────────────────────────────
// אלגוריתם התאמה #2 — התנהגותי (Collaborative Filtering).
// "אנשים שאולי מתאימים לך" — לפי התנהגות באפליקציה, לא לפי תכונות.
// הרעיון: מוצאים משתמשים שהתנהגו כמוני (התעניינו באותם פרופילים),
// ומציעים לי את מי *שהם* התעניינו בו ואני עוד לא.
// חולץ כפי-שהוא מ-matchesForYou (behavioralMatches) — אותו חישוב בדיוק.
// ─────────────────────────────────────────────────────────────────────────────

// דמיון קוסינוס בין שתי מפות התעניינות (0 = שונה, 1 = זהה).
function cosine(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (const t in a) {
    magA += a[t] * a[t];
    if (b[t]) dot += a[t] * b[t];
  }
  for (const t in b) magB += b[t] * b[t];
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// מחזיר מערך מועמדים { ...user, behavioralScore } ממוין יורד, ללא מי שהוסתר (dismissed).
// me = המשתמש המחובר, users = כל המשתמשים המוצגים, engagementPairs = זוגות התעניינות מהשרת.
export function computeBehavioralMatches(me, users, engagementPairs, dismissed = new Set()) {
  if (!me || !users || users.length === 0 || !engagementPairs || engagementPairs.length === 0) {
    return [];
  }
  const myId = me.userID;

  // שלב 1: לכל משתמש, מפה של "במי התעניין" → משקל.
  // engagement[userId] = { [targetId]: weight }
  const engagement = {};
  for (const p of engagementPairs) {
    if (!engagement[p.fromUserID]) engagement[p.fromUserID] = {};
    engagement[p.fromUserID][p.toUserID] = p.weight;
  }

  const myTargets = engagement[myId] || {};
  if (Object.keys(myTargets).length === 0) return []; // Cold Start — עוד אין לי פעילות

  // שלב 2: לכל מועמד-מטרה, צובר ניקוד ממשתמשים דומים אליי שהתעניינו בו
  // (ושאני עוד לא התעניינתי בו).
  const scores = {}; // targetId -> ניקוד גולמי
  for (const otherId in engagement) {
    if (Number(otherId) === myId) continue;
    const sim = cosine(myTargets, engagement[otherId]);
    if (sim <= 0) continue;
    for (const targetId in engagement[otherId]) {
      if (Number(targetId) === myId || myTargets[targetId]) continue;
      scores[targetId] =
        (scores[targetId] || 0) + sim * engagement[otherId][targetId];
    }
  }

  // שלב 3: נרמול ל-0-100 (יחסית לגבוה ביותר), מיפוי למשתמשים, מיון.
  const max = Math.max(0, ...Object.values(scores));
  if (max === 0) return [];

  const usersById = new Map(users.map((u) => [String(u.userID), u]));
  return Object.entries(scores)
    .map(([targetId, raw]) => {
      const u = usersById.get(String(targetId));
      if (!u) return null; // לא ברשימת המוצגים (חסום/לא קיים)
      return { ...u, behavioralScore: Math.round((raw / max) * 100) };
    })
    .filter(Boolean)
    .filter((u) => !dismissed.has(u.userID))
    .sort((a, b) => b.behavioralScore - a.behavioralScore);
}

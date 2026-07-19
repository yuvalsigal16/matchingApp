// מנוע "סיבות ההתאמה" בהקשר טיול — מתרגם את ההצלבה בין *העדפות הטיול* של המשתמש
// (TripPreferences + תחומי העניין המבוקשים + דירוג ה-Top-3) לבין נתוני המועמד,
// לשפה אנושית קצרה: "למה המועמד מתאים לטיול הזה".
//
// נפרד בכוונה מ-matchReasons.js (הסיבות ה*כלליות*, אדם-מול-אדם): כאן ההשוואה היא
// מועמד-מול-מה-שביקשתם, המפתחות תואמים לגורמי tripPreferenceScore, ואין שום שינוי
// בלוגיקת ההתאמות הכלליות. אינו משנה ניקוד — שכבת הסבר בלבד.
//
// מחזיר מערך { key, icon, label } — אותו חוזה של buildMatchReasons, לצריכה ישירה
// ע"י רכיב MatchReasons המשותף (icon = שם מתוך המיפוי הקיים ברכיב).

// סף "רמה דומה" (טווח 1-5) — הפרש ≤1, כמו במנוע הכללי.
const LEVEL_CLOSE = 1;

// סדר בסיס להצגה (חום האות): תחומי עניין → קצב → אורח חיים → שבת/כשרות/עישון → גיל.
// דירוג ה-Top-3 של המשתמש עוקף את הסדר הזה (עדיפות מדורגת מוצגת קודם).
const BASE_ORDER = [
  "interests",
  "spontaneity",
  "lifestyle",
  "shabbat",
  "kosher",
  "smoker",
  "age",
];

// תווית קומפקטית לכל גורם — לניסוח "הכי חשוב לכם: X" של העדיפות הראשונה.
const TOP_PRIORITY_LABELS = {
  interests: "תחומי עניין משותפים",
  spontaneity: "קצב טיול מתאים",
  lifestyle: "אורח חיים מתאים",
  age: "בטווח הגילאים",
  kosher: "כשרות",
  shabbat: "שמירת שבת",
  smoker: "ללא עישון",
};

const lower = (list) => (list || []).map((s) => String(s).toLowerCase());

// אוסף את הסיבות ש"נדלקו" — רק אותות חיוביים (התאמה למה שביקשתם), אף פעם לא פערים.
function collectTripReasons(user, pref, prefInterests) {
  const reasons = [];

  // תחומי עניין שביקשתם לטיול ∩ תחומי העניין של המועמד.
  // כל התוויות מנוסחות ללא צורות ממוגדרות (גם לא לוכסן) — "X — כמו שביקשתם"
  // במקום פועל בגוף שלישי. עקבי עם שפת האפליקציה ונמנע מניסוחים חלקיים.
  const wanted = lower(prefInterests);
  const theirs = new Set(lower(user?.interests));
  const shared = wanted.filter((i) => theirs.has(i));
  if (shared.length === 1) {
    // השם המקורי (שומר רישיות/ניקוד עברי), לא ה-lowercase.
    const original =
      (prefInterests || []).find((i) => String(i).toLowerCase() === shared[0]) ||
      shared[0];
    reasons.push({
      key: "interests",
      icon: "Mountain",
      label: `${original} — בדיוק מה שחיפשתם לטיול`,
    });
  } else if (shared.length >= 2) {
    reasons.push({
      key: "interests",
      icon: "Mountain",
      label: `${shared.length} תחומי עניין שחיפשתם לטיול`,
    });
  }

  // קצב/ספונטניות — רמה קרובה (הפרש ≤1), לכן "דומה" ולא "כמו": לא מבטיחים התאמה מלאה.
  if (
    pref?.spontaneityLevel != null &&
    user?.spontaneityLevel != null &&
    Math.abs(pref.spontaneityLevel - user.spontaneityLevel) <= LEVEL_CLOSE
  ) {
    reasons.push({ key: "spontaneity", icon: "Zap", label: "קצב טיול דומה למה שחיפשתם" });
  }

  // אורח חיים — רמה קרובה, אותו עיקרון ("דומה").
  if (
    pref?.lifestyleLevel != null &&
    user?.lifestyleLevel != null &&
    Math.abs(pref.lifestyleLevel - user.lifestyleLevel) <= LEVEL_CLOSE
  ) {
    reasons.push({ key: "lifestyle", icon: "Leaf", label: "סגנון טיול דומה למה שבחרתם" });
  }

  // גיל — בתוך הטווח שהגדרתם.
  if (
    user?.age != null &&
    pref?.preferredAgeMin != null &&
    pref?.preferredAgeMax != null &&
    user.age >= pref.preferredAgeMin &&
    user.age <= pref.preferredAgeMax
  ) {
    reasons.push({ key: "age", icon: "Users", label: "בטווח הגילאים שחיפשתם" });
  }

  // שבת/כשרות/עישון — רק כשההעדפה חיובית והמועמד עונה עליה במדויק,
  // ולכן כאן "כמו שביקשתם" הוא אמת מלאה (התאמה בינארית, לא מקורבת).
  if (pref?.keepsShabbat === true && user?.keepsShabbat === true) {
    reasons.push({ key: "shabbat", icon: "Moon", label: "שמירת שבת — כמו שביקשתם" });
  }
  if (pref?.keepsKosher === true && user?.keepsKosher === true) {
    reasons.push({ key: "kosher", icon: "Utensils", label: "כשרות — כמו שביקשתם" });
  }
  if (pref?.isSmoker === false && user?.isSmoker === false) {
    reasons.push({ key: "smoker", icon: "Wind", label: "ללא עישון — כמו שהעדפתם" });
  }

  // מגדר בכוונה לא מוצג כ"סיבה" — הוא מסנן, לא נקודת-חיבור אנושית.
  return reasons;
}

// מחזיר עד `limit` סיבות: קודם הגורמים שהמשתמש דירג ב-Top-3 (לפי סדר הדירוג),
// אחר כך לפי סדר הבסיס. הסיבה של העדיפות הראשונה מקבלת ניסוח "הכי חשוב לכם: X".
export function getTripMatchReasons(user, pref, prefInterests = [], priorityFactors = [], { limit = 2 } = {}) {
  if (!user || !pref) return [];

  const priorityRank = (key) => {
    const idx = (priorityFactors || []).indexOf(key);
    return idx === -1 ? Infinity : idx;
  };
  const baseRank = (key) => {
    const idx = BASE_ORDER.indexOf(key);
    return idx === -1 ? BASE_ORDER.length : idx;
  };

  const picked = collectTripReasons(user, pref, prefInterests)
    .sort((a, b) => priorityRank(a.key) - priorityRank(b.key) || baseRank(a.key) - baseRank(b.key))
    .slice(0, limit);

  // העדיפות שדירגתם ראשונה — נאמרת במפורש, בניסוח מציע ולא מוחלט
  // ("מתאים למה שחשוב לכם" — המערכת מציעה, לא קובעת מה אתם רוצים).
  return picked.map((r) =>
    r.key === priorityFactors?.[0]
      ? { ...r, label: `מתאים למה שחשוב לכם: ${TOP_PRIORITY_LABELS[r.key] || r.label}` }
      : r,
  );
}

// מנוע "סיבות ההתאמה" — מתרגם את אותות ההתאמה הכלליים (שאלון האונבורדינג, הפרופיל,
// תחומי העניין ותאימות אורח החיים) לשפה אנושית קצרה ("למה כדאי לכם להכיר"),
// בלי לחשוף ציונים ובלי לשכפל את חישוב הניקוד.
//
// המסך הזה נשען על תאימות *כללית* בין משתמשים — לא על העדפות טיול. אין כאן שום שימוש
// ב-TripPreferences; כל האותות מגיעים מנתוני המשתמש הקבועים (גיל, תחומי עניין, שאלון).
//
// עיקרון: לא מציגים שדות גולמיים ("עישון: לא") אלא נקודות-חיבור אנושיות ("שניכם לא מעשנים").
// אות בוליאני (כשרות/שבת/עישון) הופך לסיבה *רק כשהוא חיובי ומשותף* — היעדר תכונה אינו קשר.
//
// שימוש חוזר: מקבל שני משתמשים מועשרים (me, other) ומחזיר מערך { key, icon, label }.
// icon הוא שם אייקון (מחרוזת) כדי לנתק את הלוגיקה מספריית האייקונים — הצרכן ממפה שם→רכיב.
// המפתחות (key) תואמים לאותות האלגוריתם הכללי: interests/age/smoker/kosher/shabbat/spontaneity/lifestyle.

// סף "רמה דומה" בשאלון (טווח 1-5) = הפרש ≤1 (דמיון אמיתי, לא ניקוד חלקי).
const LEVEL_CLOSE = 1;
// סף "גיל דומה" — תואם לניקוד המלא באלגוריתם (הפרש ≤2 שנים).
const AGE_CLOSE = 2;

// סדר החשיבות להצגה: קודם קשרים משמעותיים (תחומי עניין, סגנון טיול, אורח חיים,
// ואז אותות אורח-חיים בוליאניים). גיל הוא אות חלש — מופיע רק כשאין חיבור חזק יותר,
// לכן הוא אחרון ברשימה.
const REASON_ORDER = [
  "interests",
  "spontaneity",
  "lifestyle",
  "shabbat",
  "kosher",
  "smoker",
  "age",
];

const lower = (list) => (list || []).map((s) => String(s).toLowerCase());

// אוסף את כל הסיבות ש"נדלקו" — אות חיובי ומספיק חזק כדי להיאמר בקול אנושי.
function collectReasons(me, other) {
  const reasons = [];

  // תחומי עניין משותפים — הבסיס החם ביותר. שם יחיד → מציגים אותו; כמה → סופרים.
  const mine = new Set(lower(me?.interests));
  const sharedLower = lower(other?.interests).filter((i) => mine.has(i));
  if (sharedLower.length === 1) {
    // מציגים את השם המקורי (לא ה-lowercase) לשמירת ניקוד/רישיות עברית.
    const original =
      (other.interests || []).find(
        (i) => String(i).toLowerCase() === sharedLower[0],
      ) || sharedLower[0];
    // אייקון בגוון "מסע/גילוי" (Mountain) ולא רומנטי (Heart) — זו אפליקציית מטיילים, לא היכרויות.
    reasons.push({ key: "interests", icon: "Mountain", label: `שניכם אוהבים ${original}` });
  } else if (sharedLower.length >= 2) {
    reasons.push({ key: "interests", icon: "Mountain", label: `${sharedLower.length} תחומים משותפים` });
  }

  // קצב/ספונטניות — "קצב טיול דומה" (ניחוח מסע). רק כשהרמות קרובות באמת.
  if (
    me?.spontaneityLevel != null &&
    other?.spontaneityLevel != null &&
    Math.abs(me.spontaneityLevel - other.spontaneityLevel) <= LEVEL_CLOSE
  ) {
    reasons.push({ key: "spontaneity", icon: "Zap", label: "קצב טיול דומה" });
  }

  // אורח חיים — רמות קרובות.
  if (
    me?.lifestyleLevel != null &&
    other?.lifestyleLevel != null &&
    Math.abs(me.lifestyleLevel - other.lifestyleLevel) <= LEVEL_CLOSE
  ) {
    reasons.push({ key: "lifestyle", icon: "Leaf", label: "אורח חיים דומה" });
  }

  // גיל קרוב.
  if (
    me?.age != null &&
    other?.age != null &&
    Math.abs(me.age - other.age) <= AGE_CLOSE
  ) {
    reasons.push({ key: "age", icon: "Users", label: "בגיל דומה" });
  }

  // שבת/כשרות — סיבת חיבור רק כש*שניהם* שומרים ("שניהם לא שומרים" אינו קשר להצגה).
  if (me?.keepsShabbat === true && other?.keepsShabbat === true) {
    reasons.push({ key: "shabbat", icon: "Moon", label: "שומרי שבת" });
  }
  if (me?.keepsKosher === true && other?.keepsKosher === true) {
    reasons.push({ key: "kosher", icon: "Utensils", label: "שומרי כשרות" });
  }

  // עישון — סיבה חיובית רק כששניהם לא מעשנים ("אווירה נטולת עישון").
  if (me?.isSmoker === false && other?.isSmoker === false) {
    reasons.push({ key: "smoker", icon: "Wind", label: "שניכם לא מעשנים" });
  }

  return reasons;
}

// מחזיר עד `limit` סיבות אנושיות, ממוינות לפי חשיבות/חמימות האות.
export function buildMatchReasons(me, other, { limit = 2 } = {}) {
  if (!me || !other) return [];
  const rank = (key) => {
    const d = REASON_ORDER.indexOf(key);
    return d === -1 ? REASON_ORDER.length : d;
  };
  return collectReasons(me, other)
    .sort((a, b) => rank(a.key) - rank(b.key))
    .slice(0, limit);
}

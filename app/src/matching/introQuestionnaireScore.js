// ─────────────────────────────────────────────────────────────────────────────
// אלגוריתם התאמה #1 — שאלון ההיכרות (תאימות כללית בין שני משתמשים).
// כללי: לא תלוי-טיול. משווה גיל, תחומי עניין (Jaccard) ושדות שאלון ההיכרות
// (עישון/כשרות/שבת/ספונטניות/אורח חיים), ומנרמל לאחוז לפי מה שבאמת ניתן היה להשוות.
// חולץ כפי-שהוא מ-matchesForYou (smartMatches) — אותו חישוב בדיוק, לשימוש חוזר.
// משמש: רשימת "ההתאמות שלכם" ומסך פרטי הפרופיל.
// ─────────────────────────────────────────────────────────────────────────────

// משקלים — הניקוד המקסימלי שכל קטגוריה יכולה לתרום. מרוכזים במקום אחד לכוונון קל.
export const INTRO_WEIGHTS = {
  age: 20,
  interests: 30,
  smoker: 10,
  kosher: 10,
  shabbat: 10,
  spontaneity: 15,
  lifestyle: 15,
};

// טווח ערכי הרמות בשאלון (1-5) → הפרש מקסימלי אפשרי הוא 4.
const LEVEL_RANGE = 4;

// מחזיר אחוז 0–100 המנורמל לפי הקטגוריות שבאמת ניתן היה להשוות
// (כך שפרופיל חלקי לא "נענש" על שדות חסרים). null אם חסר אחד הצדדים.
export function computeIntroMatchScore(me, other) {
  if (!me || !other) return null;

  // תחומי העניין שלי (case-insensitive).
  const myInterests = (me.interests || []).map((s) => String(s).toLowerCase());

  let earned = 0; // נקודות שנצברו בפועל
  let maxPossible = 0; // מקסימום נקודות על סמך הקטגוריות שניתן להשוות

  // גיל — קרבה בגילים. נספר רק אם לשניהם יש גיל.
  if (other.age != null && me.age != null) {
    maxPossible += INTRO_WEIGHTS.age;
    const ageDiff = Math.abs(other.age - me.age);
    if (ageDiff <= 2) earned += INTRO_WEIGHTS.age;
    else if (ageDiff <= 5) earned += INTRO_WEIGHTS.age * 0.5;
  }

  // תחומי עניין — דמיון Jaccard (חיתוך חלקי איחוד), יחסי ולא חסום.
  // נספר רק אם לשני הצדדים יש לפחות תחום עניין אחד.
  const theirInterests = (other.interests || []).map((s) => String(s).toLowerCase());
  if (myInterests.length > 0 && theirInterests.length > 0) {
    maxPossible += INTRO_WEIGHTS.interests;
    const mySet = new Set(myInterests);
    const shared = theirInterests.filter((i) => mySet.has(i)).length;
    const union = new Set([...myInterests, ...theirInterests]).size;
    const jaccard = union > 0 ? shared / union : 0;
    earned += jaccard * INTRO_WEIGHTS.interests;
  }

  // שאלון — התאמות בוליאניות. נספרות רק כששני הצדדים ענו.
  if (other.isSmoker != null && me.isSmoker != null) {
    maxPossible += INTRO_WEIGHTS.smoker;
    if (other.isSmoker === me.isSmoker) earned += INTRO_WEIGHTS.smoker;
  }
  if (other.keepsKosher != null && me.keepsKosher != null) {
    maxPossible += INTRO_WEIGHTS.kosher;
    if (other.keepsKosher === me.keepsKosher) earned += INTRO_WEIGHTS.kosher;
  }
  if (other.keepsShabbat != null && me.keepsShabbat != null) {
    maxPossible += INTRO_WEIGHTS.shabbat;
    if (other.keepsShabbat === me.keepsShabbat) earned += INTRO_WEIGHTS.shabbat;
  }

  // רמת ספונטניות (1-5) — ככל שקרוב יותר, ניקוד גבוה יותר (לינארי על הטווח).
  if (other.spontaneityLevel != null && me.spontaneityLevel != null) {
    maxPossible += INTRO_WEIGHTS.spontaneity;
    const diff = Math.abs(other.spontaneityLevel - me.spontaneityLevel);
    earned += INTRO_WEIGHTS.spontaneity * Math.max(0, 1 - diff / LEVEL_RANGE);
  }

  // רמת אורח חיים (1-5) — דומה.
  if (other.lifestyleLevel != null && me.lifestyleLevel != null) {
    maxPossible += INTRO_WEIGHTS.lifestyle;
    const diff = Math.abs(other.lifestyleLevel - me.lifestyleLevel);
    earned += INTRO_WEIGHTS.lifestyle * Math.max(0, 1 - diff / LEVEL_RANGE);
  }

  // נרמול לאחוז על סמך הקטגוריות שבאמת היה אפשר להשוות.
  return maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
}

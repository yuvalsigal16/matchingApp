// ─────────────────────────────────────────────────────────────────────────────
// אלגוריתם התאמה #3 — שאלון העדפות הטיול (מותאם-טיול, עם דירוג חשיבות אישי).
// שונה משאלון ההיכרות: משווה מועמד מול *ההעדפות* של הטיול (מגדר מועדף, טווח גיל,
// תחומי עניין מבוקשים, שאלון), וכל גורם מוכפל במכפיל חשיבות לפי דירוג המשתמש.
// חולץ כפי-שהוא מ-TripMatches (scoreByUser) — אותו חישוב בדיוק.
// ─────────────────────────────────────────────────────────────────────────────

// משקלי בסיס לכל גורם התאמה בטיול.
export const TRIP_WEIGHTS = {
  gender: 25,
  interests: 25,
  age: 20,
  smoker: 10,
  kosher: 10,
  shabbat: 10,
  spontaneity: 15,
  lifestyle: 15,
};
const LEVEL_RANGE = 4; // טווח רמות בשאלון (1-5) → הפרש מקסימלי 4.
const AGE_DECAY = 10; // ריכוך: כמה שנים מחוץ לטווח הגיל עד לניקוד 0.
const PRIORITY_MULTIPLIERS = [2, 1.5, 1.2]; // מכפיל לשלושת הגורמים החשובים ביותר.

// מכפיל החשיבות של גורם לפי מיקומו ברשימת הדירוג האישית (0/1/2 → 2/1.5/1.2, אחרת 1).
function priorityMult(factor, orderedFactors) {
  const idx = orderedFactors.indexOf(factor);
  return idx >= 0 && idx < PRIORITY_MULTIPLIERS.length
    ? PRIORITY_MULTIPLIERS[idx]
    : 1;
}

// מחזיר אחוז 0–100 להתאמת מועמד יחיד להעדפות הטיול.
// user = מועמד, pref = העדפות הטיול, prefInterests = תחומי העניין המבוקשים,
// priorityFactors = מערך גורמים מדורג לפי חשיבות.
export function computeTripPreferenceScore(user, pref, prefInterests = [], priorityFactors = []) {
  if (!pref) return 0;
  const wantedInterests = prefInterests.map((s) => String(s).toLowerCase());

  let earned = 0;
  let maxPossible = 0;
  const add = (factor, baseWeight, fraction) => {
    const w = baseWeight * priorityMult(factor, priorityFactors);
    maxPossible += w;
    earned += w * fraction;
  };

  if (pref.preferredGender) {
    add("gender", TRIP_WEIGHTS.gender, user.gender === pref.preferredGender ? 1 : 0);
  }
  if (
    user.age != null &&
    pref.preferredAgeMin != null &&
    pref.preferredAgeMax != null
  ) {
    let frac;
    if (user.age >= pref.preferredAgeMin && user.age <= pref.preferredAgeMax) {
      frac = 1;
    } else {
      const dist =
        user.age < pref.preferredAgeMin
          ? pref.preferredAgeMin - user.age
          : user.age - pref.preferredAgeMax;
      frac = Math.max(0, 1 - dist / AGE_DECAY);
    }
    add("age", TRIP_WEIGHTS.age, frac);
  }
  if (wantedInterests.length > 0 && user.interests.length > 0) {
    const theirs = new Set(user.interests.map((s) => String(s).toLowerCase()));
    const matched = wantedInterests.filter((i) => theirs.has(i)).length;
    add("interests", TRIP_WEIGHTS.interests, matched / wantedInterests.length);
  }
  if (pref.isSmoker != null && user.isSmoker != null) {
    add("smoker", TRIP_WEIGHTS.smoker, pref.isSmoker === user.isSmoker ? 1 : 0);
  }
  if (pref.keepsKosher != null && user.keepsKosher != null) {
    add("kosher", TRIP_WEIGHTS.kosher, pref.keepsKosher === user.keepsKosher ? 1 : 0);
  }
  if (pref.keepsShabbat != null && user.keepsShabbat != null) {
    add("shabbat", TRIP_WEIGHTS.shabbat, pref.keepsShabbat === user.keepsShabbat ? 1 : 0);
  }
  if (pref.spontaneityLevel != null && user.spontaneityLevel != null) {
    const diff = Math.abs(pref.spontaneityLevel - user.spontaneityLevel);
    add("spontaneity", TRIP_WEIGHTS.spontaneity, Math.max(0, 1 - diff / LEVEL_RANGE));
  }
  if (pref.lifestyleLevel != null && user.lifestyleLevel != null) {
    const diff = Math.abs(pref.lifestyleLevel - user.lifestyleLevel);
    add("lifestyle", TRIP_WEIGHTS.lifestyle, Math.max(0, 1 - diff / LEVEL_RANGE));
  }

  return maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
}

// דירוג חשיבות הגורמים להתאמה — מקור אמת יחיד, משותף לשאלון (PreferencesQuiz)
// ולעדכון-מהפרופיל (UpdateTravelPreferences). אין לשכפל את הרשימה במקום אחר.
//
// ה-key חייב להתאים למפתחות באלגוריתם ההתאמה (TripMatches / tripPreferenceScore)
// ול-CHECK ב-DB. המשתמש בוחר עד MAX_PRIORITIES גורמים לפי הסדר; הראשון = הכי חשוב
// (נשמר כ-PriorityRank=1).
export const PRIORITY_FACTORS = [
  { key: "gender", label: "מגדר הפרטנר" },
  { key: "interests", label: "תחומי עניין משותפים" },
  { key: "age", label: "טווח הגילאים" },
  { key: "smoker", label: "עישון" },
  { key: "kosher", label: "כשרות" },
  { key: "shabbat", label: "שמירת שבת" },
  { key: "spontaneity", label: "רמת ספונטניות" },
  { key: "lifestyle", label: "אורח חיים" },
];

export const MAX_PRIORITIES = 3;

// הוספה/הסרה של גורם מרשימת הדירוג המסודרת — פונקציה טהורה (בלי state).
// זהה בדיוק ללוגיקת togglePriority המקורית בשאלון:
//   • קיים → מוסר.  • לא קיים ומתחת למקסימום → מתווסף בסוף.  • מעל המקסימום → ללא שינוי.
// כשאין שינוי מוחזר *אותו* reference — כדי שהקורא יוכל לדלג על עדכון state מיותר.
export function togglePriorityFactor(list, factorKey) {
  const current = Array.isArray(list) ? list : [];
  if (current.includes(factorKey)) {
    return current.filter((k) => k !== factorKey);
  }
  if (current.length >= MAX_PRIORITIES) return current;
  return [...current, factorKey];
}

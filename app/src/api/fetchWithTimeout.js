// עטיפה דקה סביב fetch שמוסיפה timeout, כדי למנוע המתנה אינסופית כשהשרת
// איטי/מתעורר (cold start ב-Azure) או לא מגיב. drop-in: מחזירה Response בדיוק
// כמו fetch, ולא משנה שום לוגיקה — רק חוסמת המתנה ארוכה מדי.
//
// בעת timeout הבקשה מבוטלת ו-fetch זורק AbortError — שכבת הקריאה הקיימת
// תופסת אותו ב-catch שלה כרגיל (בלי שגיאה טכנית למשתמש, בלי יציאה מהמסך).
//
// ברירת המחדל 20 שניות: מספיק נדיב כדי לאפשר התעוררות שרת, אך חוסם תקיעה.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

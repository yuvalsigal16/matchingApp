// Interceptor גלובלי על fetch — טיפול אחיד ב-401 (טוקן שפג / לא תקין).
// במקום לשכתב כל service בנפרד, עוטפים את global.fetch פעם אחת:
// בכל תשובת 401 (כשיש משתמש מחובר, ולא בבקשת התחברות) מנקים את האימות,
// מציגים הודעה ומחזירים את המשתמש למסך ההתחברות.
import { router } from "expo-router";
import { Alert } from "react-native";
import { clearAuth, getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

let installed = false; // התקנה חד-פעמית
let handling401 = false; // מונע ריבוי התראות על בקשות מקבילות שנכשלו יחד

export function installFetchInterceptor() {
  if (installed) return;
  installed = true;

  const originalFetch = global.fetch;

  global.fetch = async (...args) => {
    // ה-URL של הבקשה (תומך ב-fetch(url, init) — הצורה שבה כל השירותים משתמשים).
    const input = args[0];
    const url = typeof input === "string" ? input : input?.url ?? "";
    const token = getToken();

    // ── הזרקת Authorization מרכזית (שכבת ה-API היחידה שמוסיפה טוקן) ──
    // כל קריאה ל-API שלנו (BASE_URL) מקבלת אוטומטית Bearer, כך שאין צורך
    // לפזר קוד טוקן בכל service. תאימות מלאה: שירות שכבר הוסיף Authorization
    // בעצמו (למשל העלאות multipart) — מכובד ולא נדרס.
    if (token && typeof input === "string" && url.startsWith(BASE_URL)) {
      const init = args[1] || {};
      const headers = new Headers(init.headers || {});
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
        args = [input, { ...init, headers }];
      }
    }

    const res = await originalFetch(...args);

    // 401 בבקשות התחברות/הרשמה = פרטים שגויים, לא טוקן שפג — לא לטפל
    const isAuthEndpoint = /\/User\/(login|register)/i.test(url);

    if (res.status === 401 && !isAuthEndpoint && token && !handling401) {
      handling401 = true;
      try {
        await clearAuth();
        Alert.alert("ההתחברות פגה", "מטעמי אבטחה יש להתחבר מחדש.");
        router.replace("/Login");
      } finally {
        // איפוס אחרי השהייה קצרה, כדי לא להציג כמה התראות על מספר בקשות מקבילות
        setTimeout(() => {
          handling401 = false;
        }, 1000);
      }
    }

    return res;
  };
}

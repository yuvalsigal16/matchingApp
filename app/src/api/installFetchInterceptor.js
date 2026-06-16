// Interceptor גלובלי על fetch — טיפול אחיד ב-401 (טוקן שפג / לא תקין).
// במקום לשכתב כל service בנפרד, עוטפים את global.fetch פעם אחת:
// בכל תשובת 401 (כשיש משתמש מחובר, ולא בבקשת התחברות) מנקים את האימות,
// מציגים הודעה ומחזירים את המשתמש למסך ההתחברות.
import { router } from "expo-router";
import { Alert } from "react-native";
import { clearAuth, getToken } from "../auth/authStore";

let installed = false; // התקנה חד-פעמית
let handling401 = false; // מונע ריבוי התראות על בקשות מקבילות שנכשלו יחד

export function installFetchInterceptor() {
  if (installed) return;
  installed = true;

  const originalFetch = global.fetch;

  global.fetch = async (...args) => {
    const res = await originalFetch(...args);

    const url = typeof args[0] === "string" ? args[0] : args[0]?.url ?? "";
    // 401 בבקשות התחברות/הרשמה = פרטים שגויים, לא טוקן שפג — לא לטפל
    const isAuthEndpoint = /\/User\/(login|register|google-login)/i.test(url);

    if (res.status === 401 && !isAuthEndpoint && getToken() && !handling401) {
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

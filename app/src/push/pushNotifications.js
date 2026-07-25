// רישום למכשיר ל-Expo Push Notifications + שמירת ה-token בשרת.
// קוראים לזה פעם אחת אחרי login.
//
// דרישות התקנה (פעם אחת):
//   npx expo install expo-notifications expo-device

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { saveExpoPushToken } from "../api/notificationService";

// כשמגיעה התראה והאפליקציה פתוחה - להציג אותה גם בכניסה הקדמית
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// רושם את המכשיר ושומר את ה-token בשרת.
// בטוח לקרוא לזה כמה פעמים — אם כבר רשום, פשוט יחזיר את אותו token.
export async function registerForPushNotifications(userId) {
  try {
    if (!Device.isDevice) {
      console.log("[push] מכשיר אמולטור - מדלגים על Push");
      return null;
    }

    // הרשאה
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("[push] המשתמש לא אישר הרשאה");
      return null;
    }

    // ערוץ נוטיפיקציות לאנדרואיד (חובה ב-Android 8+)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // קבלת ה-token מ-Expo. מעבירים projectId מפורש (מ-app.json) — נדרש ב-dev-client/EAS,
    // אחרת getExpoPushTokenAsync עלול להיכשל ב-"No projectId found".
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenObj = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenObj?.data;
    if (!token) return null;

    // שמירה בשרת — בודקים את התוצאה כדי לא להיכשל בשקט מוחלט.
    const saved = await saveExpoPushToken(userId, token);
    if (!saved) {
      console.warn("[push] שמירת ה-token בשרת נכשלה (תשובה לא תקינה)");
      return null;
    }
    console.log("[push] token נשמר בשרת:", token.slice(0, 25) + "...");
    return token;
  } catch (err) {
    console.warn("[push] שגיאה ברישום ל-push:", err.message);
    return null;
  }
}

// מיפוי סוג-התראה → מסך יעד. מקור-אמת יחיד לניווט בעקבות לחיצה על Push,
// כדי שה-listener החי (background/foreground) וה-cold-start (killed) ינווטו
// לאותו מקום. מחזיר null לסוג לא-מוכר (לא מנווטים).
export function pushRouteForType(type, relatedID) {
  switch (type) {
    case "RequestReceived":
      return "/matchesForYou";
    case "RequestApproved":
      return "/activeChats";
    case "RequestRejected":
      return "/requestStatus";
    case "NewMessage":
      // relatedID = MatchID → פותח את הצ'אט הספציפי; fallback לרשימת הצ'אטים.
      return relatedID != null ? `/chat/${relatedID}` : "/activeChats";
    case "TripLinkRequest":
      // relatedID = RequestID → מסך האישור.
      return relatedID != null ? `/trip-link/${relatedID}` : null;
    case "TripLinkApproved":
    case "TripLinkRejected":
      // relatedID = MatchID → הצ'אט (שהפך/נשאר).
      return relatedID != null ? `/chat/${relatedID}` : "/activeChats";
    default:
      return null;
  }
}

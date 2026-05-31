// רישום למכשיר ל-Expo Push Notifications + שמירת ה-token בשרת.
// קוראים לזה פעם אחת אחרי login.
//
// דרישות התקנה (פעם אחת):
//   npx expo install expo-notifications expo-device

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

    // קבלת ה-token מ-Expo
    const tokenObj = await Notifications.getExpoPushTokenAsync();
    const token = tokenObj?.data;
    if (!token) return null;

    // שמירה בשרת
    await saveExpoPushToken(userId, token);
    console.log("[push] token נשמר בשרת:", token.slice(0, 25) + "...");
    return token;
  } catch (err) {
    console.warn("[push] שגיאה ברישום ל-push:", err.message);
    return null;
  }
}

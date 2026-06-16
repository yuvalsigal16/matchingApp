// שמירת token ו-user באופן קבוע על המכשיר באמצעות SecureStore.
// SecureStore = אחסון מוצפן של אנדרואיד/iOS - הנתונים נשארים גם אחרי סגירת האפליקציה.
//
// השמירה בזיכרון (let _token, let _user) נשמרת כדי שקריאות סינכרוניות
// כמו getToken()/getUser() ימשיכו לעבוד מיד בלי await.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

let _token = null;
let _user = null;

// שמירת אימות אחרי login/register. שומר גם בזיכרון וגם ב-SecureStore.
export async function setAuth(token, user) {
  _token = token;
  _user = user;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn("[auth] שמירת אימות נכשלה:", err.message);
  }
}

export function getToken() {
  return _token;
}

export function getUser() {
  return _user;
}

// טעינת האימות מ-SecureStore לזיכרון. נקרא פעם אחת בעליית האפליקציה.
export async function loadAuth() {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userStr = await SecureStore.getItemAsync(USER_KEY);
    if (token && userStr) {
      _token = token;
      _user = JSON.parse(userStr);
    }
  } catch (err) {
    console.warn("[auth] טעינת אימות נכשלה:", err.message);
  }
}

// איפוס אימות - logout. מנקה גם מהזיכרון וגם מהמכשיר.
export async function clearAuth() {
  _token = null;
  _user = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    // מנקים גם את הפרטים השמורים, אחרת ה-auto-login במסך הכניסה יחבר מחדש
    await AsyncStorage.multiRemove(["saved_email", "saved_password"]);
  } catch (err) {
    console.warn("[auth] מחיקת אימות נכשלה:", err.message);
  }
}

// מחזיר headers מוכנים לקריאות API מוגנות
export function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${_token}`,
  };
}

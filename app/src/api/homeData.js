// שכבת נתוני-אתחול ל-Home. אחריות בלבד: טעינת נתונים, מטמון, prefetch,
// warm-startup, snapshot ו-SWR. אין כאן לוגיקת UI, ניווט, alerts/toasts,
// hooks של React או אנימציות — זו שכבת נתונים טהורה.
//
// למה זה קיים:
// 1) חימום (warmStartup) — מפעילים את קריאות ה-Home כבר בזמן אנימציית ה-Splash,
//    כך שהמידע (וגם התעוררות שרת Azure מ-cold start) מתחיל לזרום לפני הניווט.
// 2) מטמון-ראשון (stale-while-revalidate) — שומרים תמונת-מצב אחרונה טובה ומציגים
//    אותה מיד, ומרעננים ברקע. משתמש חוזר רואה Home אמיתי ואינטראקטיבי בפריים הראשון.
// 3) לכל מקטע timeout משלו וכשל שקט — אף קריאה בודדת לא חוסמת את המסך.
// 4) timeout/שגיאה לא נחשבים "אין נתונים" — שומרים את המצב הקודם.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { getToken, getUser } from "../auth/authStore";
import { BASE_URL } from "./config";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { getMyMatchesStrict } from "./notificationService";

// 20s chosen because Azure Free cold starts are typically below this threshold
// while avoiding indefinite UI waiting — לא מספר שרירותי: מעל התעוררות טיפוסית
// של Azure Free, ומתחת להמתנה אינסופית. המקטע ממילא לא חוסם שום דבר אחר, לכן
// אפשר להיות סבלניים עד שהשרת מתעורר בלי לתקוע UI.
const STARTUP_TIMEOUT = 20000;

const cacheKey = (userId) => `home_snapshot_v1_${userId}`;

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

// ───────────────────────── תמונת-מצב אחרונה (SWR) ─────────────────────────
// { userId, matches: [...], trips: [...], profile: { firstName, profileImage, needsQuiz } }
let _snapshot = null;
let _diskLoadedFor = null;

// גישה סינכרונית — Home קורא לזה במאונט כדי לרנדר תוכן מהמטמון מיד.
export function getSnapshot(userId) {
  return _snapshot && _snapshot.userId === userId ? _snapshot : null;
}

async function loadSnapshotFromDisk(userId) {
  if (_diskLoadedFor === userId) return getSnapshot(userId);
  _diskLoadedFor = userId;
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.userId === userId) _snapshot = parsed;
    }
  } catch {
    // מטמון פגום/חסר — פשוט טוענים מהרשת.
  }
  return getSnapshot(userId);
}

function updateSnapshot(userId, patch) {
  const base = _snapshot && _snapshot.userId === userId ? _snapshot : { userId };
  _snapshot = { ...base, userId, ...patch };
  AsyncStorage.setItem(cacheKey(userId), JSON.stringify(_snapshot)).catch(() => {});
}

// ───────────────────────── שולפי-מקטע (כל אחד זורק בכשל) ─────────────────────────
// זריקה (ולא החזרת []/null) מאפשרת ל-Home להבחין בין "אין נתונים" ל"נכשל" ולשמר מצב.

async function fetchMatches(userId) {
  const matches = await getMyMatchesStrict(userId); // timeboxed; זורק ב-timeout/שגיאה
  updateSnapshot(userId, { matches });
  return matches;
}

async function fetchTrips(userId) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/Trip/user/${userId}`,
    { method: "GET", headers: authHeaders() },
    STARTUP_TIMEOUT
  );
  if (!res.ok) throw new Error(`Trip ${res.status}`);
  const trips = (await res.json()) || [];
  updateSnapshot(userId, { trips });
  return trips;
}

async function fetchProfile(userId) {
  // פרופיל + שאלון יחד. את התמונה לוקחים מהפרופיל עצמו — בלי הקריאה הכפולה
  // הישנה ל-/UserProfile/image (אותו נתיב, buildImageUri מטפל בשניהם).
  const [pRes, qRes] = await Promise.allSettled([
    fetchWithTimeout(`${BASE_URL}/UserProfile/${userId}`, { method: "GET", headers: authHeaders() }, STARTUP_TIMEOUT),
    fetchWithTimeout(`${BASE_URL}/Questionnaire/${userId}`, { method: "GET", headers: authHeaders() }, STARTUP_TIMEOUT),
  ]);

  // אם בקשת הפרופיל עצמה נפלה (רשת/timeout) — זורקים כדי לשמר את המצב הקודם.
  if (pRes.status !== "fulfilled") throw new Error("profile network error");

  const pOk = pRes.value?.ok;
  let firstName;
  let profileImage;
  if (pOk) {
    const d = await pRes.value.json();
    firstName = d.firstName || d.FirstName || "";
    profileImage = d.profileImage || d.ProfileImage || "";
  }

  // needsQuiz נקבע רק אם באמת הגענו לנקודת-הקצה של השאלון; אחרת נשאר "לא ידוע"
  // (undefined) כדי לא להבהב/להסתיר את הבאנר בגלל עיכוב רשת רגעי.
  const needsQuiz = qRes.status === "fulfilled" ? !pOk || !qRes.value?.ok : undefined;

  const prev = getSnapshot(userId)?.profile || {};
  const profile = {
    firstName: firstName !== undefined ? firstName : prev.firstName,
    profileImage: profileImage !== undefined ? profileImage : prev.profileImage,
    needsQuiz: needsQuiz !== undefined ? needsQuiz : prev.needsQuiz,
  };
  updateSnapshot(userId, { profile });
  return profile;
}

// ───────────────────────── חימום בזמן ה-Splash ─────────────────────────
// מחזיק את ההבטחות של הריצה הנוכחית כדי ש-Home יצרוך אותן במקום לפתוח כפילות.
let _inflight = null; // { userId, matches, trips, profile }

// מונע אזהרת unhandled-rejection על הבטחה שממתינה לצריכה ב-Home.
function track(p) {
  p.catch(() => {});
  return p;
}

// נקרא מ-Splash. בטוח לקרוא כשאין משתמש מחובר (no-op).
export function warmStartup() {
  const userId = getUser()?.userID;
  if (!userId || !getToken()) return;
  if (_inflight && _inflight.userId === userId) return; // כבר מחומם בריצה הזו

  loadSnapshotFromDisk(userId); // כדי ש-getSnapshot יחזיר תוכן מיד כשנגיע ל-Home

  _inflight = {
    userId,
    matches: track(fetchMatches(userId)),
    trips: track(fetchTrips(userId)),
    profile: track(fetchProfile(userId)),
  };
}

// שליפה חד-פעמית של ההבטחה המחוממת (אם קיימת) — המאונט הראשון של Home צורך
// את הבקשה שכבר רצה; מאונטים הבאים (חזרה למסך) מרעננים מחדש.
function takeInflight(userId, key) {
  if (_inflight && _inflight.userId === userId && _inflight[key]) {
    const p = _inflight[key];
    _inflight[key] = null;
    return p;
  }
  return null;
}

export function loadMatches(userId) {
  return takeInflight(userId, "matches") || fetchMatches(userId);
}

export function loadTrips(userId) {
  return takeInflight(userId, "trips") || fetchTrips(userId);
}

export function loadProfile(userId) {
  return takeInflight(userId, "profile") || fetchProfile(userId);
}

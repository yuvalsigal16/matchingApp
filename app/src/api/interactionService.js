import { getUser } from "../auth/authStore";
import { BASE_URL } from "./config";

// ── שירות אינטראקציות — הבסיס למנוע ההתנהגותי (סינון שיתופי) ──
// מתעד "מי התעניין במי" (צפייה/לייק/בקשה) ושולף את הזוגות לחישוב בקליינט.

// רושם אינטראקציה של המשתמש המחובר כלפי משתמש אחר.
// "fire and forget" — לא חוסם את ה-UI ולא זורק שגיאה אם נכשל.
export async function logInteraction(toUserId, type = "View") {
  const me = getUser();
  if (!me?.userID || !toUserId || me.userID === toUserId) return;

  const url = `${BASE_URL}/UserProfileInteractions?fromUserID=${me.userID}&toUserID=${toUserId}&interactionType=${encodeURIComponent(type)}`;
  try {
    await fetch(url, { method: "POST" });
  } catch (err) {
    console.log("[interaction] log failed (ignored):", err?.message);
  }
}

// מחזיר את כל זוגות ההתעניינות עם משקל: [{ fromUserID, toUserID, weight }].
// המנוע ההתנהגותי בקליינט מחשב מזה דמיון בין משתמשים.
export async function getEngagementPairs() {
  const url = `${BASE_URL}/UserProfileInteractions/pairs`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log("[interaction] getEngagementPairs failed:", err?.message);
    return [];
  }
}

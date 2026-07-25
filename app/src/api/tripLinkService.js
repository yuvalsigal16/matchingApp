import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

// שירות בקשות קישור-טיול (הפיכת התאמה כללית לשותפות טיול, בהסכמת הצד השני).
// עוקב אחר דפוס notificationService: authHeaders + fetch + בדיקת res.ok + זריקת הודעת השרת.
// אין כאן state/navigation — שכבת API בלבד.

// בונה headers (טוקן + Content-Type) לכל הקריאות — זהה לשאר השירותים.
function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// GET — פרטי בקשה בודדת (למסך האישור). רק המאשר רשאי; אחרת השרת מחזיר 403/404.
// מחזיר { requestID, matchID, tripID, requestedByUserID, status, createdAt }.
export async function getTripLink(requestId) {
  const res = await fetch(`${BASE_URL}/TripLinkRequest/${requestId}`, {
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || text; } catch {}
    throw new Error(msg || `שגיאה ${res.status} בטעינת הבקשה`);
  }
  return JSON.parse(text);
}

// CREATE — משתמש שולח בקשה להפוך את השיחה לטיול משותף.
// השרת משתמש ב-query params (לא body), עקבי עם sendChatRequest. מחזיר { requestID }.
export async function sendTripLinkRequest(matchId, tripId) {
  const res = await fetch(
    `${BASE_URL}/TripLinkRequest?matchID=${matchId}&tripID=${tripId}`,
    { method: "POST", headers: authHeaders() },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "שליחת הבקשה נכשלה");
  }
  return await res.json(); // { requestID }
}

// APPROVE — הצד השני מאשר. השרת מעדכן את Matches.TripID ושולח התראה למבקש.
// מחזיר { matchID, tripID }.
export async function approveTripLink(requestId) {
  const res = await fetch(`${BASE_URL}/TripLinkRequest/approve/${requestId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || text; } catch {}
    throw new Error(msg || `שגיאה ${res.status} באישור הבקשה`);
  }
  try { return JSON.parse(text); } catch { return null; } // { matchID, tripID }
}

// REJECT — הצד השני דוחה. TripID נשאר NULL. השרת מחזיר את המחרוזת "Rejected".
export async function rejectTripLink(requestId) {
  const res = await fetch(`${BASE_URL}/TripLinkRequest/reject/${requestId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || text; } catch {}
    throw new Error(msg || `שגיאה ${res.status} בדחיית הבקשה`);
  }
  // השרת מחזיר "Rejected" (מחרוזת) — לא עוטפים. מחזירים כמות שהוא.
  try { return JSON.parse(text); } catch { return text; }
}

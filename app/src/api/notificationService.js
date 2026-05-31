import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

// בונה את ה-headers (טוקן + Content-Type) לכל הקריאות
function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// משיכת בקשות ההתאמה הממתינות של המשתמש (גם נכנסות וגם יוצאות)
export async function getPendingRequests(userId) {
  try {
    const res = await fetch(`${BASE_URL}/MatchRequest/pending/${userId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("getPendingRequests:", err);
    return [];
  }
}

// משיכת ההתאמות (Matches) הפעילות של המשתמש — אלו הצ'אטים הפעילים
export async function getMyMatches(userId) {
  try {
    const res = await fetch(`${BASE_URL}/Match/user/${userId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("getMyMatches:", err);
    return [];
  }
}

// ביטול בקשה ששלחתי
export async function cancelRequest(requestId) {
  const res = await fetch(`${BASE_URL}/MatchRequest/cancel/${requestId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return res.ok;
}

// דחייה של בקשה שקיבלתי
export async function rejectRequest(requestId) {
  const res = await fetch(`${BASE_URL}/MatchRequest/reject/${requestId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return res.ok;
}

// שליחת בקשת צ'אט חופשית (בלי טיול ספציפי).
// השרת יוצר MatchRequest + התראה לנמען אוטומטית.
export async function sendChatRequest(fromUserId, toUserId) {
  const url = `${BASE_URL}/MatchRequest?fromUserID=${fromUserId}&toUserID=${toUserId}`;
  const res = await fetch(url, { method: "POST", headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "שליחת הבקשה נכשלה");
  }
  return await res.json(); // RequestID
}

// אישור בקשה שקיבלתי. השרת יוצר Match + התראה לשולח, מחזיר { matchID }.
export async function approveRequest(requestId) {
  const res = await fetch(`${BASE_URL}/MatchRequest/approve/${requestId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

// שולף את ההתראות של המשתמש (Notifications)
export async function getNotifications(userId) {
  try {
    const res = await fetch(`${BASE_URL}/Notification/${userId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("getNotifications:", err);
    return [];
  }
}

// סימון התראה כנקראה
export async function markNotificationRead(notificationId) {
  const res = await fetch(`${BASE_URL}/Notification/read/${notificationId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return res.ok;
}

// שולח את ה-Expo Push Token לשרת לטובת push notifications
export async function saveExpoPushToken(userId, token) {
  const res = await fetch(`${BASE_URL}/User/pushToken`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ UserID: userId, Token: token }),
  });
  return res.ok;
}

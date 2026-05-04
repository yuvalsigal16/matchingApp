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

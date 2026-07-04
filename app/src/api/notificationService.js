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

// משיכת ההתאמות הפעילות (הצ'אטים) של המשתמש, מועשרות בשם/תמונה/הודעה אחרונה.
// משתמשים ב-MatchDetails (ולא ב-/Match/user) כי הוא מחזיר את כל מה שרשימת צ'אטים צריכה,
// וגם תומך כעת בהתאמות בלי טיול (אחרי תיקון ה-LEFT JOIN בשרת).
export async function getMyMatches(userId) {
  try {
    const res = await fetch(`${BASE_URL}/MatchDetails/user/${userId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];

    const list = (await res.json()) || [];
    return list.map((m) => {
      const iAmUser1 = m.user1ID === userId;
      const otherName = (
        iAmUser1
          ? [m.user2FirstName, m.user2LastName]
          : [m.user1FirstName, m.user1LastName]
      )
        .filter(Boolean)
        .join(" ")
        .trim();

      // השרת מחזיר זמן UTC בלי סימון אזור-זמן → מוסיפים "Z" כדי שיוצג נכון מקומית.
      const lastTime = m.lastMessageTime
        ? (/[zZ]|[+-]\d{2}:?\d{2}$/.test(m.lastMessageTime)
            ? m.lastMessageTime
            : `${m.lastMessageTime}Z`)
        : null;

      return {
        matchID: m.matchID,
        chatID: m.chatID, // נדרש לספירת הודעות שלא נקראו בצד הלקוח
        status: m.matchStatus,
        otherUserID: iAmUser1 ? m.user2ID : m.user1ID,
        otherUserName: otherName || "משתמש",
        otherUserImage: iAmUser1 ? m.user2Image : m.user1Image,
        tripName: m.destination, // עשוי להיות null בצ'אט בלי טיול
        lastMessage: m.lastMessage,
        lastMessageTime: lastTime,
      };
    });
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

// אישור בקשה שקיבלתי. השרת יוצר Match + MatchChat + התראה לשולח, מחזיר { matchID }.
// במקום לבלוע שגיאה בשקט (שגרם ל"כלום לא קורה") — זורקים את הודעת השרת.
export async function approveRequest(requestId) {
  const res = await fetch(`${BASE_URL}/MatchRequest/approve/${requestId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || text; } catch {}
    throw new Error(msg || `שגיאה ${res.status} באישור הבקשה`);
  }
  try { return JSON.parse(text); } catch { return null; }
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

import { BASE_URL } from "./config";
import { getToken } from "../auth/authStore";

// שירות לצ'אט הקבוצתי של קהילה — עוטף את ה-endpoints הקיימים בשרת:
//   GET  /CommunityChat/{communityID}      → מחזיר את הצ'אט (communityChatID)
//   GET  /CommunityChat/messages/{chatID}  → הודעות הצ'אט (404 = אין הודעות)
//   POST /CommunityChat/send               → שליחת הודעה
// אין שינוי בשרת — רק שימוש.

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// השרת מאחסן זמן ב-UTC אך מחזיר ללא סימון אזור-זמן.
// בלי הוספת "Z", JS מפרש כזמן מקומי → סטייה של שעות.
function toUtcIso(s) {
  if (!s) return s;
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
}

// שליפת הצ'אט של הקהילה (כדי לקבל את ה-chatID). מחזיר { communityChatID, ... }.
export async function getCommunityChat(communityID) {
  const res = await fetch(`${BASE_URL}/CommunityChat/${communityID}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("community chat load failed");
  return res.json();
}

// שליפת הודעות לפי chatID, ממופות לפורמט שהמסך מצפה לו.
// 404 = אין עדיין הודעות → מחזירים [] (לא שגיאה).
export async function getCommunityMessages(chatID) {
  if (!chatID) return [];

  const res = await fetch(`${BASE_URL}/CommunityChat/messages/${chatID}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error("community messages load failed");

  const raw = (await res.json()) || [];
  return raw
    .map((m) => ({
      messageID: m.communityMessageID,
      senderID: m.senderUserID,
      text: m.content,
      sentAt: toUtcIso(m.sentAt),
    }))
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt)); // ישן→חדש (ביטחון)
}

// חברי הקהילה (קריאה אחת) — כדי לבנות מפת userID → שם מלא.
// מחזיר [{ userID, firstName, lastName, email, profileImage, joinedAt }].
export async function getCommunityMembers(communityID) {
  const res = await fetch(`${BASE_URL}/CommunityMember/${communityID}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return (await res.json()) || [];
}

// עזיבת קהילה — מוחק את החברות דרך ה-endpoint הקיים (DELETE /CommunityMember).
// השרת מאמת שה-userID תואם למשתמש שבטוקן (אפשר לעזוב רק בשם עצמך).
export async function leaveCommunity(communityID, userID) {
  const res = await fetch(
    `${BASE_URL}/CommunityMember?communityID=${communityID}&userID=${userID}`,
    { method: "DELETE", headers: authHeaders() },
  );
  if (!res.ok) throw new Error("leave failed");
  return true;
}

// שליחת הודעה לקהילה. השרת מחזיר { MessageID, Status }.
export async function sendCommunityMessage(chatID, senderID, content) {
  const res = await fetch(`${BASE_URL}/CommunityChat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      communityChatID: chatID,
      senderUserID: senderID,
      content,
    }),
  });
  if (!res.ok) throw new Error("send failed");
  return res.json().catch(() => null);
}

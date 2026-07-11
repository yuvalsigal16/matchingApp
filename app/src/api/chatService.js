import { BASE_URL } from "./config";
import { getToken, getUser } from "../auth/authStore";

// כל הקריאות כאן מותאמות ל-API האמיתי בשרת:
//   api/MatchDetails/user/{userId}  — התאמות מועשרות (שמות, יעד, chatID, סטטוס)
//   api/MatchChat/{matchID}         — הצ'אט של התאמה
//   api/MatchChat/messages/{chatID} — הודעות הצ'אט
//   api/MatchChat/send              — שליחת הודעה
// בעבר הקובץ פנה ל-/matches/* ו-/Messages/* שלא קיימים בשרת.

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* =========================
   MATCH DETAILS
========================= */

// פרטי התאמה לכותרת הצ'אט: שם הצד השני, יעד+תאריכי הטיול, chatID וסטטוס.
// אין endpoint "match by id" בשרת — לכן מושכים את כל ההתאמות של המשתמש המחובר
// (MatchDetails/user) ומסננים לפי matchId.
export const getMatchById = async (matchId) => {
  const me = getUser();

  // ניסיון ראשון: פרטים מלאים מ-MatchDetails (שם הצד השני, יעד, תאריכים).
  try {
    const res = await fetch(`${BASE_URL}/MatchDetails/user/${me?.userID}`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      const list = (await res.json()) || [];
      const m = list.find((d) => String(d.matchID) === String(matchId));
      if (m) {
        const iAmUser1 = m.user1ID === me?.userID;
        const otherName = (
          iAmUser1
            ? [m.user2FirstName, m.user2LastName]
            : [m.user1FirstName, m.user1LastName]
        )
          .filter(Boolean)
          .join(" ")
          .trim();

        return {
          matchID: m.matchID,
          chatID: m.chatID,
          tripID: m.tripID, // נדרש למעבר מהצ'אט ל-TripPlanner/ToDo במסך "יוצאים לדרך"
          otherUserID: iAmUser1 ? m.user2ID : m.user1ID,
          otherUserName: otherName || "משתמש",
          otherUserImage: iAmUser1 ? m.user2Image : m.user1Image,
          tripName: m.destination || "טיול",
          tripStartDate: m.startDate,
          tripEndDate: m.endDate,
          matchingStatus: m.matchStatus || "none",
        };
      }
    }
  } catch {
    // ממשיכים לנפילה-לאחור
  }

  // נפילה-לאחור: התאמה חדשה עדיין לא מופיעה ב-MatchDetails, או שחסר שדה.
  // לפחות נשיג את ה-chatID ישירות (ה-SP יוצר שורת MatchChat בעת האישור),
  // כך שהצ'אט ייפתח ויאפשר שליחת/קבלת הודעות.
  const chatRes = await fetch(`${BASE_URL}/MatchChat/${matchId}`, {
    headers: authHeaders(),
  });
  if (!chatRes.ok) throw new Error("Failed to fetch match");
  const chat = await chatRes.json();
  return {
    matchID: Number(matchId),
    chatID: chat?.chatID,
    otherUserName: "צ'אט",
    tripName: "טיול",
    matchingStatus: "none",
  };
};

// סימון "יצאנו לדרך" — נשמר בשרת על ה-Match (JourneyStarted=1), עקבי בין מכשירים.
export const markJourneyStarted = async (matchId) => {
  const res = await fetch(`${BASE_URL}/Match/journey/${matchId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return res.ok;
};

// התאמות של המשתמש לטיול מסוים (תצוגה ב-TripDetails).
// אין endpoint matches-by-trip — מסננים מתוך ההתאמות של המשתמש לפי tripID.
export const getMatchesByTrip = async (tripId) => {
  const me = getUser();

  const res = await fetch(`${BASE_URL}/MatchDetails/user/${me?.userID}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];

  const list = (await res.json()) || [];
  return list
    .filter((m) => String(m.tripID) === String(tripId))
    .map((m) => {
      const iAmUser1 = m.user1ID === me?.userID;
      const name = (
        iAmUser1
          ? [m.user2FirstName, m.user2LastName]
          : [m.user1FirstName, m.user1LastName]
      )
        .filter(Boolean)
        .join(" ")
        .trim();
      return {
        matchID: m.matchID,
        userId: iAmUser1 ? m.user2ID : m.user1ID,
        name: name || "משתמש",
      };
    });
};

/* =========================
   CHAT MESSAGES
========================= */

// הודעות הצ'אט לפי chatID, ממופות לשמות השדות שהמסך מצפה להם
// (השרת מחזיר Content/SenderUserID; המסך עובד עם text/senderID).
export const getChatMessages = async (chatId) => {
  if (!chatId) return [];

  const res = await fetch(`${BASE_URL}/MatchChat/messages/${chatId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return []; // 404 = אין עדיין הודעות

  const raw = (await res.json()) || [];
  return raw.map((m) => ({
    messageID: m.messageID,
    text: m.content,
    senderID: m.senderUserID,
    sentAt: toUtcIso(m.sentAt),
  }));
};

// השרת מאחסן זמן ב-UTC אך מחזיר אותו בלי סימון אזור-זמן.
// בלי הוספת "Z", JS מפרש את המחרוזת כזמן מקומי → טעות של כמה שעות.
function toUtcIso(s) {
  if (!s) return s;
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
}

// שליחת הודעה. השרת מחזיר את ה-MessageID החדש (int).
// מחזירים אובייקט בפורמט שהמסך מוסיף ישירות לרשימה.
export const sendChatMessage = async (chatId, text, senderId) => {
  const res = await fetch(`${BASE_URL}/MatchChat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      ChatID: chatId,
      SenderUserID: senderId,
      Content: text,
    }),
  });
  if (!res.ok) throw new Error("Failed to send message");

  const result = await res.json().catch(() => null);
  const newId = typeof result === "number" ? result : Date.now();
  return {
    messageID: newId,
    text,
    senderID: senderId,
    sentAt: new Date().toISOString(),
  };
};

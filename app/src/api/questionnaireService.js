import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

// helper פנימי: ניסיון לפרסר JSON, נפילה לטקסט גולמי אם השרת מחזיר plain text.
function safeParse(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// מחזיר את השאלון של המשתמש (GET /api/Questionnaire/{userId}).
// 404 → null (אין שאלון).
export async function getQuestionnaire(userId) {
  const url = `${BASE_URL}/Questionnaire/${userId}`;
  console.log(`[questionnaire] → GET ${url}`);

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[questionnaire] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  console.log(`[questionnaire] ← ${res.status} ${res.statusText}`);
  if (res.status === 404) return null;

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text);
}

// מעדכן שאלון קיים (PUT /api/Questionnaire).
// q = אובייקט שאלון מלא הכולל QuestionnaireID + UserID + שאר השדות.
export async function updateQuestionnaire(q) {
  const url = `${BASE_URL}/Questionnaire`;
  console.log(`[questionnaire] → PUT ${url}`, q);

  let res;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q),
    });
  } catch (networkErr) {
    console.error(`[questionnaire] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[questionnaire] ← ${res.status}`, text);

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} בעדכון שאלון`);
  }
  return safeParse(text);
}

// יוצר שאלון חדש ב-Questionnaire. UNIQUE על UserID — אחד למשתמש.
// q = { UserID, IsSmoker, KeepsKosher, KeepsShabbat, SpontaneityLevel, LifestyleLevel, SocialNetworks }
export async function createQuestionnaire(q) {
  const url = `${BASE_URL}/Questionnaire`;
  console.log(`[questionnaire] → POST ${url}`, q);

  let res;
  try {
    // שליחת נתוני השאלון בשיטת POST תוך המרת האובייקט לפורמט טקסט JSON
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q),
    });
  } catch (networkErr) {
    console.error(`[questionnaire] ✖ network error:`, networkErr);
    throw new Error(
      `לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`,
    );
  }

  console.log(`[questionnaire] ← ${res.status} ${res.statusText}`);

  const text = await res.text();
  // בדיקת תקינות התשובה מהשרת וחילוץ הודעת שגיאה במידה והפעולה נכשלה
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.message || msg;
    } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  // המרת התשובה הסופית מהשרת חזרה לאובייקט לצורך אישור הצלחת הפעולה
  return text ? JSON.parse(text) : null;
}

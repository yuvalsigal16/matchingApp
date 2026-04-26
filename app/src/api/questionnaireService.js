import { BASE_URL } from "./config";

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

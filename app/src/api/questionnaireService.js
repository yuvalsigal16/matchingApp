import { BASE_URL } from "./config";

// יוצר שאלון חדש ב-Questionnaire. UNIQUE על UserID — אחד למשתמש.
// q = { UserID, IsSmoker, KeepsKosher, KeepsShabbat, SpontaneityLevel, LifestyleLevel, SocialNetworks }
export async function createQuestionnaire(q) {
  const url = `${BASE_URL}/Questionnaire`;
  console.log(`[questionnaire] → POST ${url}`, q);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q),
    });
  } catch (networkErr) {
    console.error(`[questionnaire] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`);
  }

  console.log(`[questionnaire] ← ${res.status} ${res.statusText}`);

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  return text ? JSON.parse(text) : null;
}

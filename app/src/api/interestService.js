import { BASE_URL } from "./config";

// מחזיר את כל תחומי העניין מטבלת Interests.
// השרת מחזיר : { interestID, interestName }
export async function getAllInterests() {
  const url = `${BASE_URL}/Interest`;

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error("לא ניתן להתחבר כרגע. נסו שוב מאוחר יותר.");
  }


  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.message || msg;
    } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  // וידוא שהתשובה תקינה והמרת רשימת תחומי העניין למערך של אובייקטים. אם הרשימה ריקה נחזיר מערך ריק
  return text ? JSON.parse(text) : [];
}

// מחזיר רשימת תחומי עניין שהמשתמש סימן (GET /api/UserInterest/{userId}).
// השרת מחזיר מערך של אובייקטי Interest: [{ interestID, interestName }].
export async function getUserInterests(userId) {
  const url = `${BASE_URL}/UserInterest/${userId}`;

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  try { return JSON.parse(text); } catch { return []; }
}

// מסיר תחום עניין מהמשתמש (DELETE /api/UserInterest?userId=X&interestId=Y).
export async function removeUserInterest(userId, interestId) {
  const url = `${BASE_URL}/UserInterest?userId=${userId}&interestId=${interestId}`;

  let res;
  try {
    res = await fetch(url, { method: "DELETE" });
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

// הוספת תחום עניין למשתמש לפי פרמטרים בכתובת (שאילתה ב-URL)
// (ב-controller אין [FromBody], ברירת המחדל היא [FromQuery]).
export async function addUserInterest(userId, interestId) {
  const url = `${BASE_URL}/UserInterest?userId=${userId}&interestId=${interestId}`;

  let res;
  try {
    // ביצוע בקשת POST לשרת ללא גוף הודעה מכיוון שהנתונים נשלחים בכתובת עצמה
    res = await fetch(url, { method: "POST" });
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }


  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.message || msg;
    } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  return text ? JSON.parse(text) : null;
}

import { BASE_URL } from "./config";

// מחזיר את כל תחומי העניין מטבלת Interests.
// השרת מחזיר camelCase: { interestID, interestName }
export async function getAllInterests() {
  const url = `${BASE_URL}/Interest`;
  console.log(`[interest] → GET ${url}`);

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(
      `לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`,
    );
  }

  console.log(`[interest] ← ${res.status} ${res.statusText}`);

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
  console.log(`[interest] → GET ${url}`);

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[interest] ← ${res.status}`, text?.slice?.(0, 80));

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
  console.log(`[interest] → DELETE ${url}`);

  let res;
  try {
    res = await fetch(url, { method: "DELETE" });
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[interest] ← ${res.status}`, text);

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

// הוספת תחום עניין למשתמש ספציפי על ידי שליחת המזהים כפרמטרים בכתובת ה-URL (Query String)
// (ב-controller אין [FromBody], ברירת המחדל היא [FromQuery]).
export async function addUserInterest(userId, interestId) {
  const url = `${BASE_URL}/UserInterest?userId=${userId}&interestId=${interestId}`;
  console.log(`[interest] → POST ${url}`);

  let res;
  try {
    // ביצוע בקשת POST לשרת ללא גוף הודעה מכיוון שהנתונים נשלחים בכתובת עצמה
    res = await fetch(url, { method: "POST" });
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  console.log(`[interest] ← ${res.status} ${res.statusText}`);

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

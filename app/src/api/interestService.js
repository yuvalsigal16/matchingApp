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
    throw new Error(`לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`);
  }

  console.log(`[interest] ← ${res.status} ${res.statusText}`);

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  return text ? JSON.parse(text) : [];
}

// מקשר משתמש לתחום עניין. השרת מצפה ל-query string ולא ל-body
// (ב-controller אין [FromBody], ברירת המחדל היא [FromQuery]).
export async function addUserInterest(userId, interestId) {
  const url = `${BASE_URL}/UserInterest?userId=${userId}&interestId=${interestId}`;
  console.log(`[interest] → POST ${url}`);

  let res;
  try {
    res = await fetch(url, { method: "POST" });
  } catch (networkErr) {
    console.error(`[interest] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  console.log(`[interest] ← ${res.status} ${res.statusText}`);

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  return text ? JSON.parse(text) : null;
}

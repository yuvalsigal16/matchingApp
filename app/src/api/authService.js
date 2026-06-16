// ייבוא כתובת השרת מהגדרות המערכת
import { BASE_URL } from "./config";
import { getToken } from "../auth/authStore";

// פונקציית עזר לשליחת מידע לשרת בפורמט JSON והמתנה לתשובה
async function postJson(path, body) {
  const url = `${BASE_URL}${path}`;

  let res;
  // ביצוע שליחת המידע לשרת בשיטת POST והמרת האובייקט לטקסט JSON
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error(`[authService] ✖ network error on ${url}:`, networkErr);
    throw new Error(
      `לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`,
    );
  }

  // קבלת התשובה מהשרת והפיכתה מטקסט חזרה לאובייקט JavaScript
  const text = await res.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // גוף שאינו JSON — נטופל למטה לפי res.ok
    }
  }

  // בדיקה אם השרת החזיר שגיאה לוגית וחילוץ הודעת השגיאה המתאימה
  if (!res.ok) {
    const msg = data?.message || text || `שגיאה ${res.status} מהשרת`;
    throw new Error(msg);
  }

  return data;
}

// פונקציות ייצוא לשימוש בשאר האפליקציה לביצוע הרשמה והתחברות
export async function apiRegister(email, password) {
  return postJson("/User/register", { Email: email, UserPassword: password });
}

export async function apiLogin(email, password) {
  return postJson("/User/login", { Email: email, UserPassword: password });
}

// מחיקת חשבון המשתמש המחובר.
// פעולה הרסנית - מוחקת את כל הנתונים: פרופיל, תחומים, שאלון, טיולים, בקשות.
export async function apiDeleteAccount(userId) {
  const url = `${BASE_URL}/User/${userId}`;
  const token = getToken();

  let res;
  try {
    res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (networkErr) {
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  return true;
}

// שינוי סיסמה למשתמש מחובר. דורש Authorization header (JWT).
// השרת בודק את הסיסמה הישנה לפני שינוי.

export async function apiChangePassword(userId, oldPassword, newPassword) {
  const url = `${BASE_URL}/User/change-password`;
  const token = getToken();

  let res;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        UserID: userId,
        OldPassword: oldPassword,
        NewPassword: newPassword,
      }),
    });
  } catch (networkErr) {
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch {}
  }

  if (!res.ok) {
    const msg = data?.message || text || `שגיאה ${res.status} מהשרת`;
    throw new Error(msg);
  }

  return data || text;
}

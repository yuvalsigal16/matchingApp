import { BASE_URL } from "./config";

export async function apiRegister(email, password) {
  const res = await fetch(`${BASE_URL}/User/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Email: email, UserPassword: password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "שגיאה בהרשמה, נסי שוב");
  }

  return data; // מחזיר את ה-UserID החדש
}

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE_URL}/User/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Email: email, UserPassword: password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "אימייל או סיסמה שגויים");
  }

  return data; // מחזיר { token, user }
}

export async function apiGoogleLogin(accessToken) {
  const res = await fetch(`${BASE_URL}/User/google-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ AccessToken: accessToken }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "שגיאת התחברות עם Google");
  }

  return data; // מחזיר { token, user }
}

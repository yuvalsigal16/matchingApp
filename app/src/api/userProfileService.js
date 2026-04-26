import { BASE_URL } from "./config";
import { getToken } from "../auth/authStore";

// בודק אם יש פרופיל למשתמש. מחזיר את אובייקט הפרופיל אם קיים, או null אם לא.
// 404 מהשרת מתורגם ל-null כי הוא משמעותו הלגיטימית "אין פרופיל".
export async function getUserProfile(userId) {
  const url = `${BASE_URL}/UserProfile/${userId}`;
  console.log(`[userProfile] → GET ${url}`);

  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (networkErr) {
    console.error(`[userProfile] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`);
  }

  console.log(`[userProfile] ← ${res.status} ${res.statusText}`);

  // אין פרופיל — מצב לגיטימי
  if (res.status === 404) return null;

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  return text ? JSON.parse(text) : null;
}

// יוצר פרופיל חדש בטבלת UserProfile.
// profile = { UserID, FirstName, LastName, BirthDate (ISO string), Gender, City }
export async function createUserProfile(profile) {
  const url = `${BASE_URL}/UserProfile`;
  console.log(`[userProfile] → POST ${url}`, profile);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch (networkErr) {
    console.error(`[userProfile] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[userProfile] ← ${res.status} ${res.statusText}`, text);

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  // ה-controller מחזיר את ה-id של הפרופיל שנוצר
  return text ? JSON.parse(text) : null;
}

// מעלה תמונת פרופיל לשרת. localUri הוא ה-uri של התמונה מהמצלמה/גלריה.
// השרת מצפה לפורט multipart/form-data ב-PUT /api/UserProfile/updateImage/{userId}
export async function uploadProfileImage(userId, localUri) {
  const url = `${BASE_URL}/UserProfile/updateImage/${userId}`;
  console.log(`[userProfile] → PUT ${url} (image)`);

  // לחלץ סיומת מה-uri כדי לבנות filename ו-mime type
  const match = /\.([a-zA-Z0-9]+)$/.exec(localUri);
  const ext = (match?.[1] || "jpg").toLowerCase();
  const mime = ext === "png" ? "image/png" : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: localUri,
    name: `profile.${ext}`,
    type: mime,
  });

  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: {
        // שים לב: לא מגדירים Content-Type ידנית — fetch מחשב אוטומטית את ה-boundary
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch (networkErr) {
    console.error(`[userProfile] ✖ image upload network error:`, networkErr);
    throw new Error(`כישלון בהעלאת תמונה: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[userProfile] ← image ${res.status}`, text);

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} בהעלאת תמונה`);
  }

  return text ? JSON.parse(text) : null;
}

// מוחק את תמונת הפרופיל מהשרת. אחרי הצלחה אין למשתמש תמונה (ה-DB מחזיר null/empty).
// השרת מצפה ל-DELETE /api/UserProfile/deleteImage/{userId} ומחזיר { ok: true } בהצלחה.
export async function deleteProfileImage(userId) {
  const url = `${BASE_URL}/UserProfile/deleteImage/${userId}`;
  console.log(`[userProfile] → DELETE ${url}`);

  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (networkErr) {
    console.error(`[userProfile] ✖ image delete network error:`, networkErr);
    throw new Error(`כישלון במחיקת תמונה: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[userProfile] ← delete ${res.status}`, text);

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} במחיקת תמונה`);
  }

  return text ? JSON.parse(text) : { ok: true };
}

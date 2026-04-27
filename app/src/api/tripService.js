import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

// helper פנימי: מנסה לפרסר את הטקסט כ-JSON. אם הוא לא JSON תקין
// (השרת מחזיר טקסט רגיל כמו "Added"), מחזיר את הטקסט עצמו ולא זורק שגיאה.
function safeParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// יוצר Trip חדש ב-DB. חובת [Authorize] בשרת — שולחים JWT.
// trip = { CreatedByUserID, Destination, StartDate (ISO), EndDate (ISO) }
export async function createTrip(trip) {
  const url = `${BASE_URL}/Trip`;
  console.log(`[trip] → POST ${url}`, trip);

  const token = getToken();
  let res;
  try {
    // שליחת בקשת יצירת טיול בצירוף טוקן אבטחה (JWT) לזיהוי המשתמש המחובר
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(trip),
    });
  } catch (networkErr) {
    console.error(`[trip] ✖ network error:`, networkErr);
    throw new Error(
      `לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`,
    );
  }

  console.log(`[trip] ← ${res.status} ${res.statusText}`);

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.message || msg;
    } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  // ה-controller מחזיר int (tripID)
  return safeParse(text);
}

// יוצר העדפות לטיול. UNIQUE על TripID.
// pref = { TripID, PreferredGender, PreferredAgeMin, PreferredAgeMax, IsSmoker, KeepsKosher, KeepsShabbat, SpontaneityLevel, LifestyleLevel }
// שליחת העדפות הפרטנר המבוקש לטיול (גיל, מגדר וכו') ושמירתן בשרת
export async function createTripPreferences(pref) {
  const url = `${BASE_URL}/TripPreferences`;
  console.log(`[trip-pref] → POST ${url}`, pref);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pref),
    });
  } catch (networkErr) {
    console.error(`[trip-pref] ✖ network error:`, networkErr);
    throw new Error(
      `לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`,
    );
  }

  console.log(`[trip-pref] ← ${res.status} ${res.statusText}`);

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.message || msg;
    } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  // ה-controller מחזיר int (tripPreferenceID)
  //הפונקציה מחזירה את ה-ID של ההעדפות שנוצרו בשרת, כדי שנוכל להשתמש בו מיד אחר כך כדי להוסיף תחומי עניין לטיול
  return safeParse(text);
}

// מקשר תחום עניין להעדפת טיול. השרת מצפה ל-query string (אין [FromBody] ב-controller).
// קישור תחומי עניין ספציפיים להעדפות הטיול באמצעות פרמטרים בכתובת ה-URL
export async function addTripPreferenceInterest(tripPreferenceId, interestId) {
  const url = `${BASE_URL}/TripPreferenceInterests?tripPreferenceID=${tripPreferenceId}&interestID=${interestId}`;
  console.log(`[trip-pref-int] → POST ${url}`);

  let res;
  try {
    res = await fetch(url, { method: "POST" });
  } catch (networkErr) {
    console.error(`[trip-pref-int] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  console.log(`[trip-pref-int] ← ${res.status} ${res.statusText}`);

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.message || msg;
    } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }

  return safeParse(text);
}

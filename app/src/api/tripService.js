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

// מחזיר את כל הטיולים של המשתמש (GET /api/Trip/user/{userId}). דורש token.
export async function getUserTrips(userId) {
  const url = `${BASE_URL}/Trip/user/${userId}`;
  console.log(`[trip] → GET ${url}`);

  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (networkErr) {
    console.error(`[trip] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip] ← ${res.status}`);
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text) || [];
}

// מעדכן טיול קיים (PUT /api/Trip). דורש token.
// trip חייב לכלול את TripID + שאר השדות (כולל Status שהוא חובה במודל השרת).
export async function updateTrip(trip) {
  const url = `${BASE_URL}/Trip`;
  console.log(`[trip] → PUT ${url}`, trip);

  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(trip),
    });
  } catch (networkErr) {
    console.error(`[trip] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip] ← ${res.status}`, text);
  
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} בעדכון טיול`);
  }
  return safeParse(text);
}

// מחזיר את ההעדפות של טיול לפי TripID (GET /api/TripPreferences/{tripId}).
export async function getTripPreferences(tripId) {
  const url = `${BASE_URL}/TripPreferences/${tripId}`;
  console.log(`[trip-pref] → GET ${url}`);

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[trip-pref] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  console.log(`[trip-pref] ← ${res.status}`);
  if (res.status === 404) return null;

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text);
}

// מעדכן העדפות לטיול (PUT /api/TripPreferences).
// pref חייב לכלול TripPreferenceID + TripID + שאר השדות.
export async function updateTripPreferences(pref) {
  const url = `${BASE_URL}/TripPreferences`;
  console.log(`[trip-pref] → PUT ${url}`, pref);

  let res;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pref),
    });
  } catch (networkErr) {
    console.error(`[trip-pref] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip-pref] ← ${res.status}`, text);
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} בעדכון העדפות`);
  }
  return safeParse(text);
}

// מחזיר תחומי עניין של העדפת טיול (GET /api/TripPreferenceInterests/{tripPreferenceID}).
export async function getTripPreferenceInterests(tripPreferenceId) {
  const url = `${BASE_URL}/TripPreferenceInterests/${tripPreferenceId}`;
  console.log(`[trip-pref-int] → GET ${url}`);

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[trip-pref-int] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip-pref-int] ← ${res.status}`);
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text) || [];
}

// מסיר תחום עניין מהעדפת טיול (DELETE /api/TripPreferenceInterests?tripPreferenceID=X&interestID=Y).
export async function removeTripPreferenceInterest(tripPreferenceId, interestId) {
  const url = `${BASE_URL}/TripPreferenceInterests?tripPreferenceID=${tripPreferenceId}&interestID=${interestId}`;
  console.log(`[trip-pref-int] → DELETE ${url}`);

  let res;
  try {
    res = await fetch(url, { method: "DELETE" });
  } catch (networkErr) {
    console.error(`[trip-pref-int] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip-pref-int] ← ${res.status}`, text);
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text);
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

// שמירת טיול מלא במקום אחד: Trip → TripPreferences → תחומי עניין → דירוגי חשיבות.
// מקור אמת יחיד לשני המסלולים (שאלון עם יעד, וגלגל המזל) — כדי לא לשכפל לוגיקה.
// מרכיבה את אותן קריאות API שכבר קיימות, באותו סדר. מחזירה את tripID.
export async function createFullTrip({
  createdByUserID,
  tripName,
  destination,
  startDate,
  endDate,
  status = "Active",
  pref = null,
  interests = [],
  priorities = [],
}) {
  const tripId = await createTrip({
    CreatedByUserID: createdByUserID,
    TripName: tripName,
    Destination: destination,
    StartDate: startDate,
    EndDate: endDate,
    Status: status,
  });

  if (pref) {
    const prefId = await createTripPreferences({ TripID: tripId, ...pref });

    if (Array.isArray(interests) && interests.length > 0) {
      await Promise.all(
        interests.map((interestId) => addTripPreferenceInterest(prefId, interestId)),
      );
    }

    if (Array.isArray(priorities) && priorities.length > 0) {
      await Promise.all(
        priorities.map((factor, idx) => addTripPreferencePriority(prefId, factor, idx + 1)),
      );
    }
  }

  return tripId;
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


// מחזיר את דירוג חשיבות הגורמים של העדפת טיול
// (GET /api/TripPreferencePriorities/{tripPreferenceID}).
// כל פריט: { tripPreferenceID, factor, priorityRank }, ממוין לפי priorityRank.
export async function getTripPreferencePriorities(tripPreferenceId) {
  const url = `${BASE_URL}/TripPreferencePriorities/${tripPreferenceId}`;
  console.log(`[trip-pref-prio] → GET ${url}`);

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    console.error(`[trip-pref-prio] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip-pref-prio] ← ${res.status}`);
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text) || [];
}

// מוסיף שורת דירוג אחת (POST query string, כמו addTripPreferenceInterest).
export async function addTripPreferencePriority(tripPreferenceId, factor, priorityRank) {
  const url = `${BASE_URL}/TripPreferencePriorities?tripPreferenceID=${tripPreferenceId}&factor=${encodeURIComponent(factor)}&priorityRank=${priorityRank}`;
  console.log(`[trip-pref-prio] → POST ${url}`);

  let res;
  try {
    res = await fetch(url, { method: "POST" });
  } catch (networkErr) {
    console.error(`[trip-pref-prio] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip-pref-prio] ← ${res.status}`, text);
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text);
}

// מנקה את כל דירוגי החשיבות של העדפת טיול (DELETE /api/TripPreferencePriorities/{id}).
export async function clearTripPreferencePriorities(tripPreferenceId) {
  const url = `${BASE_URL}/TripPreferencePriorities/${tripPreferenceId}`;
  console.log(`[trip-pref-prio] → DELETE ${url}`);

  let res;
  try {
    res = await fetch(url, { method: "DELETE" });
  } catch (networkErr) {
    console.error(`[trip-pref-prio] ✖ network error:`, networkErr);
    throw new Error(`לא ניתן להתחבר לשרת. פרטים: ${networkErr.message}`);
  }

  const text = await res.text();
  console.log(`[trip-pref-prio] ← ${res.status}`, text);
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || msg; } catch {}
    throw new Error(msg || `שגיאה ${res.status} מהשרת`);
  }
  return safeParse(text);
}

export async function saveWheelSelection(
  userId,
  destinationId,
  partnerId
) {
  const response = await fetch(
    `${BASE_URL}/wheel-selection`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        destinationId,
        partnerId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to save selection");
  }

  return response.json();
}
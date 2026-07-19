import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";
import { fetchWithTimeout } from "./fetchWithTimeout";

// "המסלול שלכם" — מבקש מהשרת הצעת מסלול מותאמת לטיול (POST /api/Trip/{tripId}/ai-itinerary).
// regenerate=true מבקש הצעה שונה (עוקף את ה-cache בשרת, כפוף לצינון של 30 שניות).
// מחזיר: { summary, match_reason, planning_notes, days: [{ day, title, activities: [{ time, title, description }] }] }
//
// timeout נדיב (95 שניות): הרכבת מסלול אורכת עשרות שניות, וצריך גם מרווח מעל
// ה-timeout של השרת (90 שניות) כדי שהודעת השגיאה תגיע מהשרת ולא מ-Abort מקומי.
export async function generateItinerary(tripId, { regenerate = false } = {}) {
  const url = `${BASE_URL}/Trip/${tripId}/ai-itinerary${regenerate ? "?regenerate=true" : ""}`;

  const token = getToken();
  let res;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      95000,
    );
  } catch (networkErr) {
    console.error("[itinerary] ✖ network error:", networkErr);
    throw new Error("לא ניתן להתחבר כרגע. נסו שוב מאוחר יותר.");
  }

  const text = await res.text();

  if (!res.ok) {
    // השרת מחזיר תמיד { message } ידידותי (429 צינון / 502 כשל) — מציגים אותו כמו שהוא.
    let msg = "";
    try {
      msg = JSON.parse(text)?.message || "";
    } catch {}
    throw new Error(msg || "לא הצלחנו להרכיב מסלול כרגע. נסו שוב בעוד רגע.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("לא הצלחנו להרכיב מסלול כרגע. נסו שוב בעוד רגע.");
  }
}

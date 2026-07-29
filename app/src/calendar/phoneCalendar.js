import * as Calendar from "expo-calendar";

import { eventToDateRange } from "./eventModel";

// הוספת אירוע מהיומן המשותף ליומן המכשיר (Apple Calendar / Google Calendar).
//
// משתמש ב-createEventInCalendarAsync (Expo SDK 54): פותח את דיאלוג-המערכת הנייטיבי
// כשהוא ממולא מראש, והמשתמש מאשר/עורך ושומר בעצמו. יתרונות:
//   • ללא הרשאת יומן (המערכת מטפלת בכתיבה).
//   • ללא כתיבה אוטומטית — המשתמש תמיד מאשר.
//   • חוצה-פלטפורמות (iOS/Android).
//
// דורש מודול נייטיבי → זמין רק ב-Development/Production Build (לא ב-Expo Go).
// מחזיר: { ok, action } בהצלחה, או { ok:false, reason } כשחסר תאריך / המודול לא זמין.
export async function addEventToPhoneCalendar(event) {
  const range = eventToDateRange(event);
  if (!range) {
    return { ok: false, reason: "no-date" };
  }

  const details = {
    title: event?.title || "אירוע",
    startDate: range.startDate,
    endDate: range.endDate,
    allDay: range.allDay,
  };
  if (event?.location) details.location = event.location;
  if (event?.description) details.notes = event.description;

  try {
    const result = await Calendar.createEventInCalendarAsync(details);
    // DialogEventResult.action: 'saved' | 'canceled' | 'done'
    const action = result?.action;
    return { ok: action === "saved" || action === "done", action };
  } catch (err) {
    // מודול לא זמין (Expo Go / לפני rebuild) או שגיאת מערכת — נכשל בעדינות.
    console.warn("[phoneCalendar] createEventInCalendarAsync failed:", err?.message || err);
    return { ok: false, reason: "unavailable" };
  }
}

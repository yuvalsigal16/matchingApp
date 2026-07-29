// מודל אירוע היומן המשותף — helpers טהורים (בלי React, בלי Firestore, בלי רשת).
// המבנה מרחיב "במקום" את אובייקט ה-event הקיים ({ title, time, createdAt }) בשדות
// אופציונליים בלבד — כך שרשומות ישנות נשארות תקפות ומוצגות, ואין Migration.
//
// שדה אירוע מלא:
//   id, title, description, type, date ("YYYY-MM-DD"),
//   startTime ("HH:MM"), endTime ("HH:MM"), location, latitude, longitude,
//   createdByUserId, createdAt, updatedAt
// כל השדות מלבד title/createdAt הם אופציונליים.

// סוגי אירוע — key יציב לשמירה, label לתצוגה. האייקון נבחר במקום התצוגה (RN component).
export const EVENT_TYPES = [
  { key: "flight", label: "טיסה" },
  { key: "hotel", label: "לינה" },
  { key: "restaurant", label: "אוכל" },
  { key: "attraction", label: "אטרקציה" },
  { key: "activity", label: "פעילות" },
  { key: "other", label: "אחר" },
];

export const DEFAULT_EVENT_TYPE = "activity";

// מעבר לכך מיפוי יום→תאריך אינו ליטרלי (מסלול "מייצג", ראה AiItineraryService.MaxDetailedDays).
export const MAX_LITERAL_DAYS = 14;

// משך ברירת מחדל לאירוע מתוזמן ללא שעת סיום — לצורך יצירת טווח ליומן הטלפון בלבד.
export const DEFAULT_EVENT_MINUTES = 90;

const WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// מזהה אירוע ייחודי (לעריכה/מחיקה פר-אירוע). מספיק לשימוש בלקוח — בלי תלות ב-uuid חיצוני.
export function newEventId() {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// "YYYY-MM-DD..." או ISO → Date בחצות מקומית. קלט לא-תקין → null.
function parseDateOnly(raw) {
  if (!raw) return null;
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Date → "YYYY-MM-DD" (בלי תלות ב-timezone offset של toISOString).
export function toIsoDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// "H:MM" / "HH:MM" → { h, m } מנורמל, או null אם לא תקין.
export function parseHM(raw) {
  const m = String(raw || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

// נרמול שעה לתצוגה/שמירה: "9:0" לא תקין → ""; "9:00" → "09:00".
export function normalizeTime(raw) {
  const t = parseHM(raw);
  return t ? `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}` : "";
}

// גיל הטיול בימים (כולל). טיול פתוח (בלי EndDate) או לא תקין → null.
export function tripDurationDays(trip) {
  const start = parseDateOnly(trip?.startDate ?? trip?.StartDate);
  const end = parseDateOnly(trip?.endDate ?? trip?.EndDate);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// תאריך יעד ליום-מסלול: StartDate + (dayIndex-1) → "YYYY-MM-DD".
// אמין רק כשמיפוי יום→תאריך ליטרלי (טיול "מלא", עד MAX_LITERAL_DAYS ימים).
// טיול ארוך/פתוח → "" (האירוע יישמר בלי תאריך; המשתמש ישלים).
export function dateFromDayIndex(trip, dayIndex) {
  const start = parseDateOnly(trip?.startDate ?? trip?.StartDate);
  if (!start || !dayIndex) return "";
  const duration = tripDurationDays(trip);
  if (duration != null && duration > MAX_LITERAL_DAYS) return "";
  const d = new Date(start.getTime());
  d.setDate(d.getDate() + (dayIndex - 1));
  return toIsoDate(d);
}

// מיפוי primaryType של Google Places → סוג אירוע ביומן. ברירת מחדל: activity.
export function eventTypeFromPlaceType(placeType) {
  const t = String(placeType || "").toLowerCase();
  if (/restaurant|food|meal|cafe|coffee|bakery|bar|diner|pub|winery/.test(t)) return "restaurant";
  if (/lodging|hotel|motel|hostel|resort|guest|bed_and/.test(t)) return "hotel";
  if (/airport|air_/.test(t)) return "flight";
  if (/museum|gallery|landmark|monument|tourist|attraction|park|zoo|aquarium|historical|beach/.test(t))
    return "attraction";
  return DEFAULT_EVENT_TYPE;
}

// ממפה פעילות מהמסלול (AI) לאירוע יומן משותף — בלי לגעת בלוגיקת/מבנה ה-AI.
// dayIndex = מספר היום (d.day); trip נחוץ לגזירת התאריך; createdByUserId = היוצר.
export function activityToEvent(activity, dayIndex, trip, createdByUserId) {
  const place = activity?.place || null;
  const now = Date.now();
  return {
    id: newEventId(),
    title: String(activity?.title || "").trim(),
    description: String(activity?.description || "").trim(),
    type: place ? eventTypeFromPlaceType(place.type) : DEFAULT_EVENT_TYPE,
    date: dateFromDayIndex(trip, dayIndex),
    startTime: normalizeTime(activity?.time),
    endTime: "",
    location: place?.name || "",
    latitude: typeof place?.lat === "number" ? place.lat : null,
    longitude: typeof place?.lng === "number" ? place.lng : null,
    createdByUserId: createdByUserId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

// בונה אובייקט אירוע חדש משדות טופס (יצירה). מוסיף id/createdAt/createdBy.
export function buildNewEvent(form, createdByUserId) {
  const now = Date.now();
  return {
    id: newEventId(),
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    type: form.type || DEFAULT_EVENT_TYPE,
    date: form.date || "",
    startTime: normalizeTime(form.startTime),
    endTime: normalizeTime(form.endTime),
    location: String(form.location || "").trim(),
    latitude: typeof form.latitude === "number" ? form.latitude : null,
    longitude: typeof form.longitude === "number" ? form.longitude : null,
    createdByUserId: createdByUserId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

// patch לעדכון אירוע קיים משדות טופס (בלי לגעת ב-id/createdAt/createdBy).
export function buildEventPatch(form) {
  return {
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    type: form.type || DEFAULT_EVENT_TYPE,
    date: form.date || "",
    startTime: normalizeTime(form.startTime),
    endTime: normalizeTime(form.endTime),
    location: String(form.location || "").trim(),
  };
}

// תווית תאריך לכותרת קבוצת-יום: "יום שלישי · 05/08/2026".
export function formatDateLabel(iso) {
  const d = parseDateOnly(iso);
  if (!d) return iso || "";
  return `יום ${WEEKDAYS_HE[d.getDay()]} · ${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

// טווח שעות לתצוגה בשורת אירוע: "09:00–11:00" / "09:00" / "".
export function formatTimeRange(event) {
  const start = normalizeTime(event?.startTime) || normalizeTime(event?.time);
  const end = normalizeTime(event?.endTime);
  if (start && end) return `${start}–${end}`;
  return start || "";
}

// מקבץ אירועים לפי תאריך וממיין: תאריך עולה, ובתוך יום לפי שעת התחלה. חסרי-תאריך בסוף.
// מחזיר [{ date, label, items: [...] }]. טהור — מתאים ל-useMemo.
export function groupEventsByDate(events) {
  const list = Array.isArray(events) ? events.slice() : [];
  const startOf = (e) => normalizeTime(e.startTime) || normalizeTime(e.time) || "";
  list.sort((a, b) => {
    const da = a.date || "9999-99-99";
    const db = b.date || "9999-99-99";
    if (da !== db) return da < db ? -1 : 1;
    const sa = startOf(a);
    const sb = startOf(b);
    if (sa === sb) return (a.createdAt || 0) - (b.createdAt || 0);
    if (!sa) return 1; // בלי שעה — בסוף היום
    if (!sb) return -1;
    return sa < sb ? -1 : 1;
  });

  const groups = [];
  const index = new Map();
  for (const e of list) {
    const key = e.date || "";
    if (!index.has(key)) {
      const g = { date: key, label: key ? formatDateLabel(key) : "ללא תאריך", items: [] };
      index.set(key, g);
      groups.push(g);
    }
    index.get(key).items.push(e);
  }
  return groups;
}

// בונה טווח Date (start/end) לאירוע — עבור יומן הטלפון בלבד.
// בלי שעה → אירוע יום-שלם; בלי שעת סיום → +DEFAULT_EVENT_MINUTES.
// בלי תאריך → null (אי אפשר ליצור אירוע יומן ללא תאריך).
export function eventToDateRange(event) {
  const base = parseDateOnly(event?.date);
  if (!base) return null;

  const st = parseHM(event?.startTime || event?.time);
  if (!st) {
    const start = new Date(base.getTime());
    const end = new Date(base.getTime());
    end.setDate(end.getDate() + 1);
    return { startDate: start, endDate: end, allDay: true };
  }

  const start = new Date(base.getTime());
  start.setHours(st.h, st.m, 0, 0);

  const end = new Date(start.getTime());
  const et = parseHM(event?.endTime);
  if (et) {
    end.setHours(et.h, et.m, 0, 0);
    if (end.getTime() <= start.getTime()) {
      end.setTime(start.getTime() + DEFAULT_EVENT_MINUTES * 60000);
    }
  } else {
    end.setTime(start.getTime() + DEFAULT_EVENT_MINUTES * 60000);
  }
  return { startDate: start, endDate: end, allDay: false };
}

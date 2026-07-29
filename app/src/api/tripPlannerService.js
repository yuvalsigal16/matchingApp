import { db } from "../../firebase/firebase";

import {
doc,
setDoc,
updateDoc,
arrayUnion,
onSnapshot,
runTransaction,
} from "firebase/firestore";

/*
האזנה בזמן אמת ליומן של הטיול
*/

export const subscribePlanner = (
tripId,
callback
) => {

return onSnapshot(

doc(
db,
"trip_planner",
String(tripId)
),

(snapshot) => {

if (
snapshot.exists()
) {

callback(
snapshot.data()?.events || []
);

} else {

callback([]);

}

}

);

};

/* =========================
   יומן משותף — CRUD פר-אירוע (העשרה-במקום של אותו מסמך/מערך events).
   subscribePlanner נשאר ללא שינוי; אלה תוספות בלבד.
========================= */

// מפתח זיהוי אירוע: id (אירועים חדשים) עם נפילה-לאחור ל-createdAt.
// כך אירועים ישנים (בלי id, מהמבנה הקודם) עדיין ניתנים לעריכה/מחיקה — בלי Migration.
const eventKey = (e) => (e && e.id != null ? `id:${e.id}` : `ts:${e?.createdAt}`);

// הוספת אירוע-יומן עשיר. אותו מסמך ומערך events הקיימים — כל שדה חדש אופציונלי.
// event אמור לכלול id ייחודי (newEventId) כדי לאפשר עריכה/מחיקה יציבה בהמשך.
export const addCalendarEvent = async (tripId, event) => {
  const ref = doc(db, "trip_planner", String(tripId));
  await setDoc(ref, { events: [] }, { merge: true });
  await updateDoc(ref, { events: arrayUnion(event) });
};

// עדכון אירוע (מזוהה לפי target). Transaction — קורא-משנה-כותב בבטחה מול עריכה בו-זמנית
// של השותף, כך שהוספה/עריכה במקביל אינה נדרסת (Firestore מריץ retry על התנגשות).
export const updateCalendarEvent = async (tripId, target, patch) => {
  const ref = doc(db, "trip_planner", String(tripId));
  const key = eventKey(target);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const events = snap.exists() ? snap.data()?.events || [] : [];
    const next = events.map((e) =>
      eventKey(e) === key ? { ...e, ...patch, updatedAt: Date.now() } : e,
    );
    tx.set(ref, { events: next }, { merge: true });
  });
};

// מחיקת אירוע (מזוהה לפי target). Transaction מאותה סיבה — מסנן את הפריט מהמערך בבטחה.
export const deleteCalendarEvent = async (tripId, target) => {
  const ref = doc(db, "trip_planner", String(tripId));
  const key = eventKey(target);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const events = snap.exists() ? snap.data()?.events || [] : [];
    const next = events.filter((e) => eventKey(e) !== key);
    tx.set(ref, { events: next }, { merge: true });
  });
};
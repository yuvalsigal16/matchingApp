import { Linking } from "react-native";

// פתיחת קישור חיצוני בבטחה — לא מפילה את האפליקציה אם ה-URL לא נתמך במכשיר.
async function openUrl(url) {
  try {
    await Linking.openURL(url);
  } catch {
    // נכשל בשקט — עדיף מאשר לקרוס בגלל דפדפן/אפליקציה חסרים
  }
}

// חיפוש טיסות ב-Skyscanner.
// חיפוש חופשי לפי שם יעד דורש קודי שדה תעופה (IATA), לכן פותחים את עמוד הבית בעברית.
export function openFlights() {
  openUrl("https://www.skyscanner.co.il/");
}

// חיפוש מלונות ב-Booking.com לפי יעד.
// הפרמטר ss הוא מחרוזת חיפוש חופשית ותומך גם בעברית ("רומא").
export function openHotels(destination) {
  const q = (destination || "").trim();
  const url = q
    ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}`
    : "https://www.booking.com/";
  openUrl(url);
}

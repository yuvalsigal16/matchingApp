import { BASE_URL } from "../api/config";

// ממיר נתיב תמונה מהשרת ל-URL מלא שאפשר להציג ב-<Image>.
// - ריק/לא-תקין → null
// - URI מלא (http/https/data/file) → מוחזר כמו שהוא
// - נתיב יחסי ("/images/xxx" או "images/xxx") → מקבל את שורש השרת (בלי ה-"/api")
export function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

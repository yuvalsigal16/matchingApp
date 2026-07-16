import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

// מחזיר את כל המשתמשים מועשרים (פרופיל + שאלון + תחומי עניין) ב-קריאה אחת.
// ה-SP בשרת מסנן אוטומטית את המשתמש הנוכחי + משתמשים חסומים.
export async function getAllUsers(currentUserId) {
  const url = `${BASE_URL}/User?currentUserId=${currentUserId}`;
  // ה-endpoint דורש טוקן (Authorization). התוכן זהה — כל המשתמשים.
  const token = getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) throw new Error("Failed to fetch users");

  return response.json();
}

import { BASE_URL } from "./config";

// מחזיר את כל המשתמשים מועשרים (פרופיל + שאלון + תחומי עניין) ב-קריאה אחת.
// ה-SP בשרת מסנן אוטומטית את המשתמש הנוכחי + משתמשים חסומים.
export async function getAllUsers(currentUserId) {
  try {
    const url = `${BASE_URL}/User?currentUserId=${currentUserId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error in getAllUsers:", error);
    throw error;
  }
}

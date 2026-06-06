import { BASE_URL } from "./config";

// מחזיר את כל המשתמשים מועשרים (פרופיל + שאלון + תחומי עניין) ב-קריאה אחת.
// ה-SP בשרת מסנן אוטומטית את המשתמש הנוכחי + משתמשים חסומים.
export async function getAllUsers(currentUserId) {
  const url = `${BASE_URL}/User?currentUserId=${currentUserId}`;
  console.log(`[userService] → GET ${url}`);
  try {
    const response = await fetch(url);
    console.log(`[userService] ← ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      console.log(`[userService] error body:`, text);
      throw new Error("Failed to fetch users");
    }

    const data = await response.json();
    console.log(`[userService] got ${Array.isArray(data) ? data.length : "?"} users`);
    if (Array.isArray(data) && data[0]) {
      console.log(`[userService] first user keys:`, Object.keys(data[0]));
      console.log(`[userService] first user:`, JSON.stringify(data[0]).slice(0, 300));
    }
    return data;
  } catch (error) {
    console.log("Error in getAllUsers:", error);
    throw error;
  }
}

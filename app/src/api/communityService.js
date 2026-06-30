import { BASE_URL } from "./config";
import { getToken, getUser } from "../auth/authStore";

// שירות לפעולות קהילה — עוטף את ה-endpoint הקיים POST /Community.
// אין שינוי בשרת; השרת מחזיר את ה-CommunityID החדש כמספר, ויוצר אוטומטית
// את צ'אט הקהילה ומוסיף את היוצר כחבר (לוגיקה קיימת ב-SP AddCommunity).

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// יצירת קהילה. מחזיר את ה-communityID החדש (number) או null אם השרת לא החזיר ערך תקין.
export async function createCommunity({ communityName, description }) {
  const user = getUser();
  const res = await fetch(`${BASE_URL}/Community`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      communityName,
      description: description || "",
      createdByUserID: user?.userID,
    }),
  });
  if (!res.ok) throw new Error("create community failed");

  const data = await res.json().catch(() => null);
  // השרת מחזיר מספר (CommunityID). מכסים גם מקרה של אובייקט ליתר ביטחון.
  const id = typeof data === "number" ? data : data?.communityID ?? data?.CommunityID ?? null;
  return Number.isFinite(Number(id)) && Number(id) > 0 ? Number(id) : null;
}

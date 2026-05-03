import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

// פונקציה למשיכת סטטוס בקשות ששלחתי (ה-V וה-X בתרשים)
export async function getMyRequestsStatus(userId) {
  try {
    const response = await fetch(`${BASE_URL}/UserRequests/MyStatus/${userId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching request status:", error);
    return [];
  }
}

// פונקציה למשיכת הצ'אטים הפעילים
export async function getActiveChats(userId) {
  try {
    const response = await fetch(`${BASE_URL}/Chats/Active/${userId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching active chats:", error);
    return [];
  }
}
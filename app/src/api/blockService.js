// שכבת API לפעולות חסימה (block/unblock/list).
// השרת שולף את UserID מהטוקן, אז לא שולחים אותו ב-body.

import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// קבלת רשימת המשתמשים החסומים (מועשרים: שם, תמונה, תאריך חסימה).
export async function getBlockedUsers() {
  try {
    const res = await fetch(`${BASE_URL}/BlockUser`, { headers: authHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("getBlockedUsers:", err);
    return [];
  }
}

// חסימת משתמש.
export async function blockUser(blockedUserId) {
  const res = await fetch(`${BASE_URL}/BlockUser/block`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ BlockedUserId: blockedUserId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "חסימת המשתמש נכשלה");
  }
  return true;
}

// ביטול חסימה.
export async function unblockUser(blockedUserId) {
  const res = await fetch(`${BASE_URL}/BlockUser/unblock`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ BlockedUserId: blockedUserId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "ביטול החסימה נכשל");
  }
  return true;
}

import { Platform } from "react-native";
import { getToken } from "../auth/authStore";
import { BASE_URL } from "./config";

function safeParse(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function getRecommendationsByTrip(tripId) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/Recommendation/trip/${tripId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`שגיאה ${res.status}`);
  return safeParse(text) || [];
}

// כל ההמלצות מכל המשתמשים (פיד גלובלי).
export async function getAllRecommendations() {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/Recommendation/all`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  if (!res.ok) {
    // חושפים את הודעת השרת (ex.Message) במקום סטטוס גנרי — לצורך אבחון.
    const body = safeParse(text);
    const detail = typeof body === "string" ? body : body?.message || "";
    throw new Error(`שגיאה ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return safeParse(text) || [];
}

// כל ההמלצות של יעד מסוים מכל המשתמשים (למשל "רומא").
export async function getRecommendationsByDestination(destination) {
  const token = getToken();
  const res = await fetch(
    `${BASE_URL}/Recommendation/destination/${encodeURIComponent(destination)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`שגיאה ${res.status}`);
  return safeParse(text) || [];
}

// העלאת תמונת המלצה (גלריה/מצלמה). מחזיר נתיב יחסי לשמירה ב-MediaUrl.
export async function uploadRecommendationImage(localUri) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(localUri);
  const ext = (match?.[1] || "jpg").toLowerCase();
  const mime = ext === "png" ? "image/png" : "image/jpeg";

  const formData = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(localUri)).blob();
    formData.append("file", new File([blob], `reco.${ext}`, { type: mime }));
  } else {
    formData.append("file", { uri: localUri, name: `reco.${ext}`, type: mime });
  }

  const token = getToken();
  const res = await fetch(`${BASE_URL}/Recommendation/uploadImage`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(safeParse(text)?.message || `שגיאה ${res.status}`);
  return safeParse(text)?.imagePath || null;
}

export async function addRecommendation(payload) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/Recommendation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(safeParse(text)?.message || `שגיאה ${res.status}`);
  return safeParse(text);
}

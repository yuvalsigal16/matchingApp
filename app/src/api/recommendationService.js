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

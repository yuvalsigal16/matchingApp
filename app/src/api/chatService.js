import { BASE_URL } from "./config";
import { getToken } from "../auth/authStore";

/* =========================
   MATCHES
========================= */

export const getMatches = async () => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/matches`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch matches");

  return res.json();
};

export const getMatchesByTrip = async (tripId) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/matches/trip/${tripId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch trip matches");

  return res.json();
};

export const getMatchById = async (matchId) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/matches/${matchId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch match");

  return res.json();
};

export const triggerMatching = async (matchId) => {
  const token = getToken();

  const res = await fetch(
    `${BASE_URL}/matches/${matchId}/matching`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Matching failed");

  return res.json();
};

/* =========================
   CHATS / MESSAGES
========================= */

export const getChatByMatchId = async (matchId) => {
  const token = getToken();

  const res = await fetch(
    `${BASE_URL}/Messages/match/${matchId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Failed to fetch messages");

  return res.json();
};

export const sendChatMessage = async (
  matchId,
  text,
  senderID
) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/Messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      matchID: matchId,
      senderID,
      text,
    }),
  });

  if (!res.ok) throw new Error("Failed to send message");

  return res.json();
};
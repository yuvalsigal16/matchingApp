import { BASE_URL } from "./config";

export async function getAllUsers() {
  try {
    const response = await fetch(`${BASE_URL}/User`);

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
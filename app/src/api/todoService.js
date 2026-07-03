import { BASE_URL } from "./config";
import { getToken } from "../auth/authStore";

// שירות רשימת המשימות לטיול — עוטף את ה-endpoints הקיימים של ToDoList.
// אין שינוי בשרת; רק שימוש.

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// כל המשימות של טיול. מחזיר [{ taskID, tripID, userID, taskText, isDone }].
export async function getTripTasks(tripId) {
  const res = await fetch(`${BASE_URL}/ToDoList/trip/${tripId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("tasks load failed");
  return (await res.json()) || [];
}

// הוספת משימה. מחזיר את ה-taskID החדש.
export async function addTask(tripId, userId, taskText) {
  const res = await fetch(`${BASE_URL}/ToDoList/add`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ tripID: tripId, userID: userId, taskText }),
  });
  if (!res.ok) throw new Error("add task failed");
  const data = await res.json().catch(() => null);
  return data?.taskID ?? data?.TaskID ?? null;
}

// סימון משימה כבוצעה / לא בוצעה.
export async function setTaskDone(taskId, isDone) {
  const res = await fetch(`${BASE_URL}/ToDoList/done/${taskId}?isDone=${isDone}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("update task failed");
  return true;
}

// מחיקת משימה.
export async function deleteTask(taskId) {
  const res = await fetch(`${BASE_URL}/ToDoList/${taskId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("delete task failed");
  return true;
}

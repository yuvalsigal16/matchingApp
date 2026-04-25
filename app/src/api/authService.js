import { BASE_URL } from "./config";

async function postJson(path, body) {
  const url = `${BASE_URL}${path}`;
  console.log(`[authService] → POST ${url}`, body);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error(`[authService] ✖ network error on ${url}:`, networkErr);
    throw new Error(
      `לא ניתן להתחבר לשרת (${url}). פרטים: ${networkErr.message}`,
    );
  }

  console.log(`[authService] ← ${res.status} ${res.statusText} from ${url}`);

  const text = await res.text();
  console.log(`[authService]   raw body:`, text);

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.warn(`[authService]   body is not JSON:`, parseErr.message);
    }
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      text ||
      `שגיאה ${res.status} מהשרת`;
    throw new Error(msg);
  }

  return data;
}

export async function apiRegister(email, password) {
  return postJson("/User/register", { Email: email, UserPassword: password });
}

export async function apiLogin(email, password) {
  return postJson("/User/login", { Email: email, UserPassword: password });
}

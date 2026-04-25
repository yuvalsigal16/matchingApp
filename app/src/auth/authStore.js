// שמירת token ו-user בזיכרון בזמן ריצת האפליקציה.
// ניתן להחליף בעתיד ל-AsyncStorage / SecureStore לשמירה קבועה.

let _token = null;
let _user = null;

export function setAuth(token, user) {
  _token = token;
  _user = user;
}

export function getToken() {
  return _token;
}

export function getUser() {
  return _user;
}

export function clearAuth() {
  _token = null;
  _user = null;
}

// מחזיר headers מוכנים לקריאות API מוגנות
export function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${_token}`,
  };
}

// import { Slot } from "expo-router";

// // משתמשים ב-Slot במקום Stack כדי לא ליצור navigator כפול
// // הניווט האמיתי מנוהל על ידי React Navigation ב-App.js
// export default function RootLayout() {
//   return <Slot />;
// }


import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
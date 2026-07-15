import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/rubik";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { I18nManager, View } from "react-native";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getUser, loadAuth } from "./src/auth/authStore";
import { installFetchInterceptor } from "./src/api/installFetchInterceptor";
import { pushRouteForType, registerForPushNotifications } from "./src/push/pushNotifications";
import { COLORS } from "./src/theme";

// מבטלים RTL ברמת המערכת. הקוד משתמש ב-"row-reverse" ידני להשגת תצוגת RTL,
// ולכן ה-isRTL של React Native חייב להישאר false (אחרת זה מתהפך).
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });

  // טעינת אימות שמור (token + user) מ-SecureStore לזיכרון בעלייה.
  // עד שהטעינה תסתיים מציגים מסך טעינה זהה לזה של fontsLoaded.
  const [authLoaded, setAuthLoaded] = useState(false);
  useEffect(() => {
    installFetchInterceptor(); // טיפול אחיד ב-401 בכל קריאות הרשת

    loadAuth().finally(() => {
      setAuthLoaded(true);
      // רישום ל-Push למשתמש שכבר מחובר בעליית האפליקציה (auto-login / פתיחה מחדש),
      // כדי שלא יישאר מחובר בלי token תקף. אידמפוטנטי, fire-and-forget (לא חוסם UI).
      const u = getUser();
      if (u?.userID) registerForPushNotifications(u.userID);
    });

    // לחיצה על Push → ניווט למסך הרלוונטי לפי notification.data.type.
    // אותו מיפוי כמו לחיצה על התראה בתוך האפליקציה (notifications.jsx).
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      const route = pushRouteForType(data?.type, data?.relatedID);
      if (route && getUser()?.userID) router.push(route as never);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !authLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.brand }} />;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 280,
        }}
      >
        <Stack.Screen
          name="SplashScreen"
          options={{ animation: "fade", animationDuration: 500 }}
        />
        <Stack.Screen name="index" options={{ animation: "fade" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

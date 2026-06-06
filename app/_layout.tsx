import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/heebo";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { I18nManager, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadAuth } from "./src/auth/authStore";

// מבטלים RTL ברמת המערכת. הקוד משתמש ב-"row-reverse" ידני להשגת תצוגת RTL,
// ולכן ה-isRTL של React Native חייב להישאר false (אחרת זה מתהפך).
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
    Heebo_800ExtraBold,
  });

  // טעינת אימות שמור (token + user) מ-SecureStore לזיכרון בעלייה.
  // עד שהטעינה תסתיים מציגים מסך טעינה זהה לזה של fontsLoaded.
  const [authLoaded, setAuthLoaded] = useState(false);
  useEffect(() => {
    loadAuth().finally(() => setAuthLoaded(true));
  }, []);

  if (!fontsLoaded || !authLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#1A3C40" }} />;
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

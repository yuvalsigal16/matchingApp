import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { warmStartup } from "./src/api/homeData";
import { pushRouteForType } from "./src/push/pushNotifications";
import { getUser } from "./src/auth/authStore";
import { COLORS, FONTS } from "./src/theme";

const LOGO = require("../assets/images/onlyLogo-removebg-preview.png");

// מסך פתיחה — נשימה שקטה אחת לפני היציאה לדרך.
// כניסה עדינה (fade + rise), RouteLine בעצירה 0 ("המסע מתחיל"),
// ותזמון מהודק (~1.7 שנ') — בלי טקסט-דמה של "מתחברים בקרוב".
export default function SplashScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    // מנצלים את זמן ה-Splash: מתחילים לחמם את נתוני ה-Home (ובעקיפין את שרת
    // Azure מ-cold start) במקביל לאנימציה, כך שכשנגיע ל-Home המידע כבר בדרך.
    // no-op כשאין משתמש מחובר. אינו משנה את התזמון/המיתוג של המסך.
    warmStartup();

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // אם יש משתמש בזיכרון (הטוקן נטען מ-SecureStore ב-_layout) — ישר ל-Home,
    // אחרת — למסך ההתחברות. אין auto-login מסיסמה (לא שומרים סיסמה במכשיר).
    const t = setTimeout(async () => {
      if (!getUser()) {
        router.replace("/Login");
        return;
      }
      // Cold start: אם האפליקציה נפתחה מלחיצה על Push כשהייתה סגורה לגמרי —
      // מנווטים קודם ל-Home ואז למסך היעד (כך "חזרה" תוביל ל-Home). לפתיחה רגילה
      // getLastNotificationResponseAsync מחזיר null → Home רגיל, בלי שינוי התנהגות.
      const response = await Notifications.getLastNotificationResponseAsync();
      const data = response?.notification?.request?.content?.data;
      const route = pushRouteForType(data?.type, data?.relatedID);
      router.replace("/Home");
      if (route) router.push(route);
    }, 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], alignItems: "center" }}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
        <Text style={styles.wordmark}>צמד חמד</Text>
        <Text style={styles.tagline}>החצי השני שלך לטיול הבא</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  // לוגו גדול ופשוט — רגע-מותג. (הצבע המקורי, בלי tint.)
  logo: { width: 248, height: 248, marginBottom: 18 },
  // לבן-רך עם נגיעת טיל (brandLight) — רך יותר מלבן טהור על רקע המותג.
  wordmark: {
    fontFamily: FONTS.extraBold,
    fontSize: 40,
    color: COLORS.brandLight,
    letterSpacing: 1,
    textAlign: "center",
  },
  // onBrand בשקיפות 80% — במקום rgba ידני, מאותה סיבה: צבעים רק מהפלטה.
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.onBrand,
    opacity: 0.8,
    textAlign: "center",
    marginTop: 8,
  },
});

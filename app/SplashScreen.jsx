import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
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
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // אם יש משתמש בזיכרון (הטוקן נטען מ-SecureStore ב-_layout) — ישר ל-Home,
    // אחרת — למסך ההתחברות. אין auto-login מסיסמה (לא שומרים סיסמה במכשיר).
    const t = setTimeout(() => router.replace(getUser() ? "/Home" : "/Login"), 1700);
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
  wordmark: {
    fontFamily: FONTS.extraBold,
    fontSize: 40,
    color: "#EAF1F1",
    letterSpacing: 1,
    textAlign: "center",
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 8,
  },
});

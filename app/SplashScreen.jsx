import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { getUser } from "./src/auth/authStore";
import { COLORS, FONTS } from "./src/theme";

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    const navigate = () => {
      // אם יש משתמש בזיכרון (הטוקן נטען מ-SecureStore ב-_layout) — ישר ל-Home,
      // אחרת — למסך ההתחברות. אין auto-login מסיסמה (לא שומרים סיסמה במכשיר).
      router.replace(getUser() ? "/Home" : "/Login");
    };

    const timer = setTimeout(navigate, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        <Image
          source={require("../assets/images/onlyLogo-removebg-preview.png")}
          style={{ width: 250, height: 250, marginBottom: 10 }}
          resizeMode="contain"
        />

        <Text style={styles.logoText}>צמד חמד</Text>
        <Text style={styles.subTitle}>החצי השני שלך לטיול הבא</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>מתחברים בקרוב...</Text>
      </View>
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
  logoText: {
    fontSize: 60,
    fontFamily: FONTS.extraBold,
    color: "#E0E7E9",
    textAlign: "center",
    letterSpacing: 2,
  },
  subTitle: {
    fontSize: 18,
    fontFamily: FONTS.regular,
    color: "#E0E7E9",
    textAlign: "center",
    marginTop: 10,
    opacity: 0.8,
  },
  footer: {
    position: "absolute",
    bottom: 50,
  },
  footerText: {
    color: "#E0E7E9",
    fontSize: 14,
    fontFamily: FONTS.regular,
    opacity: 0.5,
  },
});

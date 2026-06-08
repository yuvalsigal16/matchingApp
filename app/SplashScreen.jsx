import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { apiLogin } from "./src/api/authService";
import { getUserProfile } from "./src/api/userProfileService";
import { getUser, setAuth } from "./src/auth/authStore";
import { FONTS } from "./src/theme/fonts";

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    const navigate = async () => {
      // אם כבר יש token בזיכרון (SecureStore נטען ב-_layout) — ישר ל-Home
      if (getUser()) {
        router.replace("/Home");
        return;
      }

      // fallback ל-web / רענון: נסה auto-login עם credentials שמורים
      try {
        const pairs = await AsyncStorage.multiGet(["saved_email", "saved_password"]);
        const se = pairs[0][1];
        const sp = pairs[1][1];
        if (se && sp) {
          const { token, user } = await apiLogin(se, sp);
          setAuth(token, user);
          const profile = await getUserProfile(user.userID);
          router.replace(profile ? "/Home" : "/QuizStartScreen");
          return;
        }
      } catch {}

      router.replace("/Login");
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
    backgroundColor: "#1A3C40",
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

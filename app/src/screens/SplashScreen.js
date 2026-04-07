import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { FONTS } from "../theme/fonts";

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current; // אנימציית הופעה

  useEffect(() => {
    // מפעיל את האנימציה של הטקסט
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    // אחרי 3 שניות, עובר אוטומטית למסך ה-Login
    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center"}}>
        <Image
          source={require("../../../assets/images/onlyLogo-removebg-preview.png")}
          style={{ width: 250, height: 250, marginBottom: 10 }}
          resizeMode="contain"
        />

        <Text style={styles.logoText}>צמד חמד</Text>
        <Text style={styles.subTitle}>החצי השני שלך לטיול הבא</Text>
      </Animated.View>

      {/* אם יש לך לוגו ב-assets, תוכלי להוסיף אותו כאן */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>מתחברים בקרוב...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A3C40", // הצבע הירוק הכהה מהלוגו שלך
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 60,
    fontFamily: FONTS.extraBold,
    color: "#E0E7E9", // הצבע הבהיר של האפליקציה
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

// CompletionOverlay — רגע-הסיום המשותף של האונבורדינג.
// קצר ואלגנטי (~1.5 שנ'): וי טורקיז שנכנס ב-spring עדין + הודעת הישג.
// משמש בכל מסלולי הסיום (Wheel → Home, PreferencesQuiz → myTrips) לשפה זהה.
import { Check } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS } from "../../app/src/theme";

export default function CompletionOverlay({
  visible,
  title = "הכול מוכן!",
  subtitle = "יוצאים לדרך — נמצא לך את השותפים המתאימים",
}) {
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.7);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();
    }
  }, [visible, scale]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
          <Check size={46} color={COLORS.onBrand} strokeWidth={2.6} />
        </Animated.View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
    textAlign: "center",
  },
  sub: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});

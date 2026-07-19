import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { CircleCheck } from "lucide-react-native";

import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../app/src/theme";

// Snackbar קליל למשוב הצלחה ("האירוע נוסף" / "המשימה נוספה").
// מופיע בעדינות, נשאר ~1.8 שניות ונעלם. משתמש ב-Animated המובנה (בלי ספריות חדשות).
// props: text (המחרוזת להצגה; ריק = מוסתר), onHide (ניקוי אחרי סגירה), bottom (מרחק מלמטה).
export default function Snackbar({ text, onHide, bottom = 40 }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!text) return;
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(
        () => onHide && onHide(),
      );
    }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!text) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom, opacity: anim, transform: [{ translateY }] }]}
    >
      <View style={styles.snackbar}>
        <CircleCheck size={18} color={COLORS.onBrand} strokeWidth={2.2} />
        <Text style={styles.text}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  snackbar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 18,
    paddingVertical: 11,
    ...SHADOWS.lg,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },
});

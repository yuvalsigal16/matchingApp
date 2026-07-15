// Card — מיכל-תוכן אחיד: משטח לבן, פינות RADIUS.xl, מסגרת-שיער (hairline) וצל
// עדין בלבד (SHADOWS.sm). עוטף אובייקט-תוכן אחד (כרטיס טיול, כרטיס קהילה וכו').
//
// מתי Card ומתי ListRow: ListRow הוא שורת-רשימה שקטה (אייקון+כותרת+חץ); Card הוא
// כרטיס עצמאי עם קצת יותר נוכחות, ותומך במדיה בזכות overflow:hidden.
import { Pressable, StyleSheet, View } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../app/src/theme";

export default function Card({ children, onPress, padded = true, style, accessibilityLabel }) {
  const cardStyle = [styles.card, padded && styles.padded, style];

  if (!onPress) return <View style={cardStyle}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    overflow: "hidden", // מדיה/תמונות נחתכות לפינות הכרטיס
    ...SHADOWS.sm,
  },
  // padded=false לכרטיס עם תמונה שנוגעת בקצוות (המסך מוסיף ריווח פנימי בעצמו).
  padded: { padding: SPACING.lg },
  pressed: { opacity: 0.9 },
});

// SectionLabel — כותרת מקטע אחידה (RTL).
// כותרת מימין; מונה אופציונלי צמוד לכותרת; פעולה עדינה (טקסט + חץ) בקצה שמאל.
// מחליף את כותרות-המקטע הידניות שכל מסך המציא מחדש.
import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, SPACING } from "../../app/src/theme";

export default function SectionLabel({ title, count, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        {count != null ? <Text style={styles.count}>{count}</Text> : null}
      </View>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ChevronLeft size={16} color={COLORS.textSecondary} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  titleWrap: { flexDirection: "row-reverse", alignItems: "center", gap: SPACING.sm },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, textAlign: "right" },
  count: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.textMuted,
    // מיישר את המונה לגובה בסיס הכותרת.
    marginTop: 2,
  },
  action: { flexDirection: "row-reverse", alignItems: "center", gap: 2 },
  actionText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
});

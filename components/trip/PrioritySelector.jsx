import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, FONTS, RADIUS, SPACING } from "../../app/src/theme";
import { MAX_PRIORITIES, PRIORITY_FACTORS } from "../../app/src/constants/tripPriorities";

// בורר דירוג חשיבות מסודר — משותף לשאלון (PreferencesQuiz) ולעדכון-מהפרופיל
// (UpdateTravelPreferences). Presentational בלבד, Controlled: value = מערך keys לפי הסדר,
// onToggle(key). ללא state פנימי, ללא רשת, ללא ידע על tripPreferenceId/שמירה.
// לחיצה על גורם נבחר מסירה אותו; על גורם חדש מוסיפה בסוף (עד MAX_PRIORITIES).
export default function PrioritySelector({ value = [], onToggle }) {
  const atMax = value.length >= MAX_PRIORITIES;

  return (
    <View style={styles.wrap}>
      {PRIORITY_FACTORS.map((f) => {
        const order = value.indexOf(f.key); // -1 אם לא נבחר
        const selected = order >= 0;
        const blocked = !selected && atMax; // הגענו למקסימום ולא נבחר
        return (
          <Pressable
            key={f.key}
            style={({ pressed }) => [
              styles.row,
              selected && styles.rowSelected,
              pressed && !selected && !blocked && styles.pressed,
              blocked && styles.rowBlocked,
            ]}
            onPress={() => onToggle?.(f.key)}
            disabled={blocked}
          >
            <View style={[styles.badge, selected && styles.badgeSelected]}>
              {selected ? <Text style={styles.badgeText}>{order + 1}</Text> : null}
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  rowSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  rowBlocked: {
    opacity: 0.45,
  },
  pressed: { backgroundColor: COLORS.background },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.backgroundSunk,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  badgeText: {
    color: COLORS.surface,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },
  labelSelected: {
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },
});

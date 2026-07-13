// Button — כפתור אחיד לכל האפליקציה.
// וריאנטים: primary (מותג), coral (מבטא יחיד), light (על רקע כהה/מותג),
// ghost (ללא רקע). מובנה בו: מצב טעינה, מצב מושבת, לחיצה עם משוב עדין,
// אייקון-פתיחה (lucide) אופציונלי. משקל הטקסט וההיררכיה מטוקנים בלבד.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../../app/src/theme";

const TONE = {
  primary: { bg: COLORS.brand, fg: COLORS.onBrand, off: COLORS.textMuted },
  coral: { bg: COLORS.coral, fg: "#FFFFFF", off: COLORS.textMuted },
  light: { bg: COLORS.surface, fg: COLORS.brand, off: "#FFFFFF" },
  // ניטרלי-משני (למשל "הסר מההצעות") — רקע עמום, טקסט משני.
  secondary: { bg: COLORS.divider, fg: COLORS.textSecondary, off: COLORS.divider },
  // הרסני עדין (חסימה/מחיקה) — רקע אדום-רך, טקסט אדום; לא צועק אבל ברור.
  danger: { bg: COLORS.dangerLight, fg: COLORS.danger, off: COLORS.dangerLight },
  ghost: { bg: "transparent", fg: COLORS.brand, off: "transparent" },
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  Icon,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}) {
  const tone = TONE[variant] || TONE.primary;
  const isOff = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isOff, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        { backgroundColor: isOff ? tone.off : tone.bg },
        variant === "ghost" && styles.ghost,
        pressed && !isOff && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.label, { color: tone.fg }]} numberOfLines={1}>
            {label}
          </Text>
          {Icon ? <Icon size={18} color={tone.fg} strokeWidth={2.2} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: RADIUS.lg, alignItems: "center", justifyContent: "center" },
  // row-reverse: הטקסט מימין והאייקון משמאל (RTL).
  row: { flexDirection: "row-reverse", alignItems: "center", gap: SPACING.sm },
  md: { height: 44, paddingHorizontal: SPACING.lg },
  lg: { height: 54, paddingHorizontal: SPACING.xl },
  ghost: { paddingHorizontal: SPACING.sm },
  label: { fontFamily: FONTS.bold, fontSize: 16 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});

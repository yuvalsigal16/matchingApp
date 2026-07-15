// EmptyState — מצב-ריק אחיד וממורכז: עיגול-אייקון, כותרת, כתובית, ו-CTA אופציונלי.
// מצב ריק הוא הזמנה לפעולה, לא מבוי סתום (Bible §10). מחליף את מצבי-הריק שכל מסך
// כתב בנפרד (שורת טקסט אפורה בודדת). מבוסס על מצב-הריק של הצ'אט/Matches.
//
// ה-CTA נבנה מ-Button הקיים — אותה שפת-כפתורים, בלי לשכפל סגנון.
import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../../app/src/theme";
import Button from "./Button";

export default function EmptyState({ Icon, title, subtitle, actionLabel, onAction, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {Icon ? (
        <View style={styles.iconCircle}>
          <Icon size={30} color={COLORS.brand} strokeWidth={1.8} />
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="md" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: SPACING.xl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: "center" },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  action: { marginTop: SPACING.lg, alignSelf: "stretch" },
});

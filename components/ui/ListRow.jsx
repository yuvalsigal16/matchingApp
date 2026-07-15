// ListRow — שורת-רשימה אחידה (RTL): גב-אייקון עגול בקצה ימין, כותרת (+כתובית),
// וחץ-המשך בקצה שמאל. מחליף את דפוס "אייקון-בריבוע + כותרת + chevron" שכל מסך
// שכפל בנפרד (Settings, notifications, תפריט הפרופיל, שורות ה-Home).
//
// אחריות אחת: שורה אחת. רשימה = כמה ListRow-ים עם רווח ביניהם (המסך מסדר).
// מסגרת-שיער ללא צל — הטיפול השקט של רשימות (כמו שורות ה-Home). לכרטיס-תוכן
// עצמאי עם נוכחות גדולה יותר יש Card נפרד.
import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../../app/src/theme";

export default function ListRow({
  Icon,
  title,
  subtitle,
  onPress,
  trailing, // undefined = חץ ברירת-מחדל; null = בלי חץ; node = טריילינג מותאם
  danger = false,
  accessibilityLabel,
  style,
}) {
  const tint = danger ? COLORS.danger : COLORS.brand;
  const iconBg = danger ? COLORS.dangerLight : COLORS.brandLight;
  const titleColor = danger ? COLORS.danger : COLORS.text;

  const content = (
    <>
      {Icon ? (
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Icon size={20} color={tint} strokeWidth={2} />
        </View>
      ) : null}

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing === undefined ? (
        <ChevronLeft size={18} color={COLORS.textMuted} strokeWidth={2} />
      ) : (
        trailing
      )}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: { flex: 1, alignItems: "flex-end" },
  title: { fontFamily: FONTS.semibold, fontSize: 15, textAlign: "right" },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 2,
  },
  pressed: { opacity: 0.85 },
});

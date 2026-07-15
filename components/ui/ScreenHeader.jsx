// ScreenHeader — כותרת-מסך אחידה (RTL): חץ-חזרה בקצה ימין, כותרת h1 מיושרת לימין,
// וסלוט אופציונלי בקצה שמאל (אווטר/פעולה/תפריט). מחליף את ה-header הידני שכל מסך
// המציא מחדש (fontSize/צבע/יישור שונים) — טיפול אחד, בכל מקום.
//
// משלים את Screen: Screen נותן את המעטפת והרקע; ScreenHeader יושב בראשו כשורה ראשונה.
import { ChevronRight } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "../../app/src/theme";

export default function ScreenHeader({ title, onBack, right = null }) {
  return (
    <View style={styles.row}>
      {/* חץ חזרה מצביע ימינה (RTL) ויושב בקצה הימני. onBack נשלט ע"י המסך —
          כדי לשמר בדיוק את התנהגות הניווט הקיימת (back / replace). */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <ChevronRight size={26} color={COLORS.brand} strokeWidth={2.2} />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  // טיפול-כותרת יחיד לכל האפליקציה: h1, צבע טקסט, מיושר לימין.
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    textAlign: "right",
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  spacer: { width: 26 },
});

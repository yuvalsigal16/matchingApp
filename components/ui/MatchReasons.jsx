import { StyleSheet, Text, View } from "react-native";
import { Leaf, Moon, Mountain, Users, Utensils, Wind, Zap } from "lucide-react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "../../app/src/theme";

// מיפוי שם-אייקון (מהמנוע ב-matchReasons) → רכיב lucide. מקור יחיד לכל המסכים
// שמציגים "סיבות התאמה", כדי שאותו key יראה אותו אייקון בכרטיס ובפרופיל.
const ICONS = { Mountain, Zap, Leaf, Users, Moon, Utensils, Wind };

// מציג רשימת "סיבות התאמה" כשורות אייקון+טקסט שקטות בגוון המותג (RTL).
// size: "sm" (כרטיס — טקסט קטן, שורה אחת) | "md" (מסך פרופיל — טקסט גוף, עד שתי שורות).
export default function MatchReasons({ reasons = [], size = "sm", style }) {
  if (!reasons.length) return null;
  const iconSize = size === "md" ? 16 : 13;
  const textStyle = size === "md" ? TYPOGRAPHY.body : TYPOGRAPHY.caption;
  const maxLines = size === "md" ? 2 : 1;
  return (
    <View style={[styles.wrap, style]}>
      {reasons.map((r) => {
        const Icon = ICONS[r.icon] || Mountain;
        return (
          <View key={r.key} style={styles.row}>
            <Icon size={iconSize} color={COLORS.brand} strokeWidth={2} />
            <Text style={[textStyle, styles.text]} numberOfLines={maxLines}>
              {r.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xs + 1 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: SPACING.sm - 2 },
  text: { color: COLORS.textSecondary, textAlign: "right", flexShrink: 1 },
});

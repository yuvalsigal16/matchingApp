// RouteLine — האלמנט-החתימה של צמד חמד.
// שרשרת עצירות על קו-מסלול דק, עם עצירה אחת מודגשת ("אתם כאן") בגוון המבטא.
// רומז על מפה / נתיב-מסע בלי איור מילולי. שקט, מקורי, שייך למוצר טרוול-לשניים.
// שימוש עתידי: כמפריד עדין, בכותרות מסע, וכטקסטורה על ה-hero.
import { StyleSheet, View } from "react-native";
import { COLORS } from "../../app/src/theme";

export default function RouteLine({
  nodes = 4,
  activeIndex = 1,
  color = "rgba(255,255,255,0.55)",
  accent = COLORS.coral,
  rtl = false,
  style,
}) {
  const items = [];
  for (let i = 0; i < nodes; i++) {
    const active = i === activeIndex;
    items.push(
      <View
        key={`d${i}`}
        style={[
          styles.dot,
          { backgroundColor: color, borderColor: color },
          active && [styles.dotActive, { backgroundColor: accent, borderColor: accent }],
        ]}
      />,
    );
    if (i < nodes - 1) {
      items.push(<View key={`l${i}`} style={[styles.seg, { backgroundColor: color }]} />);
    }
  }

  // rtl: העצירה הראשונה (ההתחלה) בימין, וההתקדמות זורמת שמאלה — כיוון-מסע נכון בעברית.
  return (
    <View
      style={[styles.row, rtl && styles.rowRtl, style]}
      pointerEvents="none"
      accessible={false}
    >
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rowRtl: { flexDirection: "row-reverse" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    // הילה עדינה סביב העצירה הפעילה.
    shadowColor: COLORS.coral,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  seg: { flex: 1, height: 1.5, marginHorizontal: 4, opacity: 0.7, borderRadius: 1 },
});

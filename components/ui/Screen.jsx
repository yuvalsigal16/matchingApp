// Screen — מעטפת מסך אחידה: SafeAreaView + רקע הנייר החם.
// הגוטר (SPACING.xl) נשאר באחריות התוכן/ScrollView של כל מסך, כדי שרכיבים
// שנדבקים לקצה (rails אופקיים, hero במלוא הרוחב) יוכלו לחרוג ממנו בכוונה.
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../app/src/theme";

export default function Screen({ children, style, edges = ["top", "left", "right", "bottom"] }) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.body, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1 },
});

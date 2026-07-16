import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Star, Users } from "lucide-react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "../src/theme";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ListRow from "../../components/ui/ListRow";
import BottomNav from "../../components/BottomNav";

// מסך גילוי — hub ניווט: בחירה בין קהילות להמלצות של מטיילים אחרים.
export default function DiscoveryScreen() {
  const router = useRouter();

  // יעדי הגילוי — שורות ניווט אחידות (ListRow), עיגול-אייקון brand + חץ-המשך.
  const items = [
    {
      title: "יצירת קהילה / הצטרפות",
      sub: "לפי תחומי עניין",
      Icon: Users,
      route: "/community",
    },
    {
      title: "המלצות של אחרים",
      sub: "על מקומות ואטרקציות",
      Icon: Star,
      route: "/recommendations",
    },
  ];

  return (
    <Screen>
      <ScreenHeader title="גילוי וקהילה" onBack={() => router.back()} />

      <Text style={styles.lead}>התחבר/י לאנשים עם אהבה לטיולים</Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <ListRow
            key={item.route}
            Icon={item.Icon}
            title={item.title}
            subtitle={item.sub}
            onPress={() => router.push(item.route)}
          />
        ))}
      </ScrollView>

      <BottomNav active="discovery" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // שורת-פתיח — זהה בשפתה ל-lead של מסך הקהילות (שפה עקבית).
  lead: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "right",
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  list: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
});

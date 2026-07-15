import { useRouter } from "expo-router";
import { Bell, Compass, House, User } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { COLORS, SPACING } from "../app/src/theme";

// תפריט תחתון - מופיע בכל מסכי הטאבים.
// קלט: active = מפתח המסך הנוכחי כדי לסמן את הפריט בצבע המותג.
//
// סדר הפריטים נשמר כמקור (RTL): "בית" בקצה ימין כי הוא הראשי.
// ללא תוויות טקסט - בסגנון אפליקציות מובילות (אינסטגרם וכו').
// פעיל/לא-פעיל נבדל בצבע (מותג/עמום) ובעובי-קו עדין — רמז מיקום שקט, בלי אנימציה.
const TABS = [
  { key: "profile", Icon: User, route: "/PersonalProfile", label: "פרופיל" },
  { key: "notifications", Icon: Bell, route: "/notifications", label: "התראות" },
  { key: "discovery", Icon: Compass, route: "/discovery", label: "גילוי" },
  { key: "home", Icon: House, route: "/Home", label: "בית" },
];

export default function BottomNav({ active }) {
  const router = useRouter();

  return (
    <View style={styles.bottomNav}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.Icon;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Icon
              size={26}
              color={isActive ? COLORS.brand : COLORS.textMuted}
              strokeWidth={isActive ? 2.4 : 2}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md + 2,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  navItem: {
    width: 56,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});

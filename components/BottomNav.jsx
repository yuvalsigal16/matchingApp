import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { COLORS } from "../app/src/theme";

// תפריט תחתון - מופיע בכל מסכי הטאבים.
// קלט: active = מפתח המסך הנוכחי כדי לסמן את הפריט בצבע המותג.
//
// סדר הפריטים נשמר כמקור (RTL): "בית" בקצה ימין כי הוא הראשי.
// ללא תוויות טקסט - בסגנון אפליקציות מובילות (אינסטגרם וכו').
// האייקון מתחלף בין מתאר (outline) לא-פעיל למלא בפעיל - רמז עדין למיקום.
const TABS = [
  { key: "profile", icon: "person", route: "/PersonalProfile", label: "פרופיל" },
  { key: "notifications", icon: "notifications", route: "/notifications", label: "התראות" },
  { key: "discovery", icon: "compass", route: "/discovery", label: "גילוי" },
  { key: "home", icon: "home", route: "/Home", label: "בית" },
];

export default function BottomNav({ active }) {
  const router = useRouter();

  return (
    <View style={styles.bottomNav}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
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
            <Ionicons
              name={isActive ? tab.icon : `${tab.icon}-outline`}
              size={26}
              color={isActive ? COLORS.brand : COLORS.textMuted}
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
    paddingVertical: 12,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navItem: {
    width: 56,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});

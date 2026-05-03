import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

// תפריט תחתון - מופיע בכל מסכי הטאבים
// קלט: active = שם המסך הנוכחי כדי לסמן את האייקון בצבע פעיל
export default function BottomNav({ active }) {
  const router = useRouter();

  // צבע לפי סטטוס - כחול כהה אם זה המסך הפעיל, אחרת אפור
  const colorFor = (key) => (active === key ? "#1A3C40" : "#9A9A9A");

  return (
    <View style={styles.bottomNav}>
      {/* פרופיל */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/PersonalProfile")}
      >
        <Ionicons name="person-outline" size={26} color={colorFor("profile")} />
      </TouchableOpacity>

      {/* התראות וצ'אטים */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/notifications")}
      >
        <Ionicons
          name="notifications-outline"
          size={26}
          color={colorFor("notifications")}
        />
      </TouchableOpacity>

      {/* גילוי וקהילה */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/discovery")}
      >
        <Ionicons
          name="compass-outline"
          size={26}
          color={colorFor("discovery")}
        />
      </TouchableOpacity>

      {/* בית */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/Home")}
      >
        <Ionicons name="home" size={26} color={colorFor("home")} />
      </TouchableOpacity>
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
    backgroundColor: "#F5F0E8",
    borderTopWidth: 1,
    borderTopColor: "#E5DBC7",
  },
  navItem: {
    width: 56,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});

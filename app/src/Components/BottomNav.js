import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

// קומפוננטת תפריט ניווט תחתון המקבלת את אובייקט הניווט ואת שם הדף הפעיל
export default function BottomNav({ navigation, active }) {
  return (
    <View style={styles.bottomNav}>
      // כפתור ניווט למסך הפרופיל האישי
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate("PersonalProfile")}
      >
        // הצגת אייקון עם שינוי צבע דינמי במידה והמסך הוא המסך הפעיל
        <Ionicons
          name="person-outline"
          size={26}
          color={active === "profile" ? "#1A3C40" : "#9A9A9A"}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem}>
        <Ionicons name="chatbubble-outline" size={26} color="#9A9A9A" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem}>
        <Ionicons name="compass-outline" size={26} color="#9A9A9A" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate("Home")}
      >
        <Ionicons
          name="home"
          size={26}
          color={active === "home" ? "#1A3C40" : "#9A9A9A"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // עיצוב שורת התפריט: סידור האייקונים בשורה עם רווחים שווים ורקע מותאם
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

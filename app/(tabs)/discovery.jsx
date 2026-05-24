import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../../components/BottomNav";
import { FONTS } from "../../theme/fonts";

// מסך גילוי וקהילה - מציג שני כפתורים: קהילות והמלצות
export default function DiscoveryScreen() {
  const router = useRouter();

  // הגדרת הפריטים בתפריט
  const items = [
    {
      title: "קהילות לפי תחומי עניין",
      icon: "people-outline",
      route: "/community",
    },
    {
      title: "המלצות על מקומות ואטרקציות",
      icon: "star-outline",
      route: "/recommendations",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header עם חץ חזרה למסך הראשי */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>גילוי וקהילה</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(item.route)}
          >
            <Ionicons name="chevron-back" size={20} color="#1A3C40" />
            <Text style={styles.cardText}>{item.title}</Text>
            <View style={styles.iconBox}>
              <Ionicons name={item.icon} size={22} color="#1A3C40" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <BottomNav active="discovery" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  header: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  cardText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
    marginHorizontal: 12,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0D5E8",
    justifyContent: "center",
    alignItems: "center",
  },
});

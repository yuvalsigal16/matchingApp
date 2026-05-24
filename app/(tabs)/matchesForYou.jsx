import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../components/BottomNav";
import { FONTS } from "../../theme/fonts";

export default function MatchesScreen() {
  const router = useRouter();

  // 🔹 דוגמה זמנית של בקשות (בהמשך יבוא מהשרת)
  const [requests, setRequests] = useState([
    {
      id: "1",
      name: "דניאל כהן",
      age: 27,
      image: null,
    },
    {
      id: "2",
      name: "נועה לוי",
      age: 24,
      image: null,
    },
  ]);

  // ✔ אישור בקשה
  const handleAccept = (id) => {
    setRequests((prev) => prev.filter((item) => item.id !== id));
    console.log("accepted:", id);

    // כאן בעתיד תוסיפי גם קריאה לשרת:
    // await acceptRequest(id);
  };

  // ✖ דחייה
  const handleReject = (id) => {
    setRequests((prev) => prev.filter((item) => item.id !== id));
    console.log("rejected:", id);

    // כאן בעתיד תוסיפי גם קריאה לשרת:
    // await rejectRequest(id);
  };

  // 👤 מעבר לפרופיל
  const openProfile = (user) => {
    router.push({
      pathname: "/profile/[userId]",
      params: { userId: user.id },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header עם חץ חזרה למסך הראשי */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>התאמות עבורך</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* ScrollView - מאפשר גלילה של כל התוכן */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* בקשות לצ'אט */}
        <Text style={styles.sectionTitle}>בקשות לשיחה</Text>

        {requests.length === 0 ? (
          <Text style={styles.placeholder}>אין בקשות חדשות</Text>
        ) : (
          requests.map((item) => (
            <View key={item.id} style={styles.requestCard}>
              {/* תמונה */}
              <Image source={{ uri: item.image }} style={styles.avatar} />

              {/* שם לחיץ */}
              <TouchableOpacity
                onPress={() => openProfile(item)}
                style={{ flex: 1 }}
              >
                <Text style={styles.name}>{item.name}</Text>
              </TouchableOpacity>

              {/* כפתורי פעולה */}
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleAccept(item.id)}>
                  <Ionicons name="checkmark-circle" size={28} color="green" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleReject(item.id)}>
                  <Ionicons name="close-circle" size={28} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* התאמות (placeholder) */}
        <Text style={styles.sectionTitle}>פרופילים מתאימים עבורך</Text>
        <Text style={styles.placeholder}>כאן יוצגו התאמות בהמשך...</Text>
      </ScrollView>

      <BottomNav active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
  },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "right",
    color: "#1A3C40",
  },

  requestCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#ccc",
    marginLeft: 10,
  },

  name: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    textAlign: "right",
    color: "#1A3C40",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  placeholder: {
    color: "#888",
    textAlign: "center",
    marginTop: 10,
    fontFamily: FONTS.regular,
  },
});

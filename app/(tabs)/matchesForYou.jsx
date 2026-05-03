import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FONTS } from "../src/theme/fonts";

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

  const renderRequest = ({ item }) => (
    <View style={styles.requestCard}>
      {/* תמונה */}
      <Image source={{ uri: item.image }} style={styles.avatar} />

      {/* שם לחיץ */}
      <TouchableOpacity onPress={() => openProfile(item)}>
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>התאמות עבורך</Text>

      {/* בקשות לצ'אט */}
      <Text style={styles.sectionTitle}>בקשות לשיחה</Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* התאמות (placeholder) */}
      <Text style={styles.sectionTitle}>פרופילים מתאימים עבורך</Text>
      <Text style={styles.placeholder}>כאן יוצגו התאמות בהמשך...</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
    padding: 16,
  },

  title: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    marginBottom: 12,
    textAlign: "right",
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "right",
    color: "#333",
  },

  requestCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
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
    flex: 1,
    textAlign: "right",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  placeholder: {
    color: "#888",
    textAlign: "center",
    marginTop: 10,
  },
});
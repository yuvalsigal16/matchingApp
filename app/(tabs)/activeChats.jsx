import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { FONTS } from "../src/theme/fonts";
import { getUser } from "../src/auth/authStore";
import { getMyMatches } from "../src/api/notificationService";
import BottomNav from "../../components/BottomNav";

// מסך הצ'אטים הפעילים - מציג את כל ההתאמות הפעילות של המשתמש
export default function ActiveChatsScreen() {
  const router = useRouter();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    const userId = getUser()?.userID;
    if (!userId) {
      setLoading(false);
      return;
    }

    // משיכת ההתאמות מהשרת
    const data = await getMyMatches(userId);

    // מציגים רק התאמות פעילות (לא סגורות)
    const active = data.filter((m) => m.status !== "Closed");

    setMatches(active);
    setLoading(false);
  };

  // קביעת ה-userID של הצד השני בהתאמה
  const getOtherUserId = (match) => {
    const me = getUser()?.userID;
    return match.user1ID === me ? match.user2ID : match.user1ID;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header עם חץ חזרה */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>צ'אטים פעילים</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {matches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={40} color="#aaa" />
            <Text style={styles.emptyText}>אין צ'אטים פעילים עדיין</Text>
          </View>
        ) : (
          matches.map((match) => {
            const otherId = getOtherUserId(match);
            return (
              <TouchableOpacity
                key={match.matchID}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  // בעתיד - ינווט למסך הצ'אט עצמו עם matchID
                  router.push({
                    pathname: "/profile/[userId]",
                    params: { userId: otherId },
                  })
                }
              >
                {/* אווטר זמני */}
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color="#fff" />
                </View>

                {/* פרטי הצ'אט */}
                <View style={styles.cardText}>
                  <Text style={styles.name}>משתמש #{otherId}</Text>
                  <Text style={styles.lastMsg}>לחץ כדי להתחיל לשוחח</Text>
                </View>

                <Ionicons name="chevron-back" size={20} color="#1A3C40" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="notifications" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  header: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1A3C40",
    justifyContent: "center",
    alignItems: "center",
  },

  cardText: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "flex-end",
  },

  name: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  lastMsg: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#666",
    marginTop: 2,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
    fontFamily: FONTS.regular,
  },
});

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

import { COLORS, FONTS } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import { getMyMatches } from "../src/api/notificationService";
import BottomNav from "../../components/BottomNav";

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

    const data = await getMyMatches(userId);

    // רק התאמות פעילות (אפשר לשנות בעתיד אם רוצים גם סגורות)
    const active = data.filter((m) => m.status !== "Closed");

    // 🔥 קיבוץ לפי טיול
    const grouped = groupByTrip(active);

    setMatches(grouped);
    setLoading(false);
  };

  // קיבוץ לפי tripId
  const groupByTrip = (matches) => {
    const grouped = {};

    matches.forEach((m) => {
      if (!grouped[m.tripId]) {
        grouped[m.tripId] = {
          tripId: m.tripId,
          tripName: m.tripName || `טיול #${m.tripId}`,
          tripEndDate: m.tripEndDate,
          chats: [],
        };
      }

      grouped[m.tripId].chats.push(m);
    });

    return Object.values(grouped);
  };

  // מציאת המשתמש השני בצ'אט
  const getOtherUserId = (match) => {
    const me = getUser()?.userID;
    return match.user1ID === me ? match.user2ID : match.user1ID;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>

        <Text style={styles.header}>צ'אטים</Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {matches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>אין צ'אטים עדיין</Text>
          </View>
        ) : (
          matches.map((trip) => {
            const isPast =
              trip.tripEndDate &&
              new Date(trip.tripEndDate) < new Date();

            return (
              <View key={trip.tripId} style={{ marginBottom: 20 }}>
                
                {/* 🔹 כותרת טיול */}
                <Text
                  style={[
                    styles.tripTitle,
                    isPast && { color: COLORS.textMuted },
                  ]}
                >
                  {trip.tripName}
                </Text>

                {/* 🔹 רשימת צ'אטים של הטיול */}
                {trip.chats.map((match) => {
                  const otherId = getOtherUserId(match);

                  return (
                    <TouchableOpacity
                      key={match.matchID}
                      style={[
                        styles.card,
                        isPast && styles.cardPast,
                      ]}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/chat/[matchId]",
                          params: { matchId: match.matchID },
                        })
                      }
                    >
                      {/* אווטר */}
                      <View style={styles.avatar}>
                        <Ionicons name="person" size={24} color={COLORS.onBrand} />
                      </View>

                      {/* טקסט */}
                      <View style={styles.cardText}>
                        <Text style={styles.name}>
                          משתמש #{otherId}
                        </Text>
                        <Text style={styles.lastMsg}>
                          לחץ כדי להמשיך צ'אט
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-back"
                        size={20}
                        color={COLORS.brand}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="notifications" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
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
    color: COLORS.brand,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  tripTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    marginBottom: 8,
    textAlign: "right",
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  cardPast: {
    backgroundColor: COLORS.divider,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.brand,
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
    color: COLORS.brand,
  },

  lastMsg: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});
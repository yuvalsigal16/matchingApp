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

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { FONTS } from "../src/theme/fonts";
import BottomNav from "../../components/BottomNav";

// מסך המלצות - מציג המלצות שהתקבלו על מקומות בטיולים של המשתמש
export default function RecommendationsScreen() {
  const router = useRouter();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  // טעינת ההמלצות: קודם משיכת הטיולים של המשתמש, ואז המלצות לכל טיול
  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const userId = getUser()?.userID;
      const token = getToken();
      if (!userId || !token) {
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // 1. משיכת כל הטיולים של המשתמש
      const tripsRes = await fetch(`${BASE_URL}/Trips/user/${userId}`, {
        headers,
      });
      if (!tripsRes.ok) {
        setLoading(false);
        return;
      }
      const trips = await tripsRes.json();

      // 2. לכל טיול - משיכת ההמלצות שלו (במקביל לכולם)
      const allRecs = await Promise.all(
        trips.map(async (trip) => {
          const res = await fetch(
            `${BASE_URL}/Recommendation/trip/${trip.tripID}`,
            { headers }
          );
          if (!res.ok) return [];
          const recs = await res.json();
          // מצרפים את שם הטיול לכל המלצה כדי שנציג אותו
          return recs.map((r) => ({ ...r, tripName: trip.destination }));
        })
      );

      // 3. שטיחה של כל המערכים לרשימה אחת
      setRecommendations(allRecs.flat());
    } catch (err) {
      console.error("loadRecommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  // הצגת כוכבים לפי דירוג
  const renderStars = (rating) => {
    const r = rating || 0;
    return "⭐".repeat(r) + "☆".repeat(5 - r);
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
        <Text style={styles.header}>המלצות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {recommendations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="star-outline" size={40} color="#aaa" />
            <Text style={styles.emptyText}>אין המלצות עדיין</Text>
          </View>
        ) : (
          recommendations.map((rec) => (
            <View key={rec.recommendationID} style={styles.card}>
              {/* אייקון */}
              <View style={styles.iconBox}>
                <Ionicons name="location-outline" size={22} color="#1A3C40" />
              </View>

              {/* פרטי המלצה */}
              <View style={styles.cardText}>
                <Text style={styles.title}>{rec.placeName}</Text>
                {rec.tripName && (
                  <Text style={styles.tripName}>בטיול: {rec.tripName}</Text>
                )}
                {rec.description && (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {rec.description}
                  </Text>
                )}
                <Text style={styles.stars}>{renderStars(rec.rating)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* כפתור צף להוספת המלצה (יבנה בעתיד) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => console.log("Add new recommendation")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <BottomNav active="discovery" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
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
    paddingBottom: 100,
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E7F3FF",
    justifyContent: "center",
    alignItems: "center",
  },

  cardText: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  tripName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#1877F2",
    marginTop: 2,
  },

  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#666",
    marginTop: 4,
    textAlign: "right",
  },

  stars: {
    fontSize: 13,
    marginTop: 6,
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

  fab: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: "#1A3C40",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});

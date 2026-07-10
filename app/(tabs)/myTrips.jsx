import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../../components/BottomNav";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

export default function MyTripsScreen() {
  const router = useRouter();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);



  const loadTrips = async () => {
  try {
    const userId = getUser()?.userID;
    const token = getToken();

    if (!userId || !token) return;

    const res = await fetch(
      `${BASE_URL}/Trip/user/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = text ? JSON.parse(text) : [];
    setTrips(data);
  } catch (err) {
    console.log("Trips error:", err);
  } finally {
    setLoading(false);
  }
};

// טעינה ראשונית — עובד גם ב-web שבו useFocusEffect לא תמיד נורה
useEffect(() => {
  loadTrips();
}, []);

// טעינה מחדש בכל פעם שהמסך חוזר לפוקוס (ניווט חזרה)
useFocusEffect(
  useCallback(() => {
    loadTrips();
  }, [])
);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  const isPastTrip = (endDate) => {
    return new Date(endDate) < new Date();
  };

  const getStatusText = (status) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "פעיל";

    case "matched":
      return "יוצא לדרך";

    case "completed":
      return "הושלם";

    case "closed":
      return "נסגר";

    default:
      return status || "פעיל";
  }
};

  const renderTripCard = (trip) => {
    const past = isPastTrip(trip.endDate);

    return (
      <TouchableOpacity
        key={trip.tripID}
        style={[styles.card, past && styles.cardPast]}
        activeOpacity={0.85}
        onPress={() =>
  router.push({
    pathname: "/TripDetails/[id]",
    params: { id: trip.tripID },
  })
}
      >
        {/* כותרת ראשית */}
        <View style={styles.row}>
          <Text style={[styles.title, past && styles.textPast]}>
            {trip.tripName || trip.TripName || trip.destination || "טיול"}
          </Text>

          <Ionicons
            name="chevron-back"
            size={20}
            color={past ? COLORS.textMuted : COLORS.brand}
          />
        </View>

        {/* יעד */}
        <Text style={[styles.subtitle, past && styles.textPast]}>
          יעד: {trip.destination}
        </Text>

        {/* תאריכים */}
        <Text style={[styles.subtitle, past && styles.textPast]}>
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </Text>

        {/* סטטוס */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              past ? styles.statusPast : styles.statusActive,
            ]}
          >
           <Text style={styles.statusText}>
  {past
    ? "הסתיים"
    : getStatusText(trip.status)}
</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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
      {/* Header עם חץ חזרה למסך הראשי */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הטיולים שלי</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ריק */}
        {trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="map-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>אין לך טיולים עדיין</Text>
          </View>
        ) : (
          trips.map(renderTripCard)
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/PreferencesQuiz",
            params: { mode: "newTrip" },
          })
        }
      >
        <Ionicons name="add" size={30} color={COLORS.onBrand} />
      </TouchableOpacity>

      <BottomNav active="trips" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // flex: 1 - ה-ScrollView לוקח את כל המקום הפנוי בין ה-Header ל-BottomNav.
  // בלי flex הוא לא יודע מה גובהו ולא ניתן לגלול בו.
  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    // paddingBottom גדול כדי שהכפתור הצף (+) וה-BottomNav לא יסתירו את הכרטיס האחרון.
    paddingBottom: 170,
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
    color: COLORS.brand,
  },

  /* כרטיס */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  cardPast: {
    backgroundColor: COLORS.divider,
    opacity: 0.85,
  },

  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
  },

  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: "right",
  },

  textPast: {
    color: COLORS.textMuted,
  },

  statusRow: {
    marginTop: 10,
    alignItems: "flex-end",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  statusActive: {
    backgroundColor: COLORS.brand,
  },

  statusPast: {
    backgroundColor: COLORS.textMuted,
  },

  statusText: {
    color: COLORS.onBrand,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },

  /* ריק */
  emptyBox: {
    marginTop: 60,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  fab: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: COLORS.brand,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft, MapPin, Plus } from "lucide-react-native";

import BottomNav from "../../components/BottomNav";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";

export default function MyTripsScreen() {
  const router = useRouter();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = async () => {
    try {
      const userId = getUser()?.userID;
      const token = getToken();

      if (!userId || !token) return;

      const res = await fetch(`${BASE_URL}/Trip/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = text ? JSON.parse(text) : [];
      setTrips(data);
    } catch (err) {
      console.error("Trips error:", err);
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

  // ניווט ליצירת מסע חדש — משותף לפלוס שבכותרת ול-CTA של מצב-הריק (אותו יעד בדיוק).
  const goNewTrip = () =>
    router.push({ pathname: "/PreferencesQuiz", params: { mode: "newTrip" } });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  const isPastTrip = (endDate) => {
    if (!endDate) return false; // כרטיס לכיוון אחד (ללא תאריך חזרה) — לא נחשב "עבר"
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
    const destination = trip.destination || trip.Destination;
    const name = trip.tripName || trip.TripName;
    const title = destination || name || "טיול";

    return (
      <Card
        key={trip.tripID}
        onPress={() =>
          router.push({ pathname: "/TripDetails/[id]", params: { id: trip.tripID } })
        }
        accessibilityLabel={`מסע ל${title}`}
        style={[styles.tripCard, past && styles.tripCardPast]}
      >
        {/* יעד — ה"לאן", דומיננטי, עם סימן-מקום (זהות טְרַוְול) */}
        <View style={styles.tripTop}>
          <View style={styles.pin}>
            <MapPin
              size={18}
              color={past ? COLORS.textMuted : COLORS.brand}
              strokeWidth={2}
            />
          </View>
          <View style={styles.tripTitleBlock}>
            <Text style={[styles.tripDest, past && styles.textPast]} numberOfLines={1}>
              {title}
            </Text>
            {name && destination && name !== destination ? (
              <Text style={[styles.tripName, past && styles.textPast]} numberOfLines={1}>
                {name}
              </Text>
            ) : null}
          </View>
          <ChevronLeft size={18} color={COLORS.textMuted} strokeWidth={2} />
        </View>

        {/* תאריכים */}
        <Text style={[styles.tripDates, past && styles.textPast]}>
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
        </Text>

        {/* סטטוס — צ'יפ רגוע (גוון-מותג פעיל / אפור עבר), לא מלבן מותג מלא */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, past ? styles.statusPast : styles.statusActive]}>
            <Text style={[styles.statusText, past ? styles.statusTextPast : styles.statusTextActive]}>
              {past ? "הסתיים" : getStatusText(trip.status)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // טעינה — שלד רגוע במקום ספינר, באותו מבנה כרטיס (מעבר חלק לתוכן).
  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="הטיולים שלי" onBack={() => router.back()} />
        <View style={styles.content}>
          {[0, 1, 2].map((i) => (
            <Card key={i} style={styles.tripCard}>
              <View style={styles.skelLine} />
              <View style={styles.skelLineShort} />
              <View style={styles.skelBadge} />
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* פלוס בכותרת — אותה שפה כמו יצירת קהילה במסך הקהילות */}
      <ScreenHeader
        title="הטיולים שלי"
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            onPress={goNewTrip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="תכנון מסע חדש"
          >
            <Plus size={24} color={COLORS.brand} strokeWidth={2.4} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {trips.length === 0 ? (
          <EmptyState
            Icon={MapPin}
            title="עוד לא תכננתם מסע"
            subtitle="בחרו יעד ותאריכים — ומכאן נמצא לכם עם מי לצאת לדרך."
            actionLabel="תכננו מסע ראשון"
            onAction={goNewTrip}
            style={styles.empty}
          />
        ) : (
          trips.map(renderTripCard)
        )}
      </ScrollView>

      <BottomNav active="trips" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },

  // ── כרטיס מסע ──
  tripCard: { marginBottom: SPACING.md },
  tripCardPast: { opacity: 0.85 },

  tripTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  tripTitleBlock: { flex: 1, alignItems: "flex-end" },
  tripDest: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: "right" },
  tripName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 2,
  },
  textPast: { color: COLORS.textMuted },

  tripDates: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: SPACING.md,
  },

  statusRow: { marginTop: SPACING.sm, alignItems: "flex-end" },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  statusActive: { backgroundColor: COLORS.brandLight },
  statusPast: { backgroundColor: COLORS.backgroundSunk },
  statusText: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bold },
  statusTextActive: { color: COLORS.brand },
  statusTextPast: { color: COLORS.textMuted },

  // ── מצב ריק ──
  empty: { marginTop: SPACING.xxxl + SPACING.lg },

  // ── שלד טעינה ──
  skelLine: {
    height: 16,
    width: "60%",
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundSunk,
    alignSelf: "flex-end",
  },
  skelLineShort: {
    height: 12,
    width: "40%",
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundSunk,
    alignSelf: "flex-end",
    marginTop: SPACING.md,
  },
  skelBadge: {
    height: 22,
    width: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.backgroundSunk,
    alignSelf: "flex-end",
    marginTop: SPACING.md,
  },
});

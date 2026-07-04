import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";
import { getUserProfile } from "../../src/api/userProfileService";
import { COLORS, FONTS } from "../../src/theme";
import HeaderMenu from "../../../components/HeaderMenu";

const STATUS_HE = {
  active: "פעיל",
  matched: "נמצאה התאמה",
  inactive: "לא פעיל",
  pending: "ממתין",
};

// כפתור־גלולה לניווט (סגנון האב): אייקון עגול בצד, כותרת, וחץ עדין.
function HubButton({ icon, label, tint, bg, onPress }) {
  return (
    <TouchableOpacity
      style={styles.hubBtn}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.hubIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.hubLabel} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function TripDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [trip, setTrip] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [creator, setCreator] = useState(null);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  const isPast = trip?.endDate && new Date(trip.endDate) < new Date();

  /* ========================= NAVIGATION ========================= */

  /* ========================= LOAD DATA ========================= */

  const showAlert = (title, msg) => {
    if (Platform.OS === "web") window.alert(`${title}\n${msg}`);
    else Alert.alert(title, msg);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const tripRes = await fetch(`${BASE_URL}/Trip/${id}`, { headers });
        if (!tripRes.ok) throw new Error("Trip load failed");
        const tripData = await tripRes.json();
        setTrip(tripData);

        // קריאות עצמאיות — מריצים במקביל לקיצור זמן הטעינה.
        await Promise.all([
          // פרטי יוצר הטיול
          (async () => {
            const creatorId = tripData.createdByUserID ?? tripData.CreatedByUserID;
            if (creatorId) {
              try {
                const profile = await getUserProfile(creatorId);
                if (profile) setCreator(profile);
              } catch { /* לא נורא אם נכשל */ }
            }
          })(),

          // משתתפים
          (async () => {
            try {
              const participantsRes = await fetch(`${BASE_URL}/TripParticipant/trip/${id}`, { headers });
              if (participantsRes.ok) setParticipants((await participantsRes.json()) || []);
            } catch { /* אין משתתפים — לא נורא */ }
          })(),
        ]);
      } catch (err) {
        console.log(err);
        showAlert("שגיאה", "טעינת הטיול נכשלה");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadData();
  }, [id]);

  /* ========================= MANAGE (edit / deactivate / delete) ========================= */

  const confirmAndRun = (title, msg, action) => {
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n${msg}`)) action();
    } else {
      Alert.alert(title, msg, [
        { text: "ביטול", style: "cancel" },
        { text: "אישור", style: "destructive", onPress: action },
      ]);
    }
  };

  const handleDeleteTrip = () => {
    confirmAndRun("מחיקת טיול", "האם למחוק את הטיול לצמיתות?", async () => {
      try {
        setDeleting(true);
        const token = getToken();
        const res = await fetch(`${BASE_URL}/Trip/${id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("מחיקה נכשלה");
        router.back();
      } catch (err) {
        showAlert("שגיאה", err.message);
      } finally {
        setDeleting(false);
      }
    });
  };

  const handleDeactivate = () => {
    confirmAndRun("השבתת טיול", "הטיול יסומן כלא פעיל. ניתן להפעיל מחדש בעתיד.", async () => {
      try {
        setDeleting(true);
        const token = getToken();
        const res = await fetch(`${BASE_URL}/Trip/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ...trip, status: "Inactive" }),
        });
        if (!res.ok) throw new Error("השבתה נכשלה");
        setTrip((prev) => ({ ...prev, status: "Inactive" }));
        showAlert("בוצע", "הטיול הושבת בהצלחה");
      } catch (err) {
        showAlert("שגיאה", err.message);
      } finally {
        setDeleting(false);
      }
    });
  };

  /* ========================= LOADING ========================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.value}>לא נמצא טיול</Text>
      </SafeAreaView>
    );
  }

  const statusKey = String(trip.status).toLowerCase();
  const statusLabel = STATUS_HE[statusKey] || trip.status;
  const isMatched = statusKey === "matched";
  const destination = trip.destination ?? trip.Destination;

  const otherParticipants = participants.filter((p) => {
    const creatorId = trip?.createdByUserID ?? trip?.CreatedByUserID;
    return p.userID !== creatorId && p.userId !== creatorId;
  });

  // פעולות ניהול — בתוך תפריט 3 הנקודות, כדי לשמור על מסך נקי.
  const manageItems = [
    {
      label: "ערוך טיול",
      onPress: () =>
        router.push({
          pathname: "/PreferencesQuiz",
          params: { mode: "editTrip", tripId: id },
        }),
    },
    ...(trip.status !== "Inactive"
      ? [{ label: "השבת טיול", onPress: handleDeactivate }]
      : []),
    { label: "מחק טיול", destructive: true, onPress: handleDeleteTrip },
  ];

  /* ========================= UI ========================= */

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>פרטי טיול</Text>

        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="אפשרויות"
          disabled={deleting}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      <HeaderMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={manageItems}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={[styles.hero, isPast && styles.heroPast]}>
          <View style={styles.heroTopRow}>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{statusLabel}</Text>
            </View>
            <Ionicons name="airplane" size={26} color="rgba(255,255,255,0.55)" />
          </View>

          <Text style={styles.heroDest} numberOfLines={1}>
            {destination}
          </Text>

          <View style={styles.heroDatesRow}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.92)" />
            <Text style={styles.heroDates}>
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </Text>
          </View>
        </View>

        {/* HUB — כפתורי ניווט */}
        <HubButton
          icon="people"
          label="פרופילים עבורך"
          tint={COLORS.primary}
          bg={COLORS.primaryLight}
          onPress={() =>
            router.push({ pathname: "/TripMatches/[id]", params: { id } })
          }
        />

        <HubButton
          icon="checkmark-done"
          label="רשימת משימות"
          tint={COLORS.success}
          bg={COLORS.successLight}
          onPress={() =>
            router.push({
              pathname: "/TripToDo/[id]",
              params: { id, name: destination },
            })
          }
        />

        <HubButton
          icon="star"
          label="המלצות"
          tint={COLORS.coral}
          bg={COLORS.coralLight}
          onPress={() =>
            router.push({
              pathname: "/recommendations",
              params: { tripId: id, tripName: destination },
            })
          }
        />

        {isMatched && (
          <HubButton
            icon="calendar"
            label="יומן הטיול"
            tint={COLORS.amberDark}
            bg={COLORS.amberLight}
            onPress={() =>
              router.push({ pathname: "/TripPlanner/[id]", params: { id } })
            }
          />
        )}

        {/* משתתפים */}
        <Text style={styles.sectionTitle}>משתתפים</Text>
        <View style={styles.card}>
          {creator && (
            <View style={styles.participant}>
              <View style={styles.pAvatar}>
                <Ionicons name="person" size={18} color={COLORS.onBrand} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.pName}>
                  {creator.firstName} {creator.lastName}
                </Text>
                <Text style={styles.label}>יוצר הטיול</Text>
              </View>
            </View>
          )}

          {otherParticipants.map((p, i) => (
            <View
              key={i}
              style={[styles.participant, (creator || i > 0) && styles.participantDivider]}
            >
              <View style={[styles.pAvatar, styles.pAvatarMuted]}>
                <Ionicons name="person" size={18} color={COLORS.onBrand} />
              </View>
              <Text style={styles.pName}>
                {p.firstName} {p.lastName}
              </Text>
            </View>
          ))}

          {!creator && otherParticipants.length === 0 && (
            <Text style={styles.value}>אין משתתפים</Text>
          )}
        </View>

        {/* דירוג ההתאמה (לטיול שהסתיים) */}
        {isPast && (
          <>
            <Text style={styles.sectionTitle}>דרגו את ההתאמה</Text>
            <View style={styles.card}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={rating >= star ? "star" : "star-outline"}
                      size={34}
                      color={COLORS.amber}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
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

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.brand },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // ── Hero ──
  hero: {
    backgroundColor: COLORS.coral,
    borderRadius: 22,
    padding: 20,
    marginTop: 6,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  heroPast: { backgroundColor: COLORS.textSecondary, shadowColor: COLORS.textSecondary },
  heroTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusChipText: { color: "#FFFFFF", fontSize: 12, fontFamily: FONTS.bold },
  heroDest: {
    fontSize: 25,
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
    textAlign: "right",
    marginTop: 14,
  },
  heroDatesRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  heroDates: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.92)",
  },

  // ── Hub buttons ──
  hubBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  hubIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  hubLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
  },

  // ── Sections / cards ──
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginTop: 18,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  value: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },

  // ── Participants ──
  participant: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  participantDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  pAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  pAvatarMuted: { backgroundColor: COLORS.textMuted },
  pName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, textAlign: "right" },

  // ── Chats ──
  chatRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  chatName: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },

  // ── Rating ──
  starsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 6,
  },
});

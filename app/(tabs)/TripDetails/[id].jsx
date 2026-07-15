import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CalendarDays,
  Calendar,
  EllipsisVertical,
  ListChecks,
  MapPin,
  Plane,
  Star,
  Users,
} from "lucide-react-native";

import HeaderMenu from "../../../components/HeaderMenu";
import Avatar from "../../../components/ui/Avatar";
import Card from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import ListRow from "../../../components/ui/ListRow";
import Screen from "../../../components/ui/Screen";
import ScreenHeader from "../../../components/ui/ScreenHeader";
import SectionLabel from "../../../components/ui/SectionLabel";
import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";
import { getUserProfile } from "../../src/api/userProfileService";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../../src/theme";

const STATUS_HE = {
  active: "פעיל",
  matched: "נמצאה התאמה",
  inactive: "לא פעיל",
  pending: "ממתין",
};

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

  /* ========================= LOADING / EMPTY ========================= */

  if (loading) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <ScreenHeader title="פרטי טיול" onBack={() => router.back()} />
        <View style={styles.content}>
          <View style={styles.heroSkeleton} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.rowSkeleton} />
          ))}
        </View>
      </Screen>
    );
  }

  if (!trip) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <ScreenHeader title="פרטי טיול" onBack={() => router.back()} />
        <EmptyState
          Icon={MapPin}
          title="לא נמצא טיול"
          subtitle="ייתכן שהטיול נמחק או שאין הרשאה לצפות בו."
          style={styles.notFound}
        />
      </Screen>
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
  // בטיול שהסתיים אין עריכה/השבתה (פעולות על טיול עתידי) — נשארת רק מחיקה (ניהול היסטוריה).
  const manageItems = [
    ...(!isPast
      ? [
          {
            label: "ערוך טיול",
            onPress: () =>
              router.push({
                pathname: "/PreferencesQuiz",
                params: { mode: "editTrip", tripId: id },
              }),
          },
        ]
      : []),
    ...(!isPast && trip.status !== "Inactive"
      ? [{ label: "השבת טיול", onPress: handleDeactivate }]
      : []),
    { label: "מחק טיול", destructive: true, onPress: handleDeleteTrip },
  ];

  /* ========================= UI ========================= */

  const menuButton = (
    <TouchableOpacity
      onPress={() => setMenuVisible(true)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="אפשרויות"
      disabled={deleting}
    >
      <EllipsisVertical size={24} color={COLORS.brand} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScreenHeader title="פרטי טיול" onBack={() => router.back()} right={menuButton} />

      <HeaderMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={manageItems}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO — יעד כאובייקט מרכזי, בגוון המותג (כמו ה-hero ב-Home) */}
        <View style={[styles.hero, isPast && styles.heroPast]}>
          <View style={styles.heroTopRow}>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{statusLabel}</Text>
            </View>
            <Plane size={26} color="rgba(255,255,255,0.55)" strokeWidth={2} />
          </View>

          <Text style={styles.heroDest} numberOfLines={1}>
            {destination}
          </Text>

          <View style={styles.heroDatesRow}>
            <Calendar size={14} color="rgba(255,255,255,0.92)" strokeWidth={2} />
            <Text style={styles.heroDates}>
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </Text>
          </View>
        </View>

        {/* HUB — כניסות ניווט. אייקונים מאוחדים לגוון-מותג אחד (בלי קשת צבעים). */}
        {/* חיפוש שותפים/התאמות רלוונטי רק לטיול עתידי — מוסתר בטיול שהסתיים. */}
        {!isPast && (
          <ListRow
            Icon={Users}
            title="פרופילים עבורך"
            onPress={() => router.push({ pathname: "/TripMatches/[id]", params: { id } })}
            style={styles.hubRow}
          />
        )}

        <ListRow
          Icon={ListChecks}
          title="רשימת משימות"
          onPress={() =>
            router.push({ pathname: "/TripToDo/[id]", params: { id, name: destination } })
          }
          style={styles.hubRow}
        />

        <ListRow
          Icon={Star}
          title="המלצות"
          onPress={() =>
            router.push({ pathname: "/recommendations", params: { tripId: id, tripName: destination } })
          }
          style={styles.hubRow}
        />

        {isMatched && (
          <ListRow
            Icon={CalendarDays}
            title="יומן הטיול"
            onPress={() => router.push({ pathname: "/TripPlanner/[id]", params: { id } })}
            style={styles.hubRow}
          />
        )}

        {/* משתתפים */}
        <SectionLabel title="משתתפים" style={styles.sectionLabel} />
        <Card>
          {creator && (
            <View style={styles.participant}>
              <Avatar
                uri={creator.profileImage || creator.ProfileImage}
                name={`${creator.firstName || ""} ${creator.lastName || ""}`}
                size="sm"
              />
              <View style={styles.pInfo}>
                <Text style={styles.pName} numberOfLines={1}>
                  {creator.firstName} {creator.lastName}
                </Text>
                <Text style={styles.pRole}>יוצר הטיול</Text>
              </View>
            </View>
          )}

          {otherParticipants.map((p, i) => (
            <View
              key={i}
              style={[styles.participant, (creator || i > 0) && styles.participantDivider]}
            >
              <Avatar name={`${p.firstName || ""} ${p.lastName || ""}`} size="sm" />
              <View style={styles.pInfo}>
                <Text style={styles.pName} numberOfLines={1}>
                  {p.firstName} {p.lastName}
                </Text>
              </View>
            </View>
          ))}

          {!creator && otherParticipants.length === 0 && (
            <Text style={styles.emptyLine}>אין משתתפים</Text>
          )}
        </Card>

        {/* דירוג ההתאמה (לטיול שהסתיים) */}
        {isPast && (
          <>
            <SectionLabel title="דרגו את ההתאמה" style={styles.sectionLabel} />
            <Card>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`דירוג ${star} מתוך 5`}
                  >
                    <Star
                      size={32}
                      color={COLORS.amber}
                      fill={rating >= star ? COLORS.amber : "transparent"}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },

  // ── Hero ──
  hero: {
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    ...SHADOWS.md,
  },
  heroPast: { backgroundColor: COLORS.textSecondary },
  heroTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusChipText: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bold, color: COLORS.onBrand },
  heroDest: {
    ...TYPOGRAPHY.h2,
    color: COLORS.onBrand,
    textAlign: "right",
    marginTop: SPACING.md,
  },
  heroDatesRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.sm,
  },
  heroDates: { ...TYPOGRAPHY.caption, color: "rgba(255,255,255,0.92)" },

  // ── Hub ──
  hubRow: { marginBottom: SPACING.sm + 2 },

  // ── Sections ──
  sectionLabel: { marginTop: SPACING.lg },

  // ── Participants ──
  participant: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  participantDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.hairline,
  },
  pInfo: { flex: 1, alignItems: "flex-end" },
  pName: { ...TYPOGRAPHY.bodyBold, color: COLORS.text, textAlign: "right" },
  pRole: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  emptyLine: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: "right" },

  // ── Rating ──
  starsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: SPACING.sm,
  },

  // ── Skeletons ──
  heroSkeleton: {
    height: 120,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.backgroundSunk,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  rowSkeleton: {
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundSunk,
    marginBottom: SPACING.sm + 2,
  },

  notFound: { marginTop: SPACING.xxxl },
});

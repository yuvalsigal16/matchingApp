import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Calendar,
  Plane,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  User,
  Users,
} from "lucide-react-native";

import BottomNav from "../../../components/BottomNav";
import Screen from "../../../components/ui/Screen";
import ScreenHeader from "../../../components/ui/ScreenHeader";
import SectionLabel from "../../../components/ui/SectionLabel";
import EmptyState from "../../../components/ui/EmptyState";
import Tappable from "../../../components/ui/Tappable";
import { BASE_URL } from "../../src/api/config";
import { buildImageUri } from "../../src/utils/image";
import { getAllUsers } from "../../src/api/userService";
import {
  getTripPreferenceInterests,
  getTripPreferencePriorities,
  getTripPreferences,
  getUserTrips,
} from "../../src/api/tripService";
import { logInteraction } from "../../src/api/interactionService";
import { getToken, getUser } from "../../src/auth/authStore";
import { computeTripPreferenceScore } from "../../src/matching/tripPreferenceScore";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../../src/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = 160; // רוחב כרטיס בשורת קטגוריה (גלילה אופקית)
const GRID_CARD_W = (SCREEN_W - SPACING.xl * 2 - SPACING.md) / 2; // 2 עמודות במסך "ראה הכל"

// חישוב גיל מתאריך לידה (ISO string או Date)
function computeAge(birthDate) {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// ממיר את מחרוזת ה-Interests (JSON מ-SP) למערך שמות. תומך גם במערך מוכן.
function parseInterestNames(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it) => (typeof it === "string" ? it : it?.interestName || it?.InterestName))
    .filter(Boolean);
}

// ── עזרי תאריך/יעד לקטגוריות ──
function toDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
// חפיפת טווחי תאריכים (אם אין תאריך סיום — מתייחסים ליום היציאה בלבד).
function datesOverlap(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !bStart) return false;
  const ae = aEnd || aStart;
  const be = bEnd || bStart;
  return aStart <= be && bStart <= ae;
}
function sameDestination(a, b) {
  const x = (a || "").trim().toLowerCase();
  const y = (b || "").trim().toLowerCase();
  return x.length > 0 && x === y;
}
// טיול עתידי/פעיל (לא הסתיים, לא הושבת)
function isLiveTrip(trip) {
  if (!trip) return false;
  if (String(trip.status || "").toLowerCase() === "inactive") return false;
  const end = toDate(trip.endDate) || toDate(trip.startDate);
  if (end && end < new Date(new Date().toDateString())) return false;
  return true;
}

export default function TripMatchesScreen() {
  const router = useRouter();
  const { id: tripId } = useLocalSearchParams();

  const [myTrip, setMyTrip] = useState(null);
  const [users, setUsers] = useState([]);
  const [pref, setPref] = useState(null);
  const [prefInterests, setPrefInterests] = useState([]);
  const [priorityFactors, setPriorityFactors] = useState([]);
  const [tripsByUser, setTripsByUser] = useState({}); // userID -> trips[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null); // מפתח קטגוריה במצב "ראה הכל"

  useEffect(() => {
    if (tripId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const enrichServerUser = (u) => ({
    ...u,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
    age: computeAge(u.birthDate),
    profileImage: u.profileImage ?? null,
    interests: parseInterestNames(u.interests),
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const me = getUser();
      if (!me?.userID) {
        setError("אין משתמש מחובר");
        return;
      }

      const token = getToken();
      const [usersRes, prefRes, tripRes] = await Promise.allSettled([
        getAllUsers(me.userID),
        getTripPreferences(tripId),
        fetch(`${BASE_URL}/Trip/${tripId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

      const serverUsers = (
        usersRes.status === "fulfilled" ? usersRes.value || [] : []
      ).filter((u) => u && u.userID);
      const enriched = serverUsers.map(enrichServerUser);
      setUsers(enriched);

      setMyTrip(tripRes.status === "fulfilled" ? tripRes.value : null);

      const tripPref = prefRes.status === "fulfilled" ? prefRes.value : null;
      setPref(tripPref);

      if (tripPref?.tripPreferenceID) {
        try {
          const ints = await getTripPreferenceInterests(tripPref.tripPreferenceID);
          setPrefInterests((ints || []).map((i) => i.interestName).filter(Boolean));
        } catch {}
        try {
          const prios = await getTripPreferencePriorities(tripPref.tripPreferenceID);
          setPriorityFactors(
            (prios || [])
              .slice()
              .sort((a, b) => a.priorityRank - b.priorityRank)
              .map((x) => x.factor)
              .filter(Boolean),
          );
        } catch {}
      }

      // טיולים של כל מועמד (דרך ה-endpoint הקיים, קריאה לכל אחד).
      const tripsArrays = await Promise.all(
        enriched.map((u) => getUserTrips(u.userID).catch(() => [])),
      );
      const map = {};
      enriched.forEach((u, i) => {
        map[u.userID] = (tripsArrays[i] || []).filter(isLiveTrip);
      });
      setTripsByUser(map);
    } catch (err) {
      console.error("Failed loading trip matches:", err);
      setError("טעינת ההתאמות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  // ציון התאמה (העדפות + דירוג חשיבות) לכל מועמד → Map userID->score.
  const scoreByUser = useMemo(() => {
    const result = {};
    if (!pref) return result;
    users.forEach((user) => {
      // אלגוריתם התאמת העדפות הטיול (חולץ ל-tripPreferenceScore).
      result[user.userID] = computeTripPreferenceScore(
        user,
        pref,
        prefInterests,
        priorityFactors,
      );
    });
    return result;
  }, [users, pref, prefInterests, priorityFactors]);

  // קיבוץ לקטגוריות (שורות בסגנון נטפליקס).
  const categories = useMemo(() => {
    if (users.length === 0) return [];

    const myDest = (myTrip?.destination || "").trim();
    const myStart = toDate(myTrip?.startDate);
    const myEnd = toDate(myTrip?.endDate);

    // מועמדי-טיול: זוג (משתמש + טיול שלו), עם הציון של המשתמש.
    const tripCandidates = [];
    users.forEach((user) => {
      (tripsByUser[user.userID] || []).forEach((trip) => {
        tripCandidates.push({ user, trip, score: scoreByUser[user.userID] ?? 0 });
      });
    });

    // משאיר מועמד אחד לכל משתמש (הכי מתאים) בקטגוריה, וממיין לפי ציון.
    const dedupeByUser = (arr) => {
      const seen = new Map();
      arr.forEach((c) => {
        const cur = seen.get(c.user.userID);
        if (!cur || c.score > cur.score) seen.set(c.user.userID, c);
      });
      return [...seen.values()].sort((a, b) => b.score - a.score);
    };

    const cats = [];

    if (myDest && (myStart || myEnd)) {
      const items = dedupeByUser(
        tripCandidates.filter(
          (c) =>
            sameDestination(c.trip.destination, myDest) &&
            datesOverlap(myStart, myEnd, toDate(c.trip.startDate), toDate(c.trip.endDate)),
        ),
      );
      cats.push({ key: "perfect", icon: "star", title: "התאמה מושלמת לטיול שלך", items });
    }

    if (myDest) {
      const items = dedupeByUser(
        tripCandidates.filter((c) => sameDestination(c.trip.destination, myDest)),
      );
      cats.push({ key: "destination", icon: "airplane", title: `טסים ל${myDest}`, items });
    }

    if (myStart || myEnd) {
      const items = dedupeByUser(
        tripCandidates.filter((c) =>
          datesOverlap(myStart, myEnd, toDate(c.trip.startDate), toDate(c.trip.endDate)),
        ),
      );
      cats.push({ key: "dates", icon: "calendar", title: "טסים בתאריכים שלך", items });
    }

    // התאמה אישית גבוהה — לפי הציון בלבד (גם למי שעדיין אין לו טיול פעיל).
    const personality = users
      .map((user) => {
        const best = (tripsByUser[user.userID] || [])[0] || null;
        return { user, trip: best, score: scoreByUser[user.userID] ?? 0 };
      })
      .filter((c) => c.user.name && c.score > 0)
      .sort((a, b) => b.score - a.score);
    cats.push({ key: "personality", icon: "sparkles", title: "התאמה אישית גבוהה", items: personality });

    // משאירים רק קטגוריות לא ריקות.
    return cats.filter((c) => c.items.length > 0);
  }, [users, tripsByUser, scoreByUser, myTrip]);

  const openProfile = (user, score) => {
    logInteraction(user.userID, "View"); // מתעד צפייה למנוע ההתנהגותי
    // הקשר ההתאמה — טיול, עם מזהה הטיול והציון שכבר חושב כאן (העדפות טיול).
    const matchContext = {
      type: "trip",
      tripId: Number(tripId),
      score,
    };
    router.push({
      pathname: "/MatchProfileDetails",
      params: {
        user: JSON.stringify(user),
        matchContext: JSON.stringify(matchContext),
      },
    });
  };

  const formatDates = (trip) => {
    const s = toDate(trip?.startDate);
    if (!s) return null;
    const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const e = toDate(trip?.endDate);
    return e ? `${fmt(s)}–${fmt(e)}` : fmt(s);
  };

  // ── כרטיס מועמד ── שפה זהה לכרטיס ב-matchesForYou (שם מתחת לתמונה, תג ענבר,
  // fallback brandLight+User), עם מטא ייחודי לטיול (יעד · תאריכים) שמשמר את זהות ה-Trip.
  const renderCard = (item, inGrid) => {
    const { user, trip, score } = item;
    const imageUri = buildImageUri(user.profileImage);
    const dates = formatDates(trip);
    const nameLine = `${user.name}${user.age != null ? `, ${user.age}` : ""}`;
    return (
      <View
        key={`${user.userID}-${trip?.tripID ?? "x"}`}
        style={[{ width: inGrid ? GRID_CARD_W : CARD_W }, !inGrid && styles.cardFlipped]}
      >
        <Tappable
          style={styles.card}
          onPress={() => openProfile(user, score)}
          accessibilityRole="button"
          accessibilityLabel={`הצגת הפרופיל של ${nameLine}`}
        >
          <View style={styles.cardPhotoWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.cardPhoto} />
            ) : (
              <View style={[styles.cardPhoto, styles.cardPhotoFallback]}>
                <User size={40} color={COLORS.brand} strokeWidth={1.6} />
              </View>
            )}

            {/* תג ציון ההתאמה לטיול — ענבר (אות-ההתאמה של המערכת). */}
            <View style={styles.scoreBadge}>
              <Sparkles size={11} color={COLORS.amberDark} strokeWidth={2.4} />
              <Text style={styles.scoreBadgeText}>{score}%</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {nameLine}
            </Text>

            {/* מטא הטיול — יעד + תאריכים (סימן-מסע עדין), אחרת תחומי עניין. */}
            {trip?.destination ? (
              <View style={styles.cardMetaRow}>
                <Plane size={12} color={COLORS.brand} strokeWidth={2} />
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {trip.destination}{dates ? ` · ${dates}` : ""}
                </Text>
              </View>
            ) : dates ? (
              <View style={styles.cardMetaRow}>
                <Calendar size={12} color={COLORS.brand} strokeWidth={2} />
                <Text style={styles.cardMeta} numberOfLines={1}>{dates}</Text>
              </View>
            ) : (
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMetaMuted} numberOfLines={1}>
                  {user.interests.slice(0, 2).join(" · ") || "אין עדיין טיול פעיל"}
                </Text>
              </View>
            )}
          </View>
        </Tappable>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>טוען התאמות לטיול...</Text>
        </View>
        <BottomNav active="trips" />
      </Screen>
    );
  }

  // ── מצב "ראה הכל" — גריד מלא של קטגוריה אחת ──
  const expandedCat = expanded ? categories.find((c) => c.key === expanded) : null;
  if (expandedCat) {
    return (
      <Screen>
        <ScreenHeader title={expandedCat.title} onBack={() => setExpanded(null)} />
        <ScrollView
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {expandedCat.items.map((item) => renderCard(item, true))}
          </View>
        </ScrollView>
        <BottomNav active="trips" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="התאמות לטיול" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <EmptyState
            Icon={TriangleAlert}
            title="טעינת ההתאמות נכשלה"
            subtitle={error}
            style={styles.empty}
          />
        ) : !pref ? (
          <EmptyState
            Icon={SlidersHorizontal}
            title="אין עדיין העדפות לטיול"
            subtitle="הגדירו העדפות לטיול כדי שנמצא לכם שותפים שמתאימים לו."
            style={styles.empty}
          />
        ) : categories.length === 0 ? (
          <EmptyState
            Icon={Users}
            title="אין התאמות כרגע"
            subtitle="עדיין לא מצאנו מטיילים שמתאימים לטיול הזה."
            style={styles.empty}
          />
        ) : (
          categories.map((cat) => (
            <View key={cat.key} style={styles.section}>
              <SectionLabel
                title={cat.title}
                actionLabel={cat.items.length > 3 ? "הצגת הכל" : undefined}
                onAction={cat.items.length > 3 ? () => setExpanded(cat.key) : undefined}
                style={styles.sectionHeader}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.rowScroll}
                contentContainerStyle={styles.rowContent}
              >
                {cat.items.map((item) => renderCard(item, false))}
              </ScrollView>
            </View>
          ))
        )}
      </ScrollView>

      <BottomNav active="trips" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  content: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxxl,
  },

  // מצב-ריק — היסט עליון בתוך ה-ScrollView (EmptyState מטפל במרכוז ובריווח האופקי).
  empty: { marginTop: SPACING.xxxl },

  // ── מקטע קטגוריה (שורת רכבת) ──
  section: { marginTop: SPACING.lg },
  sectionHeader: { paddingHorizontal: SPACING.xl },

  // היפוך אופקי כדי שהשורה תתחיל מימין (RTL); כל כרטיס מתהפך בחזרה ב-cardFlipped.
  rowScroll: { transform: [{ scaleX: -1 }] },
  cardFlipped: { transform: [{ scaleX: -1 }] },
  rowContent: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 2,
  },

  // ── גריד ("ראה הכל") ──
  gridContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: SPACING.md,
  },

  // ── כרטיס מטייל — שפה זהה לכרטיס ב-matchesForYou ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    overflow: "hidden",
    ...SHADOWS.sm,
  },
  cardPhotoWrap: {
    width: "100%",
    height: 160,
    backgroundColor: COLORS.backgroundSunk,
  },
  cardPhoto: { width: "100%", height: "100%" },
  cardPhotoFallback: {
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  // תג התאמה — ענבר (אות ה"התאמה" של המערכת), זהה לכרטיס ב-matchesForYou.
  scoreBadge: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.amberLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  scoreBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.amberDark,
  },
  cardBody: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 2,
    paddingBottom: SPACING.md,
  },
  cardName: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.semibold,
    color: COLORS.text,
    textAlign: "right",
  },
  // מטא הטיול — יעד/תאריכים, סימן-מסע עדין (כמו שורת העיר ב-matchesForYou).
  cardMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  cardMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    flex: 1,
  },
  cardMetaMuted: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    flex: 1,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNav from "../../../components/BottomNav";
import { BASE_URL } from "../../src/api/config";
import { getAllUsers } from "../../src/api/userService";
import {
  getTripPreferenceInterests,
  getTripPreferencePriorities,
  getTripPreferences,
  getUserTrips,
} from "../../src/api/tripService";
import { logInteraction } from "../../src/api/interactionService";
import { getToken, getUser } from "../../src/auth/authStore";
import { COLORS, FONTS } from "../../src/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = 160; // רוחב כרטיס בשורת קטגוריה (גלילה אופקית)
const GRID_CARD_W = (SCREEN_W - 16 * 2 - 12) / 2; // 2 עמודות במסך "ראה הכל"

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

// בונה URI מלא לתמונה (השרת עשוי להחזיר נתיב יחסי)
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
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

// =========================================
// 🧠 משקלים + דירוג חשיבות אישי לאלגוריתם ההתאמה לטיול.
// =========================================
const TRIP_WEIGHTS = {
  gender: 25,
  interests: 25,
  age: 20,
  smoker: 10,
  kosher: 10,
  shabbat: 10,
  spontaneity: 15,
  lifestyle: 15,
};
const LEVEL_RANGE = 4;
const AGE_DECAY = 10;
const PRIORITY_MULTIPLIERS = [2, 1.5, 1.2];
function priorityMult(factor, orderedFactors) {
  const idx = orderedFactors.indexOf(factor);
  return idx >= 0 && idx < PRIORITY_MULTIPLIERS.length
    ? PRIORITY_MULTIPLIERS[idx]
    : 1;
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
      console.log("Failed loading trip matches:", err);
      setError("טעינת ההתאמות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  // ציון התאמה (העדפות + דירוג חשיבות) לכל מועמד → Map userID->score.
  const scoreByUser = useMemo(() => {
    const result = {};
    if (!pref) return result;
    const wantedInterests = prefInterests.map((s) => String(s).toLowerCase());

    users.forEach((user) => {
      let earned = 0;
      let maxPossible = 0;
      const add = (factor, baseWeight, fraction) => {
        const w = baseWeight * priorityMult(factor, priorityFactors);
        maxPossible += w;
        earned += w * fraction;
      };

      if (pref.preferredGender) {
        add("gender", TRIP_WEIGHTS.gender, user.gender === pref.preferredGender ? 1 : 0);
      }
      if (
        user.age != null &&
        pref.preferredAgeMin != null &&
        pref.preferredAgeMax != null
      ) {
        let frac;
        if (user.age >= pref.preferredAgeMin && user.age <= pref.preferredAgeMax) {
          frac = 1;
        } else {
          const dist =
            user.age < pref.preferredAgeMin
              ? pref.preferredAgeMin - user.age
              : user.age - pref.preferredAgeMax;
          frac = Math.max(0, 1 - dist / AGE_DECAY);
        }
        add("age", TRIP_WEIGHTS.age, frac);
      }
      if (wantedInterests.length > 0 && user.interests.length > 0) {
        const theirs = new Set(user.interests.map((s) => String(s).toLowerCase()));
        const matched = wantedInterests.filter((i) => theirs.has(i)).length;
        add("interests", TRIP_WEIGHTS.interests, matched / wantedInterests.length);
      }
      if (pref.isSmoker != null && user.isSmoker != null) {
        add("smoker", TRIP_WEIGHTS.smoker, pref.isSmoker === user.isSmoker ? 1 : 0);
      }
      if (pref.keepsKosher != null && user.keepsKosher != null) {
        add("kosher", TRIP_WEIGHTS.kosher, pref.keepsKosher === user.keepsKosher ? 1 : 0);
      }
      if (pref.keepsShabbat != null && user.keepsShabbat != null) {
        add("shabbat", TRIP_WEIGHTS.shabbat, pref.keepsShabbat === user.keepsShabbat ? 1 : 0);
      }
      if (pref.spontaneityLevel != null && user.spontaneityLevel != null) {
        const diff = Math.abs(pref.spontaneityLevel - user.spontaneityLevel);
        add("spontaneity", TRIP_WEIGHTS.spontaneity, Math.max(0, 1 - diff / LEVEL_RANGE));
      }
      if (pref.lifestyleLevel != null && user.lifestyleLevel != null) {
        const diff = Math.abs(pref.lifestyleLevel - user.lifestyleLevel);
        add("lifestyle", TRIP_WEIGHTS.lifestyle, Math.max(0, 1 - diff / LEVEL_RANGE));
      }

      result[user.userID] = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
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

  const openProfile = (user) => {
    logInteraction(user.userID, "View"); // מתעד צפייה למנוע ההתנהגותי
    router.push({
      pathname: "/MatchProfileDetails",
      params: { user: JSON.stringify(user) },
    });
  };

  const formatDates = (trip) => {
    const s = toDate(trip?.startDate);
    if (!s) return null;
    const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const e = toDate(trip?.endDate);
    return e ? `${fmt(s)}–${fmt(e)}` : fmt(s);
  };

  // ── כרטיס מועמד ──
  const renderCard = (item, inGrid) => {
    const { user, trip, score } = item;
    const imageUri = buildImageUri(user.profileImage);
    const dates = formatDates(trip);
    return (
      <TouchableOpacity
        key={`${user.userID}-${trip?.tripID ?? "x"}`}
        style={[
          styles.card,
          { width: inGrid ? GRID_CARD_W : CARD_W },
          !inGrid && styles.cardFlipped,
        ]}
        activeOpacity={0.9}
        onPress={() => openProfile(user)}
      >
        <View style={styles.cardImageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.cardImageFallback]}>
              <Ionicons name="person" size={44} color={COLORS.onBrand} />
            </View>
          )}
          {/* באדג' ציון */}
          <View style={styles.scoreBadge}>
            <Ionicons name="sparkles" size={12} color={COLORS.amberDark} />
            <Text style={styles.scoreBadgeText}>{score}%</Text>
          </View>
          {/* פס שם תחתון */}
          <View style={styles.cardNameBand}>
            <Text style={styles.cardName} numberOfLines={1}>
              {user.name}{user.age != null ? `, ${user.age}` : ""}
            </Text>
          </View>
        </View>

        {trip?.destination ? (
          <View style={styles.cardMetaRow}>
            <Ionicons name="airplane" size={13} color={COLORS.brand} />
            <Text style={styles.cardMeta} numberOfLines={1}>
              {trip.destination}{dates ? ` · ${dates}` : ""}
            </Text>
          </View>
        ) : dates ? (
          <View style={styles.cardMetaRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.brand} />
            <Text style={styles.cardMeta} numberOfLines={1}>{dates}</Text>
          </View>
        ) : (
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMetaMuted} numberOfLines={1}>
              {user.interests.slice(0, 2).join(" · ") || "אין עדיין טיול פעיל"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.placeholder}>טוען התאמות לטיול...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── מצב "ראה הכל" — גריד מלא של קטגוריה אחת ──
  const expandedCat = expanded ? categories.find((c) => c.key === expanded) : null;
  if (expandedCat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => setExpanded(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
          >
            <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{expandedCat.title}</Text>
          <View style={{ width: 26 }} />
        </View>
        <ScrollView contentContainerStyle={styles.gridContent}>
          <View style={styles.grid}>
            {expandedCat.items.map((item) => renderCard(item, true))}
          </View>
        </ScrollView>
        <BottomNav active="trips" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>התאמות לטיול</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <Text style={styles.placeholder}>{error}</Text>
        ) : !pref ? (
          <Text style={styles.placeholder}>
            לטיול הזה אין עדיין העדפות. ערכו את הטיול כדי להגדיר אותן.
          </Text>
        ) : categories.length === 0 ? (
          <Text style={styles.placeholder}>אין משתמשים להציג כרגע</Text>
        ) : (
          categories.map((cat) => (
            <View key={cat.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>{cat.title}</Text>
                  <Ionicons name={cat.icon} size={18} color={COLORS.brand} />
                </View>
                {cat.items.length > 3 && (
                  <TouchableOpacity
                    onPress={() => setExpanded(cat.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.seeAll}>ראה הכל ›</Text>
                  </TouchableOpacity>
                )}
              </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
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
    flex: 1,
    textAlign: "center",
  },
  content: {
    paddingTop: 6,
    paddingBottom: 120,
  },
  placeholder: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontFamily: FONTS.regular,
    paddingHorizontal: 20,
    lineHeight: 22,
  },

  // ── Section (category row) ──
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  // כותרת קטע: אייקון + טקסט (במקום אמוג'י).
  sectionTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
  },
  seeAll: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    marginLeft: 8,
  },
  // היפוך אופקי כדי שהשורה תתחיל מימין (RTL).
  rowScroll: {
    transform: [{ scaleX: -1 }],
  },
  cardFlipped: {
    transform: [{ scaleX: -1 }],
  },
  rowContent: {
    paddingHorizontal: 16,
    gap: 12,
    flexDirection: "row",
  },

  // ── Grid (see-all) ──
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120,
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
  },

  // ── Card ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardImageWrap: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.divider,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageFallback: {
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.amberLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.amberDark,
  },
  cardNameBand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: FONTS.bold,
    textAlign: "right",
  },
  cardMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
    flex: 1,
  },
  cardMetaMuted: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
    flex: 1,
  },
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BASE_URL } from "../src/api/config";
import { getUserInterests } from "../src/api/interestService";
import {
  approveRequest,
  getPendingRequests,
  rejectRequest,
} from "../src/api/notificationService";
import { getQuestionnaire } from "../src/api/questionnaireService";
import { getUserProfile } from "../src/api/userProfileService";
import { getAllUsers } from "../src/api/userService";
import { getUser } from "../src/auth/authStore";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../components/BottomNav";
import { COLORS, FONTS } from "../src/theme";

const { width: SCREEN_W } = Dimensions.get("window");
// רוחב כרטיס בגריד 2 עמודות (תואם paddingHorizontal:16 + מרווח 12).
const GRID_CARD_W = (SCREEN_W - 16 * 2 - 12) / 2;

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

// ממיר את מחרוזת ה-Interests (JSON מ-FOR JSON PATH ב-SP) למערך שמות.
// תומך גם במערך מוכן (אם השרת כבר פירק).
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

// משקלים לאלגוריתם ההתאמה — מרוכזים במקום אחד לכוונון קל.
// הערך של כל קטגוריה הוא הניקוד המקסימלי שהיא יכולה לתרום.
const WEIGHTS = {
  age: 20,
  interests: 30,
  smoker: 10,
  kosher: 10,
  shabbat: 10,
  spontaneity: 15,
  lifestyle: 15,
};

// טווח ערכי הרמות בשאלון (1-5) → הפרש מקסימלי אפשרי הוא 4.
const LEVEL_RANGE = 4;

export default function MatchesScreen() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);

  const [users, setUsers] = useState([]);

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  // =========================
  // LOAD USERS FROM DB
  // =========================

  useEffect(() => {
    loadUsers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("dismissed_matches").then((raw) => {
        if (raw) {
          try { setDismissed(new Set(JSON.parse(raw))); } catch {}
        }
      });
    }, [])
  );

  // ממיר משתמש שהגיע מועשר מ-/User (SP) לפורמט שהאלגוריתם משתמש בו.
  // השרת מחזיר את כל השדות ישירות - אין צורך בקריאות נוספות.
  const enrichServerUser = (u) => ({
    ...u,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
    age: computeAge(u.birthDate),
    profileImage: u.profileImage ?? null,
    interests: parseInterestNames(u.interests),
  });

  // ממיר את הנתונים של המשתמש המחובר (מגיעים מ-3 endpoints נפרדים)
  // לאותו פורמט. נחוץ כי ה-SP מסנן את המשתמש עצמו מ-/User.
  const buildMyEnrichedData = (loggedInUser, profile, interests, quest) => ({
    ...loggedInUser,
    userID: loggedInUser.userID,
    name: [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim(),
    age: computeAge(profile?.birthDate),
    profileImage: profile?.profileImage ?? loggedInUser.profileImage ?? null,
    interests: (interests || []).map((i) => i?.interestName).filter(Boolean),
    isSmoker: quest?.isSmoker ?? null,
    keepsKosher: quest?.keepsKosher ?? null,
    keepsShabbat: quest?.keepsShabbat ?? null,
    spontaneityLevel: quest?.spontaneityLevel ?? null,
    lifestyleLevel: quest?.lifestyleLevel ?? null,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);

      const loggedInUser = getUser();
      if (!loggedInUser?.userID) {
        console.warn("[MatchesScreen] אין משתמש מחובר");
        return;
      }
      const myId = loggedInUser.userID;

      // קריאה אחת ל-/User מביאה את כל המשתמשים מועשרים -
      // ה-SP כבר מסנן את עצמי + חסומים, ומחזיר 14 שדות לכל אחד.
      // לידם: פרופיל/תחומים/שאלון של המשתמש המחובר + בקשות ממתינות.
      const [
        allUsersRes,
        myProfileRes,
        myInterestsRes,
        myQuestRes,
        pendingRes,
      ] = await Promise.allSettled([
        getAllUsers(myId),
        getUserProfile(myId),
        getUserInterests(myId),
        getQuestionnaire(myId),
        getPendingRequests(myId),
      ]);

      // משתמשים מועשרים מהשרת. מסננים פריטים null/undefined ליתר ביטחון.
      const serverUsers = (
        allUsersRes.status === "fulfilled" ? allUsersRes.value || [] : []
      ).filter((u) => u && u.userID);

      const me = buildMyEnrichedData(
        loggedInUser,
        myProfileRes.status === "fulfilled" ? myProfileRes.value : null,
        myInterestsRes.status === "fulfilled" ? myInterestsRes.value || [] : [],
        myQuestRes.status === "fulfilled" ? myQuestRes.value : null,
      );

      setCurrentUser(me);
      setUsers(serverUsers.map(enrichServerUser));

      // בקשות נכנסות בלבד (אני הנמען)
      const allPending =
        pendingRes.status === "fulfilled" ? pendingRes.value || [] : [];
      const incoming = allPending.filter((r) => r.toUserID === myId);
      setRequests(incoming);
    } catch (err) {
      console.log("Failed loading users:", err);
    } finally {
      setLoading(false);
    }
  };



  // =========================================
  // 🧠 SMART MATCHING ALGORITHM
  // =========================================

  const smartMatches = useMemo(() => {
    if (!currentUser || users.length === 0) {
      return [];
    }

    // תחומי העניין שלי (case-insensitive) — מחושב פעם אחת לכל ההתאמות.
    const myInterests = (currentUser.interests || []).map((s) =>
      String(s).toLowerCase(),
    );

    return (
      users
        .filter((user) => user.name && user.name.trim().length > 0)
        .filter((user) => !dismissed.has(user.userID))
        .map((user) => {
          let earned = 0; // נקודות שנצברו בפועל
          let maxPossible = 0; // מקסימום נקודות על סמך הקטגוריות שניתן להשוות

          // גיל — קרבה בגילים. נספר רק אם לשניהם יש גיל.
          if (user.age != null && currentUser.age != null) {
            maxPossible += WEIGHTS.age;
            const ageDiff = Math.abs(user.age - currentUser.age);
            if (ageDiff <= 2) earned += WEIGHTS.age;
            else if (ageDiff <= 5) earned += WEIGHTS.age * 0.5;
          }

          // תחומי עניין — דמיון Jaccard (חיתוך חלקי איחוד), יחסי ולא חסום.
          // נספר רק אם לשני הצדדים יש לפחות תחום עניין אחד.
          const theirInterests = (user.interests || []).map((s) =>
            String(s).toLowerCase(),
          );
          if (myInterests.length > 0 && theirInterests.length > 0) {
            maxPossible += WEIGHTS.interests;
            const mySet = new Set(myInterests);
            const shared = theirInterests.filter((i) => mySet.has(i)).length;
            const union = new Set([...myInterests, ...theirInterests]).size;
            const jaccard = union > 0 ? shared / union : 0;
            earned += jaccard * WEIGHTS.interests;
          }

          // שאלון — התאמות בוליאניות. נספרות רק כששני הצדדים ענו.
          if (user.isSmoker != null && currentUser.isSmoker != null) {
            maxPossible += WEIGHTS.smoker;
            if (user.isSmoker === currentUser.isSmoker) earned += WEIGHTS.smoker;
          }
          if (user.keepsKosher != null && currentUser.keepsKosher != null) {
            maxPossible += WEIGHTS.kosher;
            if (user.keepsKosher === currentUser.keepsKosher)
              earned += WEIGHTS.kosher;
          }
          if (user.keepsShabbat != null && currentUser.keepsShabbat != null) {
            maxPossible += WEIGHTS.shabbat;
            if (user.keepsShabbat === currentUser.keepsShabbat)
              earned += WEIGHTS.shabbat;
          }

          // רמת ספונטניות (1-5) — ככל שקרוב יותר, ניקוד גבוה יותר (לינארי על הטווח).
          if (
            user.spontaneityLevel != null &&
            currentUser.spontaneityLevel != null
          ) {
            maxPossible += WEIGHTS.spontaneity;
            const diff = Math.abs(
              user.spontaneityLevel - currentUser.spontaneityLevel,
            );
            earned += WEIGHTS.spontaneity * Math.max(0, 1 - diff / LEVEL_RANGE);
          }

          // רמת אורח חיים (1-5) — דומה.
          if (
            user.lifestyleLevel != null &&
            currentUser.lifestyleLevel != null
          ) {
            maxPossible += WEIGHTS.lifestyle;
            const diff = Math.abs(
              user.lifestyleLevel - currentUser.lifestyleLevel,
            );
            earned += WEIGHTS.lifestyle * Math.max(0, 1 - diff / LEVEL_RANGE);
          }

          // נרמול לאחוז על סמך הקטגוריות שבאמת היה אפשר להשוות —
          // כך פרופיל חלקי לא נענש על שדות חסרים.
          const matchScore =
            maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;

          return { ...user, matchScore };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
    );
  }, [users, currentUser, dismissed]);


  // ✔ אישור בקשה - יוצר Match בשרת ופותח צ'אט
  const handleAccept = async (requestId) => {
    try {
      const result = await approveRequest(requestId);
      // מסירים מהרשימה רק אחרי אישור מוצלח
      setRequests((prev) => prev.filter((r) => r.requestID !== requestId));

      if (result?.matchID) {
        router.push({
          pathname: "/chat/[matchId]",
          params: { matchId: result.matchID },
        });
      } else {
        Alert.alert("שגיאה", "הבקשה אושרה אך לא התקבל מזהה התאמה לפתיחת הצ'אט.");
      }
    } catch (err) {
      Alert.alert("שגיאה באישור", err.message || "לא ניתן לאשר את הבקשה כעת.");
    }
  };

  // ✖ דחייה
  const handleReject = async (requestId) => {
    const ok = await rejectRequest(requestId);
    if (ok) {
      setRequests((prev) => prev.filter((r) => r.requestID !== requestId));
    }
  };

  // 👤 מעבר לפרופיל
  const openProfile = (user) => {
    router.push({
      pathname: "/MatchProfileDetails",
      params: {
        user: JSON.stringify(user),
      },
    });
  };

  if (loading || !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.placeholder}>טוען התאמות...</Text>
        </View>
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

        <Text style={styles.headerTitle}>התאמות עבורך</Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* בקשות */}
        <Text style={styles.sectionTitle}>בקשות לשיחה</Text>

        {requests.length === 0 ? (
          <Text style={styles.placeholder}>אין בקשות חדשות</Text>
        ) : (
          requests.map((req) => {
            const name =
              [req.fromFirstName, req.fromLastName]
                .filter(Boolean)
                .join(" ")
                .trim() || `משתמש #${req.fromUserID}`;
            const age = computeAge(req.fromBirthDate);
            const imageUri = buildImageUri(req.fromProfileImage);

            return (
              <View key={req.requestID} style={styles.requestCard}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={24} color={COLORS.onBrand} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  {age != null && <Text style={styles.age}>גיל {age}</Text>}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => handleAccept(req.requestID)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`אישור בקשה מ-${name}`}
                  >
                    <Ionicons name="checkmark-circle" size={30} color={COLORS.success} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleReject(req.requestID)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`דחיית בקשה מ-${name}`}
                  >
                    <Ionicons name="close-circle" size={30} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* התאמות חכמות */}
        <Text style={styles.sectionTitle}>התאמות חכמות עבורך</Text>

        {smartMatches.length === 0 ? (
          <Text style={styles.placeholder}>אין משתמשים להציג כרגע</Text>
        ) : (
          <View style={styles.grid}>
            {smartMatches.map((user) => {
              const imageUri = buildImageUri(user.profileImage);
              return (
                <TouchableOpacity
                  key={user.userID}
                  style={styles.card}
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
                      <Text style={styles.scoreBadgeText}>{user.matchScore}%</Text>
                    </View>

                    {/* פס שם תחתון */}
                    <View style={styles.cardNameBand}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {user.name}{user.age != null ? `, ${user.age}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {user.interests.length > 0
                        ? user.interests.slice(0, 2).join(" · ")
                        : "אין תחומי עניין"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNav active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    marginTop: 18,
    marginBottom: 10,
    textAlign: "right",
    color: COLORS.brand,
  },

  requestCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: COLORS.divider,
    marginLeft: 10,
  },

  name: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    textAlign: "right",
    color: COLORS.brand,
  },

  age: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
    fontFamily: FONTS.regular,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  placeholder: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 10,
    fontFamily: FONTS.regular,
  },

  avatarFallback: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // =========================
  // SMART MATCHES (modern grid cards)
  // =========================

  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },

  card: {
    width: GRID_CARD_W,
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
    backgroundColor: COLORS.primary,
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
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buildImageUri } from "../src/utils/image";
import { getUserInterests } from "../src/api/interestService";
import {
  approveRequest,
  getMyMatches,
  getPendingRequests,
  rejectRequest,
} from "../src/api/notificationService";
import { getQuestionnaire } from "../src/api/questionnaireService";
import { getUserProfile } from "../src/api/userProfileService";
import { getAllUsers } from "../src/api/userService";
import { getEngagementPairs, logInteraction } from "../src/api/interactionService";
import { getUser } from "../src/auth/authStore";

import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Check, MapPin, Sparkles, User, Users, X } from "lucide-react-native";

import BottomNav from "../../components/BottomNav";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Avatar from "../../components/ui/Avatar";
import SectionLabel from "../../components/ui/SectionLabel";
import EmptyState from "../../components/ui/EmptyState";
import Tappable from "../../components/ui/Tappable";
import MatchReasons from "../../components/ui/MatchReasons";
import { buildMatchReasons } from "../src/utils/matchReasons";
import { computeIntroMatchScore } from "../src/matching/introQuestionnaireScore";
import { computeBehavioralMatches } from "../src/matching/behavioralMatch";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../src/theme";

const { width: SCREEN_W } = Dimensions.get("window");
// רוחב כרטיס בגריד 2 עמודות (תואם גוטר SPACING.xl + מרווח SPACING.md בין העמודות).
const GRID_CARD_W = (SCREEN_W - SPACING.xl * 2 - SPACING.md) / 2;
// רוחב כרטיס בשורת הקטגוריה ההתנהגותית (גלילה אופקית).
const CARD_W = 156;

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

export default function MatchesScreen() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);

  const [users, setUsers] = useState([]);

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  // זוגות התעניינות מהשרת — הבסיס למנוע ההתנהגותי (סינון שיתופי).
  const [engagementPairs, setEngagementPairs] = useState([]);

  // =========================
  // LOAD USERS FROM DB
  // =========================

  useEffect(() => {
    loadUsers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("dismissed_matches").then((raw) => {
        if (!raw) return;
        try {
          const ids = JSON.parse(raw);
          // עדכון רק אם התוכן באמת השתנה — כך ה-Set שומר על reference יציב
          // ו-useMemo לא רץ מחדש מיותר בכל focus.
          setDismissed((prev) =>
            prev.size === ids.length && ids.every((id) => prev.has(id))
              ? prev
              : new Set(ids),
          );
        } catch {}
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
        pairsRes,
        myMatchesRes,
      ] = await Promise.allSettled([
        getAllUsers(myId),
        getUserProfile(myId),
        getUserInterests(myId),
        getQuestionnaire(myId),
        getPendingRequests(myId),
        getEngagementPairs(),
        getMyMatches(myId),
      ]);

      // מזהי משתמשים שכבר יש איתי שיחה פעילה — לא מוצגים כהתאמה חדשה
      // (מונע Match/Chat כפולים; ה-backend חוסם גם הוא). כשל בטעינת ההתאמות
      // אינו חוסם את המסך — במקרה כזה פשוט לא מסננים (fail-open).
      const myMatches =
        myMatchesRes.status === "fulfilled" ? myMatchesRes.value || [] : [];
      const matchedUserIds = new Set(
        myMatches.filter((m) => m.status === "Active").map((m) => m.otherUserID),
      );

      // משתמשים מועשרים מהשרת. מסננים null/undefined + מי שכבר קיימת איתו שיחה פעילה.
      const serverUsers = (
        allUsersRes.status === "fulfilled" ? allUsersRes.value || [] : []
      ).filter((u) => u && u.userID && !matchedUserIds.has(u.userID));

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

      setEngagementPairs(
        pairsRes.status === "fulfilled" ? pairsRes.value || [] : [],
      );
    } catch (err) {
      console.error("Failed loading users:", err);
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

    return (
      users
        .filter((user) => user.name && user.name.trim().length > 0)
        .filter((user) => !dismissed.has(user.userID))
        .map((user) => {
          // אחוז התאמה — אלגוריתם שאלון ההיכרות (חולץ ל-introQuestionnaireScore).
          const matchScore = computeIntroMatchScore(currentUser, user);

          // סיבות ההתאמה — תרגום אנושי של אותם אותות (עד 2), לתצוגה בכרטיס.
          // נגזר מאותם הנתונים; אינו משנה את הניקוד. שדה נלווה, ניתן לשימוש חוזר.
          const matchReasons = buildMatchReasons(currentUser, user, { limit: 2 });

          return { ...user, matchScore, matchReasons };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
    );
  }, [users, currentUser, dismissed]);


  // =========================================
  // BEHAVIORAL ALGORITHM (Collaborative Filtering)
  // "אנשים שאולי מתאימים לך" — לפי התנהגות באפליקציה, לא לפי תכונות.
  // הרעיון: מוצאים משתמשים שהתנהגו כמוני (התעניינו באותם פרופילים),
  // ומציעים לי את מי *שהם* התעניינו בו ואני עוד לא.
  // =========================================
  const behavioralMatches = useMemo(
    () => computeBehavioralMatches(currentUser, users, engagementPairs, dismissed),
    [users, currentUser, engagementPairs, dismissed],
  );


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

  // 👤 מעבר לפרופיל — מתעד צפייה למנוע ההתנהגותי (fire and forget).
  const openProfile = useCallback((user) => {
    logInteraction(user.userID, "View");
    // תמצית של המשתמש המחובר (רק שדות ההשוואה) — כדי שמסך הפרופיל יריץ את אותו
    // buildMatchReasons ויסביר "למה אולי תתחברו", בלי fetch נוסף ובלי לשכפל לוגיקה.
    const me = currentUser
      ? {
          interests: currentUser.interests,
          age: currentUser.age,
          spontaneityLevel: currentUser.spontaneityLevel,
          lifestyleLevel: currentUser.lifestyleLevel,
          isSmoker: currentUser.isSmoker,
          keepsKosher: currentUser.keepsKosher,
          keepsShabbat: currentUser.keepsShabbat,
        }
      : null;
    // הקשר ההתאמה — כללי (שאלון היכרות), עם הציון שכבר חושב כאן.
    const matchContext = { type: "general", score: user.matchScore };
    router.push({
      pathname: "/MatchProfileDetails",
      params: {
        user: JSON.stringify(user),
        me: me ? JSON.stringify(me) : "",
        matchContext: JSON.stringify(matchContext),
      },
    });
  }, [router, currentUser]);

  // כרטיס "מטייל" אחד — משמש גם בגריד וגם ברצועה האופקית.
  // בגריד: תמונה, תג התאמה, שם+גיל, ועד 2 "סיבות התאמה" אנושיות (מה מחבר ביניכם).
  // ברצועה (inRow): אותו כרטיס בלי הצ'יפים ובלי תג האחוז — הרצועה היא גילוי התנהגותי
  // ("אולי בקטע שלכם"), וכותרת הסקשן כבר נושאת את ה"למה"; עטוף ב-View הפוך שמתקן את היפוך ה-RTL של השורה.
  const renderMatchCard = useCallback(
    (user, score, cardWidth, inRow = false) => {
      const imageUri = buildImageUri(user.profileImage);
      const nameLine = `${user.name}${user.age != null ? `, ${user.age}` : ""}`;
      const reasons = user.matchReasons || [];

      return (
        <View key={user.userID} style={[{ width: cardWidth }, inRow && styles.cardFlipped]}>
          <Tappable
            style={styles.card}
            onPress={() => openProfile(user)}
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

              {/* תג אחוז ההתאמה — רק בגריד ("ההתאמות שלכם"), מוסבר ע"י הצ'יפים המשותפים.
                  לא מוצג ברצועה ההתנהגותית (inRow) שם המספר הוא ציון גילוי, לא אחוז תאימות. */}
              {score != null && !inRow && (
                <View style={styles.scoreBadge}>
                  <Sparkles size={11} color={COLORS.amberDark} strokeWidth={2.4} />
                  <Text style={styles.scoreBadgeText}>{score}%</Text>
                </View>
              )}
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={1}>
                {nameLine}
              </Text>

              {/* עיר — סימן מקום עדין שמחזק את זהות ה"טיול" בכרטיס */}
              {user.city ? (
                <View style={styles.cityRow}>
                  <MapPin size={12} color={COLORS.textMuted} strokeWidth={2} />
                  <Text style={styles.cityText} numberOfLines={1}>
                    {user.city}
                  </Text>
                </View>
              ) : null}

              {/* סיבות ההתאמה — עד 2 נקודות-חיבור אנושיות, רק בגריד (רכיב משותף). */}
              {!inRow && reasons.length > 0 && (
                <MatchReasons reasons={reasons} style={styles.cardReasons} />
              )}
            </View>
          </Tappable>
        </View>
      );
    },
    [openProfile],
  );

  // renderItem + keyExtractor יציבים ל-FlatList — מונעים רינדור מיותר של כרטיסים.
  const keyExtractor = useCallback((item) => String(item.userID), []);
  const renderSmartItem = useCallback(
    ({ item }) => renderMatchCard(item, item.matchScore, GRID_CARD_W),
    [renderMatchCard],
  );
  const renderBehavioralItem = useCallback(
    ({ item }) => renderMatchCard(item, item.behavioralScore, CARD_W, true),
    [renderMatchCard],
  );

  // כותרת המסך — ScreenHeader המשותף (חץ חזרה מימין + כותרת). משמש בטעינה ובתוכן.
  const header = (
    <ScreenHeader title="התאמות עבורך" onBack={() => router.back()} />
  );

  // מצב טעינה — שלד סטטי של כרטיסים (במקום ספינר), כדי שהמעבר לתוכן ירגיש חלק.
  if (loading || !currentUser) {
    return (
      <Screen>
        {header}
        <View style={styles.content}>
          <View style={styles.skelIntro} />
          {[0, 1].map((row) => (
            <View key={row} style={styles.gridRow}>
              {[0, 1].map((col) => (
                <View key={col} style={[styles.card, { width: GRID_CARD_W }]}>
                  <View style={styles.skelPhoto} />
                  <View style={styles.cardBody}>
                    <View style={styles.skelLine} />
                    <View style={styles.skelLineShort} />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
        <BottomNav active="home" />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}

      <FlatList
        data={smartMatches}
        numColumns={2}
        keyExtractor={keyExtractor}
        renderItem={renderSmartItem}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* משפט פתיחה חם — ממסגר את החוויה לפני שמגיעים לאנשים */}
            <Text style={styles.intro}>אלה האנשים שהכי מתאימים לכם למסע הבא.</Text>

            {/* בקשות — מוצגות רק כשיש, וממוסגרות חיובי ("מבקשים להכיר") */}
            {requests.length > 0 && (
              <View style={styles.block}>
                <SectionLabel
                  title="מבקשים להכיר אתכם"
                  count={requests.length}
                  style={styles.blockLabel}
                />
                {requests.map((req) => {
                  const name =
                    [req.fromFirstName, req.fromLastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || `משתמש #${req.fromUserID}`;
                  const age = computeAge(req.fromBirthDate);
                  return (
                    <View key={req.requestID} style={styles.requestCard}>
                      <Avatar uri={req.fromProfileImage} name={name} size="md" />
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestName} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.requestMeta} numberOfLines={1}>
                          {age != null
                            ? `מבקש/ת להכיר · בן/בת ${age}`
                            : "מבקש/ת להכיר אתכם"}
                        </Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          onPress={() => handleAccept(req.requestID)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={[styles.reqBtn, styles.reqAccept]}
                          accessibilityRole="button"
                          accessibilityLabel={`אישור בקשה מ-${name}`}
                        >
                          <Check size={20} color={COLORS.success} strokeWidth={2.6} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleReject(req.requestID)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={[styles.reqBtn, styles.reqReject]}
                          accessibilityRole="button"
                          accessibilityLabel={`דחיית בקשה מ-${name}`}
                        >
                          <X size={20} color={COLORS.danger} strokeWidth={2.6} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* רצועה התנהגותית — "אולי בקטע שלכם" (מוסתרת אם ריקה) */}
            {behavioralMatches.length > 0 && (
              <View style={styles.railSection}>
                <View style={styles.railHeaderPad}>
                  <SectionLabel title="אולי בקטע שלכם" style={styles.railLabel} />
                  <Text style={styles.railSub}>על סמך הפעילות שלכם באפליקציה</Text>
                </View>
                <FlatList
                  horizontal
                  data={behavioralMatches}
                  keyExtractor={keyExtractor}
                  renderItem={renderBehavioralItem}
                  showsHorizontalScrollIndicator={false}
                  style={styles.rowScroll}
                  contentContainerStyle={styles.rowContent}
                />
              </View>
            )}

            {/* כותרת הגריד — ההתאמות החכמות (מבוסס-תוכן) */}
            {smartMatches.length > 0 && (
              <SectionLabel
                title="ההתאמות שלכם"
                count={smartMatches.length}
                style={styles.smartLabel}
              />
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            Icon={Users}
            title="עדיין אין התאמות"
            subtitle="השלימו את הפרופיל וההעדפות — וכך נמצא לכם שותפים שבאמת מתאימים לכם."
            style={styles.empty}
          />
        }
      />

      <BottomNav active="home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxxl,
  },

  intro: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginBottom: SPACING.xl,
  },

  // ── בלוק בקשות ──
  block: { marginBottom: SPACING.lg },
  blockLabel: { marginBottom: SPACING.sm },

  requestCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  requestInfo: { flex: 1, alignItems: "flex-end" },
  requestName: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.semibold,
    color: COLORS.text,
    textAlign: "right",
  },
  requestMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  requestActions: { flexDirection: "row-reverse", gap: SPACING.sm },
  reqBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  reqAccept: { backgroundColor: COLORS.successLight },
  reqReject: { backgroundColor: COLORS.dangerLight },

  // ── רצועת "אולי בקטע שלכם" (התנהגותי) — בולטת לקצוות המסך ──
  railSection: {
    marginBottom: SPACING.lg,
    marginHorizontal: -SPACING.xl,
  },
  railHeaderPad: { paddingHorizontal: SPACING.xl },
  railLabel: { marginBottom: 2 },
  railSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: SPACING.md,
  },
  // היפוך אופקי כדי שהרצועה תתחיל מימין (RTL); כל כרטיס מתהפך בחזרה ב-cardFlipped.
  rowScroll: { transform: [{ scaleX: -1 }] },
  rowContent: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 2,
  },

  smartLabel: { marginTop: SPACING.xs, marginBottom: SPACING.md },

  // ── גריד ההתאמות ──
  gridRow: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    gap: SPACING.md,
    marginBottom: SPACING.md + 2,
  },

  // ── כרטיס מטייל ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    overflow: "hidden",
    ...SHADOWS.sm,
  },
  cardFlipped: { transform: [{ scaleX: -1 }] },

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

  // תג התאמה — ענבר (צבע ה"התאמה" של המערכת), מוסבר ע"י הצ'יפים המשותפים שמתחת.
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
  // מידה קומפקטית מכוונת לתג האחוז (בין tiny 11 ל-caption 13) — נשמרת כמות שהיא
  // כדי לא לשנות את מראה אות-ההתאמה החתימתי.
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
  cityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  cityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    flexShrink: 1,
  },

  // מרווח עליון לסיבות ההתאמה (הרכיב המשותף MatchReasons מטפל בשאר).
  cardReasons: { marginTop: SPACING.sm },

  // ── מצב ריק ── (EmptyState המשותף; כאן רק ההיסט העליון בתוך ה-FlatList)
  empty: { paddingTop: SPACING.xxxl },

  // ── שלד טעינה (סטטי) ──
  skelIntro: {
    height: 16,
    width: "70%",
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundSunk,
    alignSelf: "flex-end",
    marginBottom: SPACING.xl,
  },
  skelPhoto: {
    width: "100%",
    height: 160,
    backgroundColor: COLORS.backgroundSunk,
  },
  skelLine: {
    height: 12,
    width: "70%",
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundSunk,
    alignSelf: "flex-end",
  },
  skelLineShort: {
    height: 12,
    width: "45%",
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundSunk,
    alignSelf: "flex-end",
    marginTop: SPACING.sm,
  },
});

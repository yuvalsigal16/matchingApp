import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Ionicons — חריג מאושר יחיד: לוגו-מותגים (lucide בגרסתנו הסיר אייקוני מותגים).
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Ban,
  ChevronRight,
  CloudOff,
  Flame,
  Gem,
  MapPin,
  Moon,
  Utensils,
  Zap,
} from "lucide-react-native";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { sendChatRequest } from "../src/api/notificationService";
import { blockUser } from "../src/api/blockService";
import { getUserProfile } from "../src/api/userProfileService";
import { getQuestionnaire } from "../src/api/questionnaireService";
import { getUserInterests } from "../src/api/interestService";
import { getAllUsers } from "../src/api/userService";
import { buildMatchReasons } from "../src/utils/matchReasons";
import { computeIntroMatchScore } from "../src/matching/introQuestionnaireScore";
import { computeTripPreferenceScore } from "../src/matching/tripPreferenceScore";
import { MATCH_CONTEXT, matchContextLabel } from "../src/matching/matchContext";
import { getTripScoringInputs } from "../src/api/tripService";
import Screen from "../../components/ui/Screen";
import Avatar from "../../components/ui/Avatar";
import Card from "../../components/ui/Card";
import MatchReasons from "../../components/ui/MatchReasons";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../src/theme";

const GENDER_DB_TO_HE = { Male: "זכר", Female: "נקבה", Other: "אחר" };

// ── רשתות חברתיות: סניטציה ובניית קישור ──
// מנקה @ מוביל ורווחים; אינסטגרם — שם-משתמש ללא רווחים; פייסבוק — אם הוזן שם
// עם רווחים נופלים לחיפוש בפייסבוק (שם ≠ username), אחרת קישור ישיר.
const cleanHandle = (raw) => String(raw || "").trim().replace(/^@+/, "");

const instagramUrl = (raw) => {
  const h = cleanHandle(raw).replace(/\s+/g, "");
  return h ? `https://instagram.com/${encodeURIComponent(h)}` : null;
};

const facebookUrl = (raw) => {
  const h = cleanHandle(raw);
  if (!h) return null;
  return /\s/.test(h)
    ? `https://www.facebook.com/search/top?q=${encodeURIComponent(h)}`
    : `https://www.facebook.com/${encodeURIComponent(h)}`;
};

// "בן"/"בת" לפי מגדר — נקבה→בת, זכר→בן, אחר/לא ידוע→בן/בת.
const ageWordByGender = (gender) =>
  gender === "Female" ? "בת" : gender === "Male" ? "בן" : "בן/בת";

const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return new Date(diff).getUTCFullYear() - 1970;
};

const formatDate = (d) => {
  if (!d) return "";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()}`;
};

// ממיר את מחרוזת ה-Interests (JSON מ-getAllUsers) למערך שמות. תומך גם במערך מוכן.
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

export default function MatchProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const matchUser = JSON.parse(params.user);
  // תמצית המשתמש המחובר (שדות ההשוואה) ל-buildMatchReasons. מ-matchesForYou היא מגיעה
  // ב-param; מכניסות אחרות (צ'אט, TripMatches) היא נשלפת כאן למטה, כדי ש"למה אולי תתחברו"
  // יופיע מכל מסך.
  const [meData, setMeData] = useState(params.me ? JSON.parse(params.me) : null);

  // הקשר ההתאמה — "למה הגעתי לפרופיל" (general/trip/discovery). קובע איזה ציון מציגים.
  // ברירת מחדל בטוחה: general (התנהגות קיימת) אם משום מה לא הועבר הקשר.
  const matchContext = params.matchContext
    ? JSON.parse(params.matchContext)
    : { type: "general" };

  const [profile, setProfile] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [fetchedInterests, setFetchedInterests] = useState([]);
  const [tripInputs, setTripInputs] = useState(null); // קלטי ניקוד הטיול (לכניסה מצ'אט-טיול)
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false); // כשל בטעינת פרטי הפרופיל
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    // בפיתוח: אם הגענו בלי matchContext — זה כנראה נקודת ניווט ששכחה להעביר הקשר.
    // נופלים ל-general (backward-compatible) אבל *מזהירים* במקום לבלוע את הבאג בשקט.
    if (__DEV__ && !params.matchContext) {
      console.warn(
        "[MatchProfileDetails] נפתח ללא matchContext — נופל ל-general. " +
          "ודא שכל נקודת ניווט לפרופיל מעבירה matchContext.",
      );
    }
    const load = async () => {
      try {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const userId = matchUser.userID;

        // המסך שולף בעצמו את מלוא נתוני המשתמש (פרופיל + שאלון + תחומי עניין),
        // כדי שיוצג נכון מכל כניסה — גם מהצ'אט, שמעביר רק שם/תמונה/מזהה.
        // ובמקביל: אם לא הועברו נתוני ההשוואה שלי (me) — שולפים גם אותם, כדי
        // ש"למה אולי תתחברו" יופיע גם מהצ'אט/TripMatches.
        const myId = !params.me ? getUser()?.userID : null;

        // כשמגיעים מצ'אט-טיול (הקשר trip בלי ציון מוכן) — שולפים את קלטי ניקוד הטיול
        // כדי לחשב את אחוז ההתאמה לטיול עם אותה פונקציה בדיוק (בלי לשנות אלגוריתם).
        const needTripInputs =
          matchContext.type === "trip" &&
          matchContext.score == null &&
          matchContext.tripId != null;

        const [profileRes, othersRes, tripsRes, mineRes, tripInputsRes] =
          await Promise.allSettled([
            getUserProfile(userId),
            // תחומי העניין + נתוני אורח-החיים של המשתמש הנצפה נשלפים מ-getAllUsers —
            // ה-endpoint המוגן שכבר חושף בדיוק את הנתונים האלה לכל משתמש מחובר (הבסיס
            // ל-matchesForYou/TripMatches). כך אין קריאה ל-Questionnaire/UserInterest של
            // משתמש אחר, וההגנה מפני IDOR נשמרת. השדה הפרטי SocialNetworks אינו נכלל כאן.
            getAllUsers(getUser()?.userID),
            fetch(`${BASE_URL}/Trip/user/${userId}`, { headers }),
            myId
              ? Promise.all([
                  getUserProfile(myId),
                  getQuestionnaire(myId),
                  getUserInterests(myId),
                ])
              : Promise.resolve(null),
            needTripInputs
              ? getTripScoringInputs(matchContext.tripId)
              : Promise.resolve(null),
          ]);

        if (tripInputsRes.status === "fulfilled" && tripInputsRes.value) {
          setTripInputs(tripInputsRes.value);
        }

        if (profileRes.status === "fulfilled") setProfile(profileRes.value || null);
        else setLoadError(true); // שליפת הפרופיל נכשלה — מציגים מצב-שגיאה ברור

        // נתוני ההשוואה של המשתמש הנצפה (אורח-חיים + תחומי עניין) מתוך getAllUsers.
        // כניסות עשירות (matchesForYou/TripMatches) ידרסו זאת עם ה-params בכל מקרה;
        // לכניסת הצ'אט (params מינימליים) זה מחזיר את הנתונים הנכונים של הצד השני
        // במקום נתוני המשתמש המחובר.
        if (othersRes.status === "fulfilled") {
          const served = (othersRes.value || []).find(
            (u) => String(u.userID) === String(userId),
          );
          if (served) {
            setQuestionnaire({
              isSmoker: served.isSmoker ?? null,
              keepsKosher: served.keepsKosher ?? null,
              keepsShabbat: served.keepsShabbat ?? null,
              spontaneityLevel: served.spontaneityLevel ?? null,
              lifestyleLevel: served.lifestyleLevel ?? null,
            });
            setFetchedInterests(parseInterestNames(served.interests));
          }
        }
        if (mineRes.status === "fulfilled" && mineRes.value) {
          const [myProfile, myQuest, myInterests] = mineRes.value;
          setMeData({
            interests: (myInterests || [])
              .map((i) => i?.interestName || i?.InterestName)
              .filter(Boolean),
            age: calcAge(myProfile?.birthDate),
            spontaneityLevel: myQuest?.spontaneityLevel ?? null,
            lifestyleLevel: myQuest?.lifestyleLevel ?? null,
            isSmoker: myQuest?.isSmoker ?? null,
            keepsKosher: myQuest?.keepsKosher ?? null,
            keepsShabbat: myQuest?.keepsShabbat ?? null,
          });
        }
        if (tripsRes.status === "fulfilled" && tripsRes.value.ok) {
          const all = await tripsRes.value.json();
          setTrips(
            (all || []).filter(
              (t) => t.status === "Active" || t.Status === "Active"
            )
          );
        }
      } catch (err) {
        console.error("MatchProfileDetails load error:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSendRequest = async () => {
    const me = getUser();
    if (!me?.userID) {
      if (Platform.OS === "web") window.alert("לא מחובר");
      else Alert.alert("שגיאה", "לא מחובר");
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      // אם הגענו מהקשר טיול — שולחים את tripId, כך שההתאמה נולדת מקושרת לטיול
      // וההקשר נשמר גם בצ'אט שייווצר. אחרת — בקשה כללית (כמו קודם).
      const tripId =
        matchContext.type === MATCH_CONTEXT.TRIP ? matchContext.tripId : null;
      await sendChatRequest(me.userID, matchUser.userID, tripId);
      if (Platform.OS === "web") window.alert("הבקשה נשלחה בהצלחה");
      else Alert.alert("נשלח", "הבקשה נשלחה בהצלחה");
      router.back();
    } catch (err) {
      if (Platform.OS === "web") window.alert(err.message || "שליחת הבקשה נכשלה");
      else Alert.alert("שגיאה", err.message || "שליחת הבקשה נכשלה");
    } finally {
      setSending(false);
    }
  };

  const doRemove = async () => {
    try {
      const raw = await AsyncStorage.getItem("dismissed_matches");
      const ids = raw ? JSON.parse(raw) : [];
      if (!ids.includes(matchUser.userID)) ids.push(matchUser.userID);
      await AsyncStorage.setItem("dismissed_matches", JSON.stringify(ids));
    } catch {}
    router.back();
  };

  const handleRemove = () => {
    if (Platform.OS === "web") {
      if (window.confirm("להסיר משתמש זה מהצעות ההתאמה?")) doRemove();
    } else {
      Alert.alert("הסרה", "האם להסיר משתמש זה מהצעות ההתאמה?", [
        { text: "ביטול", style: "cancel" },
        { text: "כן, להסיר", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  // חסימת המשתמש דרך ה-API הקיים (blockUser). אחרי הצלחה — חזרה למסך הקודם.
  const performBlock = async () => {
    if (blocking) return;
    setBlocking(true);
    try {
      await blockUser(matchUser.userID);
      // הסתרה מיידית מ-matchesForYou דרך מנגנון ה-dismissed הקיים
      // (אותו מנגנון של "הסר מההצעות", שנטען מחדש ב-useFocusEffect).
      try {
        const raw = await AsyncStorage.getItem("dismissed_matches");
        const ids = raw ? JSON.parse(raw) : [];
        if (!ids.includes(matchUser.userID)) ids.push(matchUser.userID);
        await AsyncStorage.setItem("dismissed_matches", JSON.stringify(ids));
      } catch {}
      if (Platform.OS === "web") {
        window.alert(
          "המשתמש נחסם בהצלחה.\nההודעות וההתאמות ביניכם נחסמו.",
        );
        router.back();
      } else {
        Alert.alert(
          "המשתמש נחסם בהצלחה",
          "ההודעות וההתאמות ביניכם נחסמו.",
          [{ text: "אישור", onPress: () => router.back() }],
        );
      }
    } catch (err) {
      if (Platform.OS === "web") window.alert(err.message || "חסימת המשתמש נכשלה");
      else Alert.alert("שגיאה", err.message || "חסימת המשתמש נכשלה");
    } finally {
      setBlocking(false);
    }
  };

  const handleBlock = () => {
    const name = matchUser.name || "המשתמש הזה";
    const msg = `האם לחסום את ${name}?\nההודעות וההתאמות ביניכם ייחסמו.`;
    if (Platform.OS === "web") {
      if (window.confirm(msg)) performBlock();
    } else {
      Alert.alert("חסימת משתמש", msg, [
        { text: "ביטול", style: "cancel" },
        { text: "כן, לחסום", style: "destructive", onPress: performBlock },
      ]);
    }
  };

  // כפתור חזרה צף מעל ההירו — משמש גם בטעינה וגם בתוכן.
  const backButton = (
    <TouchableOpacity
      style={styles.backBtn}
      onPress={() => router.back()}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="חזרה"
    >
      <ChevronRight size={22} color={COLORS.brand} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <Screen>
        {backButton}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      </Screen>
    );
  }

  // מצב-שגיאה מפורש: שליפת הפרופיל נכשלה. חזרה עדיין זמינה (backButton).
  if (loadError) {
    return (
      <Screen>
        {backButton}
        <View style={styles.center}>
          <EmptyState
            Icon={CloudOff}
            title="לא ניתן לטעון את הפרופיל"
            subtitle="אירעה תקלה בטעינת הפרטים. נסו שוב מאוחר יותר."
          />
        </View>
      </Screen>
    );
  }

  // בסיס עשיר מהשליפות של המסך (פרופיל + שאלון). מעליו שוזרים רק שדות *לא-null*
  // מ-matchUser, כך שקורא עשיר (רשימת ההתאמות) גובר, וקורא דל (צ'אט) לא דורס בערכים ריקים.
  const user = { ...(profile || {}), ...(questionnaire || {}) };
  Object.keys(matchUser).forEach((k) => {
    if (matchUser[k] != null) user[k] = matchUser[k];
  });

  const firstName = user.firstName || matchUser.name?.split(" ")[0] || "";
  const lastName =
    user.lastName || matchUser.name?.split(" ").slice(1).join(" ") || "";
  const age = calcAge(user.birthDate) || matchUser.age;
  // תחומי עניין — מ-matchUser אם הגיע עשיר, אחרת מהשליפה של המסך.
  const interests =
    matchUser.interests && matchUser.interests.length
      ? matchUser.interests
      : fetchedInterests;

  // רשתות חברתיות — מוצגות רק בכניסה מצ'אט (matched="1"), כלומר אחרי התאמה
  // מאושרת. הנתון מגיע מהשאלון שהמסך כבר שולף (SocialNetworks כ-JSON).
  let social = null;
  try {
    const rawSocial = user.socialNetworks ?? user.SocialNetworks;
    if (rawSocial) social = typeof rawSocial === "string" ? JSON.parse(rawSocial) : rawSocial;
  } catch {
    // JSON פגום — פשוט לא מציגים את המקטע
  }
  const igLink = social ? instagramUrl(social.instagram) : null;
  const fbLink = social ? facebookUrl(social.facebook) : null;
  const showSocial = params.matched === "1" && (igLink || fbLink);

  // "למה אולי תתחברו" — עד 3 סיבות אנושיות, מאותו מנוע כמו בכרטיס. במסך יש יותר מקום,
  // לכן limit=3. אם אין נתוני משתמש מחובר (me) — הרשימה ריקה והמקטע פשוט לא מוצג.
  const reasons = meData
    ? buildMatchReasons(meData, { ...user, age, interests }, { limit: 3 })
    : [];

  // אחוז ההתאמה — לפי הקשר ההגעה (matchContext), בלי לנחש אלגוריתם:
  //   general → שאלון היכרות · trip → העדפות הטיול · discovery → אין אחוז.
  // אם המסך המקורי כבר חישב ציון (score) — משתמשים בו; אחרת מחשבים כאן עם אותה פונקציה
  // בדיוק ונתוני ההקשר. לעולם לא נופלים מ-trip לשאלון היכרות — עדיף להסתיר מאשר להטעות.
  const other = { ...user, age, interests };
  const scoreLabel = matchContextLabel(matchContext.type);
  let matchScore = null;
  if (matchContext.type === MATCH_CONTEXT.DISCOVERY) {
    matchScore = null;
  } else if (matchContext.type === MATCH_CONTEXT.TRIP) {
    matchScore =
      matchContext.score != null
        ? matchContext.score
        : tripInputs?.pref
          ? computeTripPreferenceScore(
              other,
              tripInputs.pref,
              tripInputs.prefInterests,
              tripInputs.priorityFactors,
            )
          : null;
  } else {
    matchScore =
      matchContext.score != null
        ? matchContext.score
        : meData
          ? computeIntroMatchScore(meData, other)
          : null;
  }

  // הטיה לפי מגדר הפרופיל (כמו בשורת הגיל): זכר/נקבה מוטים, לא-ידוע → לוכסן.
  const byGender = (male, female, dual) =>
    user.gender === "Female" ? female : user.gender === "Male" ? male : dual;

  // רמות 1–5 → תיאור מילולי קצר (לפי הניסוח בשאלון ההעדפות).
  const spontaneityWord = (v) =>
    v <= 2
      ? byGender("מתכנן מראש", "מתכננת מראש", "מתכנן/ת מראש")
      : v === 3
        ? byGender("מאוזן", "מאוזנת", "מאוזן/ת")
        : byGender("הרפתקן", "הרפתקנית", "הרפתקן/ית");
  const lifestyleWord = (v) =>
    v <= 2 ? "פשוט וחסכוני" : v === 3 ? "מאוזן" : "יוקרתי ומפנק";

  const lifestyleTags = [
    user.isSmoker != null && {
      label: user.isSmoker
        ? byGender("מעשן", "מעשנת", "מעשן/ת")
        : byGender("לא מעשן", "לא מעשנת", "לא מעשן/ת"),
      Icon: Flame,
    },
    user.keepsKosher != null && {
      label: user.keepsKosher
        ? byGender("שומר כשרות", "שומרת כשרות", "שומר/ת כשרות")
        : byGender("לא שומר כשרות", "לא שומרת כשרות", "לא שומר/ת כשרות"),
      Icon: Utensils,
    },
    user.keepsShabbat != null && {
      label: user.keepsShabbat
        ? byGender("שומר שבת", "שומרת שבת", "שומר/ת שבת")
        : byGender("לא שומר שבת", "לא שומרת שבת", "לא שומר/ת שבת"),
      Icon: Moon,
    },
    user.spontaneityLevel != null && {
      label: `ספונטניות: ${spontaneityWord(user.spontaneityLevel)}`,
      Icon: Zap,
    },
    user.lifestyleLevel != null && {
      label: `אורח חיים: ${lifestyleWord(user.lifestyleLevel)}`,
      Icon: Gem,
    },
  ].filter(Boolean);

  return (
    <Screen>
      {backButton}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── הירו ── */}
        <View style={styles.hero}>
          <Avatar
            uri={user.profileImage || user.ProfileImage || matchUser.profileImage}
            name={`${firstName} ${lastName}`.trim()}
            size="xl"
            style={styles.heroAvatar}
          />

          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>

          {age || user.gender ? (
            <Text style={styles.ageLine}>
              {age
                ? `${ageWordByGender(user.gender)} ${age}`
                : GENDER_DB_TO_HE[user.gender] || ""}
            </Text>
          ) : null}

          {user.city ? (
            <View style={styles.cityRow}>
              <MapPin size={14} color={COLORS.textMuted} strokeWidth={2} />
              <Text style={styles.cityText}>{user.city}</Text>
            </View>
          ) : null}

          {matchScore != null && (
            <View style={styles.matchBox}>
              <Text style={styles.matchText}>
                {matchScore}% {scoreLabel}
              </Text>
            </View>
          )}
        </View>

        {/* ── למה אולי תתחברו — הסבר אנושי לסיבת ההמלצה, מיד אחרי אחוז ההתאמה ── */}
        {reasons.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>למה אולי תתחברו</Text>
            <MatchReasons reasons={reasons} size="md" />
          </Card>
        )}

        {/* ── טיולים פעילים ── */}
        {trips.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>טיולים מתוכננים</Text>
            {trips.map((t, i) => (
              <View key={i} style={styles.tripCard}>
                <Text style={styles.tripDest}>
                  {t.destination ?? t.Destination}
                </Text>
                {(t.startDate || t.endDate) && (
                  <Text style={styles.tripDates}>
                    {formatDate(t.startDate)}
                    {t.endDate
                      ? ` – ${formatDate(t.endDate)}`
                      : " · כרטיס לכיוון אחד"}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* ── אורח חיים ── */}
        {lifestyleTags.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>אורח חיים</Text>
            <View style={styles.tagsRow}>
              {lifestyleTags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <tag.Icon size={15} color={COLORS.brand} strokeWidth={2} />
                  <Text style={styles.tagText}>{tag.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ── תחומי עניין ── */}
        {interests.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>תחומי עניין</Text>
            <View style={styles.tagsRow}>
              {interests.map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ── רשתות חברתיות — רק אחרי התאמה (כניסה מצ'אט) ── */}
        {showSocial && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>רשתות חברתיות</Text>
            {igLink ? (
              <TouchableOpacity
                style={styles.socialRow}
                onPress={() => Linking.openURL(igLink)}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel={`אינסטגרם של ${firstName}`}
              >
                <Ionicons name="logo-instagram" size={20} color={COLORS.brand} />
                <Text style={styles.socialText} numberOfLines={1}>
                  @{cleanHandle(social.instagram).replace(/\s+/g, "")}
                </Text>
              </TouchableOpacity>
            ) : null}
            {fbLink ? (
              <TouchableOpacity
                style={styles.socialRow}
                onPress={() => Linking.openURL(fbLink)}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel={`פייסבוק של ${firstName}`}
              >
                <Ionicons name="logo-facebook" size={20} color={COLORS.brand} />
                <Text style={styles.socialText} numberOfLines={1}>
                  {cleanHandle(social.facebook)}
                </Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        )}

        {/* ── פעולות ── */}
        <View style={styles.footer}>
          <Button
            label="שלח בקשה לצ׳אט"
            variant="primary"
            size="lg"
            loading={sending}
            onPress={handleSendRequest}
          />
          <Button
            label="הסרה מההצעות"
            variant="secondary"
            size="lg"
            onPress={handleRemove}
          />
          {/* פעולה הרסנית — מופרדת בקו-שיער, נמוכה יותר, בגוון danger */}
          <View style={styles.footerDivider} />
          <Button
            label="חסימת משתמש"
            variant="danger"
            size="md"
            loading={blocking}
            Icon={Ban}
            onPress={handleBlock}
            accessibilityLabel="חסימת משתמש"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // כפתור חזרה צף — בתוך גוף ה-Screen (מעל ה-safe-area), בלי היסט קשיח.
  // פינה עגולה, משטח לבן, צל עדין מהטוקנים.
  backBtn: {
    position: "absolute",
    top: SPACING.lg,
    right: SPACING.xl,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.sm,
  },

  content: { paddingBottom: SPACING.xxxl },

  // ── הירו ── באנר פרופיל במלוא הרוחב, פינות תחתונות מעוגלות.
  hero: {
    alignItems: "center",
    paddingTop: SPACING.xxl + 2,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xxl,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl + 8,
    borderBottomRightRadius: RADIUS.xl + 8,
    ...SHADOWS.md,
  },
  // טבעת brandLight עדינה סביב האווטר (נשמרת מהמראה הקיים דרך prop ה-style).
  heroAvatar: {
    marginBottom: SPACING.md + 2,
    borderWidth: 3,
    borderColor: COLORS.brandLight,
  },
  // h2 כמות-שהוא (bold) — extraBold שמור ללוגו בלבד (החלטת 2026-07-19).
  name: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  ageLine: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  cityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  // תג אחוז ההתאמה — ענבר (אות-ההתאמה של המערכת).
  matchBox: {
    backgroundColor: COLORS.amberLight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  matchText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.amberDark,
  },

  // ── מקטע תוכן — Card משותף; כאן רק גוטר ומרווח תחתון. ──
  section: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  // כותרת מקטע — היררכיית TYPOGRAPHY, בצבע טקסט (brand שמור לפעולות/אותות).
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: SPACING.md,
  },

  // כרטיס טיול פנימי — גוון-מותג רך, סימן-מסע בקצה ימין (RTL).
  tripCard: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRightWidth: 3,
    borderRightColor: COLORS.brand,
    alignItems: "flex-end",
  },
  tripDest: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.brand,
    textAlign: "right",
  },
  tripDates: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: "right",
  },

  tagsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },

  // תג אורח-חיים — ממולא (אות תאימות חזק): brandLight + אייקון + טקסט מותג.
  tag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  tagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.brand,
  },

  // שורת רשת-חברתית — אייקון-מותג + הנדל כקישור (brand = פעולה/קישור).
  socialRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  socialText: {
    ...TYPOGRAPHY.body,
    color: COLORS.brand,
    textAlign: "right",
    flexShrink: 1,
  },

  // תג תחום-עניין — קווי/עדין (מידע משלים): משטח + מסגרת-שיער, בלי אייקון.
  interestTag: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  interestText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.brand,
  },

  // פוטר הפעולות — כפתורים מלאי-רוחב, מוערמים, בהיררכיה ברורה (ראשי → משני → הרסני).
  footer: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  footerDivider: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginTop: SPACING.xs,
  },
});

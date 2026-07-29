// ייבוא אייקונים מ-lucide-react-native
import {
  ChevronRight, // חץ ימינה — לכפתור חזרה
  MapPin, // סיכת מפה — ליעד
  Plane, // מטוס — לכותרת כרטיס-המסע
  RotateCw, // חץ סיבוב — לכפתור "סובב את הגלגל"
  Sparkles, // אייקון נצנוצים — לכותרת "גלגל המזל"
  User, // אייקון משתמש — לפרטי הפרטנר
} from "lucide-react-native";

import {
  getUserTrips,
  createFullTrip,
} from "../src/api/tripService";

// ייבוא Hooks של React
import { useEffect, useRef, useState } from "react";

// ייבוא רכיבי UI מ-React Native
import {
  ActivityIndicator, // אינדיקטור טעינה
  Alert, // משוב שגיאה למשתמש (כשל שמירה)
  Animated, // מאפשר אנימציות (סיבוב הגלגל)
  Dimensions, // רוחב המסך — לגודל הגלגל
  Easing, // פונקציות שולטות במהירות האנימציה (האם מאיץ? מאט?)
  PanResponder, // זיהוי מחוות סוויפ על הגלגל
  Platform,
  Pressable, // כפתור עם פידבק שינוי צבע בלחיצה
  ScrollView, // גלילה — כדי שהכפתור התחתון תמיד יהיה נגיש
  StyleSheet, // הגדרת עיצובים
  Text, // הצגת טקסט
  View, // מיכל/קופסה
} from "react-native";

// SafeAreaView — מבטיח שהתוכן לא ייחסם על ידי ה-notch או סרגל הניווט
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
// פונטים מותאמים של האפליקציה
import { COLORS as THEME, FONTS, SHADOWS } from "../src/theme";
import Button from "../../components/ui/Button";
import CompletionOverlay from "../../components/ui/CompletionOverlay";
import { getAllUsers } from "../src/api/userService";
import { getUser } from "../src/auth/authStore";
import { getUserProfile } from "../src/api/userProfileService";
import { getUserInterests } from "../src/api/interestService";
import { getQuestionnaire } from "../src/api/questionnaireService";
import { computeWheelMatchScore } from "../src/matching/wheelMatchScore";

// גודל הגלגל מגיב גם לרוחב וגם לגובה המסך — כדי שיהיה גדול וברור, אבל בלי לדחוף
// את הכפתור התחתון מחוץ למסך במכשירים נמוכים. geometry בלבד — אינו נוגע בלוגיקת הסיבוב.
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const WHEEL_SIZE = Math.min(SCREEN_W - 36, SCREEN_H * 0.35, 330);
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;
const R = WHEEL_SIZE / 2 - 12;
const TEXT_R = R * 0.70;

function sectorPath(startDeg, endDeg) {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const x1 = CX + R * Math.cos(s);
  const y1 = CY + R * Math.sin(s);
  const x2 = CX + R * Math.cos(e);
  const y2 = CY + R * Math.sin(e);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}


// ── פלטת מקטעי הגלגל ──
// משפחה מגובשת של טורקיז + גווני-אדמה חמים ("מפת מסע"), במקום קשת צבעים גנרית.
// כל הגוונים מספיק כהים כדי שהטקסט הלבן על המקטעים יישאר קריא.
const COLORS = [
  "#1A3C40", // טורקיז עמוק (מותג)
  "#B45309", // ענבר כהה
  "#2F6E72", // טורקיז בינוני
  "#B04A32", // טרקוטה
  "#3E7C7A", // טורקיז רך
  "#6E7F4E", // זית
  "#255A5D", // טורקיז כהה
  "#BE6A34", // חול-ענבר
];

// כמה יעדים להציג בגלגל — רק הרלוונטיים ביותר (הראשונים ברשימה שכבר ממוינת
// לפי ציון ההתאמה). תצוגה בלבד: לא משנה מיון/ניקוד/הגרלה/API — רק כמה נראים.
// תואם ל-8 צבעי הפלטה שמעל, ושומר על גלגל קריא ולא צפוף.
const MAX_WHEEL_DESTINATIONS = 8;


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

const buildEnrichedUser = (basicUser, profile, interests, quest) => ({
  ...basicUser,
  userID: basicUser.userID,
  name: [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim(),
  age: computeAge(profile?.birthDate),
  city: profile?.city ?? null,
  profileImage: profile?.profileImage ?? basicUser.profileImage ?? null,
  interests: (interests || []).map((i) => i?.interestName).filter(Boolean),
  isSmoker: quest?.isSmoker ?? null,
  keepsKosher: quest?.keepsKosher ?? null,
  keepsShabbat: quest?.keepsShabbat ?? null,
  spontaneityLevel: quest?.spontaneityLevel ?? null,
  lifestyleLevel: quest?.lifestyleLevel ?? null,
});

// המידע כבר הגיע מלא מ-getAllUsers (פרופיל + שאלון + interests) — משתמשים בו ישירות
// במקום שליפה חוזרת פר-מועמד. השליפה הפר-מועמדית שברה את הדירוג: מאז חיזוק ה-IDOR,
// getQuestionnaire/getUserInterests מתעלמים מה-id ומחזירים את המשתמש המחובר, כך שכל
// מועמד "הועשר" בנתונים שלי. basicUser כולל את כל השדות ש-buildEnrichedUser צריך;
// interests מגיע כמחרוזת JSON — ממירים אותו למבנה שהבנאי מצפה לו ({ interestName }).
const enrichUser = (basicUser) => {
  let interestObjs = [];
  try {
    const raw = basicUser.interests;
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) {
      interestObjs = arr
        .map((it) => ({
          interestName: typeof it === "string" ? it : it?.interestName || it?.InterestName,
        }))
        .filter((o) => o.interestName);
    }
  } catch {
    interestObjs = [];
  }
  return buildEnrichedUser(basicUser, basicUser, interestObjs, basicUser);
};




// ── הקומפוננטה הראשית של מסך גלגל המזל ──
// מסך זה מוצג כאשר המשתמש מדלג על בחירת יעד בשאלון ההעדפות
export default function WheelScreen() {
  const router = useRouter();
  const [destinations, setDestinations] = useState([]);
const [bestMatch, setBestMatch] = useState(null);
const [saving, setSaving] = useState(false); // מונע לחיצה כפולה על "זה היעד שלי"
const [done, setDone] = useState(false); // רגע-סיום קצר לפני היציאה מהאונבורדינג
const wheelParams = useLocalSearchParams(); // ההעדפות שהועברו מהשאלון (אם דילגו על יעד)

const saveTripToDB = async () => {
  if (!result || saving) return;

  const loggedUser = getUser();
  if (!loggedUser?.userID) {
    Alert.alert("שגיאה", "המשתמש לא מחובר. נא להתחבר מחדש.");
    return;
  }

  // ההעדפות שהועברו מהשאלון (אם דילגו על יעד) — כדי לשמור טיול מלא ולא לאבד אותן.
  let quizPrefs = null;
  try {
    quizPrefs = wheelParams?.prefs ? JSON.parse(wheelParams.prefs) : null;
  } catch {
    quizPrefs = null;
  }

  // תאריך יציאה: מהשאלון; אם אין — ברירת מחדל בעוד 30 יום.
  let startDate = quizPrefs?.startDate || null;
  if (!startDate) {
    const s = new Date();
    s.setDate(s.getDate() + 30);
    startDate = s.toISOString();
  }
  // תאריך חזרה: מהשאלון, או null (כרטיס לכיוון אחד) — לא ממציאים תאריך פיקטיבי.
  const endDate = quizPrefs?.endDate || null;

  setSaving(true);
  try {
    // שמירה מלאה דרך אותה פונקציה משותפת של המסלול הרגיל (Trip + העדפות + עניין + דירוגים).
    await createFullTrip({
      createdByUserID: loggedUser.userID,
      tripName: quizPrefs?.tripName || result.name,
      destination: result.name,
      startDate,
      endDate,
      pref: quizPrefs?.pref || null,
      interests: quizPrefs?.interests || [],
      priorities: quizPrefs?.priorities || [],
    });
    // רגע-סיום קצר (וי + הודעה) לפני הכניסה למוצר — תחושת הישג, בלי הגזמה.
    setDone(true);
    setTimeout(() => router.replace("/Home"), 1500);
  } catch (err) {
    // תיקון: משוב ברור למשתמש במקום כשל שקט.
    Alert.alert("שמירת הטיול נכשלה", err?.message || "אירעה שגיאה. נסו שוב.");
    setSaving(false);
  }
};

useEffect(() => {
  loadUsers();
}, []);

async function loadUsers() {
  try {
    const loggedInUser = getUser();

    if (!loggedInUser?.userID) return;

    const myId = loggedInUser.userID;

    const [
      allUsersRes,
      myProfileRes,
      myInterestsRes,
      myQuestRes,
    ] = await Promise.allSettled([
      getAllUsers(myId),
      getUserProfile(myId),
      getUserInterests(myId),
      getQuestionnaire(myId),
    ]);

    const basicUsers =
      allUsersRes.status === "fulfilled"
        ? allUsersRes.value || []
        : [];

    const me = buildEnrichedUser(
      loggedInUser,
      myProfileRes.status === "fulfilled"
        ? myProfileRes.value
        : null,
      myInterestsRes.status === "fulfilled"
        ? myInterestsRes.value || []
        : [],
      myQuestRes.status === "fulfilled"
        ? myQuestRes.value
        : null
    );

    const others = basicUsers.filter(
      (u) => u.userID !== myId
    );

    const enriched = await Promise.all(
      others.map(enrichUser)
    );

    // אלגוריתם "ההתאמה הטובה ביותר" של הגלגל (חולץ ל-wheelMatchScore).
    const usersWithScore = enriched.map((user) => ({
      ...user,
      matchScore: computeWheelMatchScore(me, user),
    }));

const rankedUsers = usersWithScore.sort(
  (a, b) => b.matchScore - a.matchScore
);





  const tripsArrays = await Promise.all(
  rankedUsers.map((u) => getUserTrips(u.userID).catch(() => []))
);
const destinationsFromTrips = [];

rankedUsers.forEach((user, index) => {
  const trips = tripsArrays[index] || [];

  trips.forEach((trip) => {
    destinationsFromTrips.push({
  tripId: trip.tripID,
  name: trip.destination,
  info: "יעד מטיול של משתמש בעל התאמה גבוהה",
  partner: user,
});
  });
});

// destinationsFromTrips נבנה לפי rankedUsers שכבר ממוין מהציון הגבוה לנמוך,
// לכן ההופעה הראשונה של כל יעד = ההתאמה הכי טובה. שומרים אותה (לא את האחרונה).
const uniqueDestinations = [];
const seenNames = new Set();

for (const d of destinationsFromTrips) {
  if (d.name && !seenNames.has(d.name)) {
    seenNames.add(d.name);
    uniqueDestinations.push(d);
  }
}

// מחבר את הגלגל ליעדים האמיתיים (עם הפרטנר האמיתי). בלי נתונים פיקטיביים.
// מציגים רק את 8 הרלוונטיים ביותר — הרשימה כבר ממוינת מהכי-מתאים לפחות,
// אז slice שומר בדיוק את היעדים של הפרטנרים עם ההתאמה הגבוהה ביותר.
setDestinations(uniqueDestinations.slice(0, MAX_WHEEL_DESTINATIONS));
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingDestinations(false);
  }
}

  // ── ערכי אנימציה ──
  // ערך הסיבוב הנוכחי של הגלגל (0 = עומד במקום, גדל בכל סיבוב)
  // useRef מונע יצירה מחדש בכל render
  const spinValue = useRef(new Animated.Value(0)).current;

  // ── ערכי State ──
  // התוצאה שזכתה לאחר הסיבוב (null עד שהגלגל מסתיים)
  const [result, setResult] = useState(null);

  // האם הגלגל מסתובב כרגע — מונע לחיצות חוזרות
  const [isSpinning, setIsSpinning] = useState(false);

  // המעלה הנוכחית של הגלגל — נשמר כדי להמשיך מהמיקום האחרון בסיבוב הבא
  const [currentDeg, setCurrentDeg] = useState(0);

  // האם עדיין טוענים יעדים מהשרת — להצגת ספינר במקום מסך ריק / טקסט מטעה
  const [loadingDestinations, setLoadingDestinations] = useState(true);

  // ── חישוב מספרי המקטעים והזווית של כל מקטע ──
  // const numberOfSectors = DESTINATIONS_POOL.length; // 8 מקטעים
  const numberOfSectors = destinations.length || 1;
  const sectorAngle = 360 / numberOfSectors; // 45 מעלות לכל מקטע

  // גופן התווית מסתגל למספר המקטעים — הרבה יעדים = מקטע דק = גופן קטן יותר,
  // כדי שהשמות ייכנסו ולא ייחתכו. תצוגה בלבד; לא משנה נתונים/לוגיקה.
  const labelFontSize =
    numberOfSectors > 12 ? 9 : numberOfSectors > 9 ? 10 : numberOfSectors > 6 ? 11 : 13;

  // ── פונקציה ראשית: מסובבת את הגלגל ──
  const spinWheel = () => {
    // אם הגלגל כבר מסתובב — לא לעשות כלום (מניעת לחיצה כפולה)
    if (isSpinning || !destinations.length) return;
    setIsSpinning(true);
    setResult(null); // מנקה תוצאה קודמת

    // ── חישוב יעד הסיבוב ──
    const numberOfRounds = 10; // מספר סיבובים מלאים לפני העצירה
    // בוחר יעד אקראי מהמאגר
    const randomIndex = Math.floor(Math.random() * numberOfSectors);

    // חישוב הזווית הסופית — מתייחס למיקום הסמן (למעלה במרכז)
    const targetDegree = 360 - randomIndex * sectorAngle - sectorAngle / 2;

    // הסיבוב המלא: ממשיך מהמיקום הנוכחי + 10 סיבובים + הזווית הסופית
    // % 360 — מנרמל את המעלה הנוכחית כדי שלא תצטבר לאינסוף
    const totalRotation =
      currentDeg + numberOfRounds * 360 + targetDegree - (currentDeg % 360);

    // ── מפעיל את אנימציית הסיבוב ──
    Animated.timing(spinValue, {
      toValue: totalRotation,
      duration: 5000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => {
      // callback: רץ אחרי שהאנימציה הסתיימה
      setIsSpinning(false);
      setCurrentDeg(totalRotation); // שומר את המיקום הסופי
      // setResult(destinations[randomIndex]);

    const chosenDestination =
  destinations[randomIndex];

const partner =
  chosenDestination.partner ?? null;

setBestMatch(partner);

setResult({
  ...chosenDestination,
  partner: partner?.name || "לא נמצא פרטנר",
});


    });
  };

  // ── סוויפ על הגלגל מסובב אותו (חלופה ללחיצה על הכפתור) ──
  // spinRef מתעדכן בכל render כדי שה-PanResponder תמיד יקרא לגרסה העדכנית של spinWheel
  const spinRef = useRef(() => {});
  spinRef.current = spinWheel;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderRelease: (_, g) => {
        const distance = Math.hypot(g.dx, g.dy);
        const speed = Math.hypot(g.vx, g.vy);
        // סוויפ מספיק ארוך או מהיר → מסובב
        if (distance > 25 || speed > 0.25) spinRef.current();
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── רגע-הסיום של האונבורדינג (קצר, לפני הכניסה למוצר) ── */}
      <CompletionOverlay visible={done} />

      {/* גלילה — מבטיחה שהכפתור התחתון ("זה היעד שלי") נגיש בכל גובה מסך.
          מחוות הסוויפ על הגלגל נשמרת (ה-PanResponder תופס מגע שמתחיל על הגלגל). */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* ── אזור הכותרת העליונה ── */}
      <View style={styles.header}>
        {/* כפתור החזרה — חץ ימינה (RTL) */}
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.5 }, // עמעום בלחיצה
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <ChevronRight size={26} color={THEME.brand} strokeWidth={2} />
        </Pressable>

        {/* טקסט הכותרת המרכזי */}
        <View style={styles.headerTextWrap}>
          <View style={styles.headerTitleRow}>
            <Sparkles size={20} color={THEME.brand} strokeWidth={2} />
            <Text style={styles.headerTitle}>גלגל המזל</Text>
          </View>
          <Text style={styles.headerSubtitle}>לאן הגורל ייקח אותך?</Text>
        </View>

        {/* רווח ריק בצד השני לאיזון הסידור */}
        <View style={styles.headerSpacer} />
      </View>

      {/* ── אזור הגלגל עצמו ── */}
      <View style={styles.wheelArea}>
        {loadingDestinations ? (
          <View style={styles.wheelLoading}>
            <ActivityIndicator size="large" color={THEME.brand} />
            <Text style={styles.emptyWheelText}>מחפשת יעדים מתאימים...</Text>
          </View>
        ) : destinations.length === 0 ? (
          <Text style={styles.emptyWheelText}>
            אין עדיין יעדים מטיולים של משתמשים מתאימים
          </Text>
        ) : (
        <View style={styles.wheelWrapper} {...panResponder.panHandlers}>
          {/* הסמן/החץ למעלה (משולש) — מצביע על המקטע הזוכה */}
          <View style={styles.pointer} />
          <View style={styles.pointerShadow} />

          {/* הגלגל המסתובב — Animated.View מאפשר אנימציה על הסיבוב */}
          <Animated.View
            style={[
              styles.wheelContainer,
              {
                transform: [
                  {
                    rotate: spinValue.interpolate({
                      inputRange: [0, 360],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
                ...(Platform.OS === "web" ? { willChange: "transform" } : {}),
              },
            ]}
          >
            {/* גלגל SVG — פרוסות מדויקות */}
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
              {destinations.map((item, i) => {
                const startDeg = i * sectorAngle;
                const endDeg = (i + 1) * sectorAngle;
                const midDeg = startDeg + sectorAngle / 2;
                const midRad = ((midDeg - 90) * Math.PI) / 180;
                const tx = CX + TEXT_R * Math.cos(midRad);
                const ty = CY + TEXT_R * Math.sin(midRad);
                return (
                  <G key={i}>
                    <Path
                      d={sectorPath(startDeg, endDeg)}
                      fill={COLORS[i % COLORS.length]}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <SvgText
                      x={tx}
                      y={ty}
                      fill="white"
                      fontSize={labelFontSize}
                      fontWeight="bold"
                      textAnchor="middle"
                      dy="0.35em"
                      transform={`rotate(${midDeg}, ${tx}, ${ty})`}
                    >
                      {item.name}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </Animated.View>

          {/* עיגול קטן במרכז הגלגל — לעיצוב בלבד */}
          <View style={styles.centerHub}>
            <View style={styles.centerDot} />
          </View>
        </View>
        )}
      </View>

      {/* ── כרטיס התוצאה ── */}
      <View style={styles.bubbleArea}>
        {result ? (
          // ── כרטיס-מסע: תלוש-יעד טורקיז → קו-ניקוב → סגנון והתאמה ──
          <View style={styles.ticket}>
            <View style={styles.ticketHeader}>
              <Plane size={18} color={THEME.onBrand} strokeWidth={2.2} />
              <View style={styles.ticketHeaderText}>
                <Text style={styles.ticketEyebrow}>כרטיס המסע שלך</Text>
                <Text style={styles.ticketDest} numberOfLines={1}>
                  {result.name}
                </Text>
              </View>
              <MapPin size={20} color={THEME.onBrand} strokeWidth={2} />
            </View>

            {/* קו-ניקוב עם חריצים בצדדים (מראה של תלוש) */}
            <View style={styles.ticketPerf}>
              <View style={[styles.ticketNotch, styles.ticketNotchRight]} />
              <View style={styles.ticketDash} />
              <View style={[styles.ticketNotch, styles.ticketNotchLeft]} />
            </View>

            <View style={styles.ticketBody}>
              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>שותף/ה לדרך</Text>
                <View style={styles.ticketPartner}>
                  <User size={15} color={THEME.brand} strokeWidth={2} />
                  <Text style={styles.ticketPartnerName}>{result.partner}</Text>
                </View>
              </View>

              {bestMatch ? (
                <Text style={styles.ticketMeta}>
                  {bestMatch.matchScore}% התאמה · גיל {bestMatch.age}
                  {bestMatch.city ? ` · ${bestMatch.city}` : ""}
                </Text>
              ) : null}

              {bestMatch?.interests?.length > 0 ? (
                <View style={styles.ticketStyle}>
                  <Text style={styles.ticketLabel}>סגנון משותף</Text>
                  <View style={styles.ticketChips}>
                    {bestMatch.interests.slice(0, 5).map((it) => (
                      <View key={it} style={styles.ticketChip}>
                        <Text style={styles.ticketChipText}>{it}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          // אם אין תוצאה — מציג טקסט מנחה
          <View style={styles.placeholderBubble}>
            <Text style={styles.placeholderText}>
              סובבי את הגלגל וגלי את היעד שלך
            </Text>
          </View>
        )}
      </View>

      {/* ── אזור הכפתורים בתחתית ── */}
      <View style={styles.footer}>
        {/* רמז סוויפ — במקום כפתור. מלמד את המשתמשת שאפשר להחליק את הגלגל.
            עדיין ניתן ללחיצה כגיבוי. */}
        <Pressable
          style={styles.swipeHint}
          onPress={spinWheel}
          disabled={isSpinning}
          accessibilityRole="button"
          accessibilityLabel="סיבוב הגלגל"
        >
          <RotateCw
            size={18}
            color={THEME.brand}
            strokeWidth={2.2}
            style={isSpinning && { opacity: 0.6 }}
          />
          <Text style={styles.swipeHintText}>
            {isSpinning
              ? "מסתובב..."
              : result
                ? "החליקו שוב לסיבוב נוסף"
                : "החליקו את הגלגל כדי לסובב"}
          </Text>
        </Pressable>

        {/* כפתור אישור — מוצג רק אחרי שיש תוצאה */}
        {result && !isSpinning ? (
          <Button
            label="זה היעד שלי"
            onPress={saveTripToDB}
            loading={saving}
            disabled={saving}
            style={styles.confirmCta}
            accessibilityLabel="בחירת היעד הזה"
          />
        ) : null}

        {/* כפתור דילוג — תמיד מוצג, מוביל למסך הבית בלי לבחור */}
        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}
          onPress={() => router.replace("/Home")}
          disabled={isSpinning}
          accessibilityRole="button"
          accessibilityLabel="דלג בלי לבחור יעד"
        >
          <Text style={styles.skipText}>דלגי בלי לבחור יעד</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── קבועי עיצוב משותפים ──
// צל אחיד מהטוקנים (מסכים דורסים shadowOpacity מקומית לפי הצורך).
const SHADOW = SHADOWS.sm;

// ── הגדרת העיצובים ──
const styles = StyleSheet.create({
  // המיכל הראשי של המסך
  container: {
    flex: 1,
    backgroundColor: THEME.background, // נייר חם
    paddingHorizontal: 18,
  },
  // תוכן הגלילה — flexGrow ממלא את המסך כשיש מקום, וגולל כשהתוכן גבוה ממנו
  // (כך הכפתור התחתון תמיד נגיש). paddingBottom נותן מרווח נשימה מתחת לכפתורים.
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },

  // ── אזור הכותרת העליונה ──
  header: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    width: "100%",
  },
  // כפתור החזרה — עיגול לבן עם אייקון חץ
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19, // עיגול מושלם
    backgroundColor: THEME.surface,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW, // פיזור הצל המשותף
    shadowOpacity: 0.06,
  },
  // רווח ריק לאיזון הסידור הסימטרי
  headerSpacer: {
    width: 38,
  },
  // אזור הכותרת המרכזי
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
  },
  // שורה עם אייקון + טקסט הכותרת
  headerTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8, // רווח בין האייקון לטקסט
  },
  // טקסט הכותרת הגדול
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: THEME.brand,
  },
  // טקסט תת-כותרת (מתחת לכותרת)
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: THEME.textMuted,
    marginTop: 2,
  },

  // ── אזור הגלגל ──
  wheelArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  // מצב טעינה — ספינר + טקסט בזמן שליפת היעדים
  wheelLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  // טקסט מצב ריק — כשאין יעדים אמיתיים מטיולים של משתמשים מתאימים
  emptyWheelText: {
    textAlign: "center",
    color: THEME.brand,
    fontSize: 15,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  // העטיפה של הגלגל — מאפשרת מיקום הסמן והעיגול המרכזי
  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  // הגלגל עצמו — עיגול עם מסגרת לבנה וצל בולט
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    overflow: "hidden",
    position: "relative",
    backgroundColor: THEME.surface,
    ...SHADOW,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  // העיגול המרכזי של הגלגל
  centerHub: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10, // מעל הגלגל
    ...SHADOW,
  },
  // הנקודה הכהה במרכז המרכז
  centerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.brand,
  },
  // הסמן (משולש) שמצביע על המקטע הזוכה
  // משולש נוצר באמצעות border-style — טריק קלאסי ב-CSS
  pointer: {
    position: "absolute",
    top: -6,
    zIndex: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 26,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: THEME.brand, // הצבע של המשולש
  },
  // צל המשולש — משולש שני, גדול יותר ובהיר יותר, מאחורי הראשון
  pointerShadow: {
    position: "absolute",
    top: -3,
    zIndex: 19,
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 28,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(0,0,0,0.1)",
  },

  // ── כרטיס התוצאה ──
  bubbleArea: {
    width: "100%",
    minHeight: 110, // גובה מינימלי גם בלי תוצאה
    justifyContent: "center",
    marginVertical: 14,
  },
  // ── JourneyTicket (כרטיס-מסע) ──
  ticket: {
    width: "100%",
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: THEME.hairline,
    overflow: "hidden",
    ...SHADOW,
  },
  // תלוש-היעד — פס טורקיז עליון
  ticketHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: THEME.brand,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ticketHeaderText: { flex: 1, alignItems: "flex-end" },
  ticketEyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    textAlign: "right",
  },
  ticketDest: {
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    color: THEME.onBrand,
    textAlign: "right",
    marginTop: 1,
  },
  // קו-הניקוב + החריצים בצדדים
  ticketPerf: {
    height: 16,
    justifyContent: "center",
    backgroundColor: THEME.surface,
  },
  ticketDash: {
    marginHorizontal: 18,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: THEME.hairline,
  },
  ticketNotch: {
    position: "absolute",
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.background,
  },
  ticketNotchRight: { right: -8 },
  ticketNotchLeft: { left: -8 },
  // גוף הכרטיס
  ticketBody: {
    backgroundColor: THEME.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  ticketRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: THEME.textMuted,
  },
  ticketPartner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  ticketPartnerName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: THEME.text,
  },
  ticketMeta: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: "right",
  },
  ticketStyle: { gap: 6, marginTop: 2 },
  ticketChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
  },
  ticketChip: {
    backgroundColor: THEME.brandLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ticketChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: THEME.brand,
  },
  // ── רמז הסוויפ (במקום כפתור הסיבוב) ──
  swipeHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    width: "100%",
  },
  swipeHintText: {
    color: THEME.brand,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  // הכרטיס הריק (לפני סיבוב)
  placeholderBubble: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
  },
  // טקסט הכרטיס הריק
  placeholderText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: THEME.textMuted,
    textAlign: "center",
  },

  // ── תחתית המסך ──
  footer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 20,
    gap: 10, // רווח בין הכפתורים
  },
  confirmCta: { width: "100%" },
  // כפתור דילוג — קישור פשוט בלי רקע
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
});

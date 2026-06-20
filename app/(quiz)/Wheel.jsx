// ייבוא אייקונים מ-lucide-react-native
import {
  ChevronRight, // חץ ימינה — לכפתור חזרה
  RotateCw, // חץ סיבוב — לכפתור "סובב את הגלגל"
  Sparkles, // אייקון נצנוצים — לכותרת "גלגל המזל"
  MapPin, // סיכת מפה — לכרטיס התוצאה
  User, // אייקון משתמש — לפרטי הפרטנר
} from "lucide-react-native";

import {
  getUserTrips,
  getTripPreferences,
  getTripPreferenceInterests,
  createTrip,
} from "../src/api/tripService";

// ייבוא Hooks של React
import { useEffect, useRef, useState } from "react";

// ייבוא רכיבי UI מ-React Native
import {
  ActivityIndicator, // אינדיקטור טעינה
  Animated, // מאפשר אנימציות (סיבוב הגלגל)
  Easing, // פונקציות שולטות במהירות האנימציה (האם מאיץ? מאט?)
  PanResponder, // זיהוי מחוות סוויפ על הגלגל
  Platform,
  Pressable, // כפתור עם פידבק שינוי צבע בלחיצה
  StyleSheet, // הגדרת עיצובים
  Text, // הצגת טקסט
  View, // מיכל/קופסה
} from "react-native";

// SafeAreaView — מבטיח שהתוכן לא ייחסם על ידי ה-notch או סרגל הניווט
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
// פונטים מותאמים של האפליקציה
import { COLORS as THEME, FONTS } from "../src/theme";
import { getAllUsers } from "../src/api/userService";
import { getUser } from "../src/auth/authStore";
import { getUserProfile } from "../src/api/userProfileService";
import { getUserInterests } from "../src/api/interestService";
import { getQuestionnaire } from "../src/api/questionnaireService";
import { saveWheelSelection } from "../src/api/tripService";

const WHEEL_SIZE = 290;
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


// ── פלטת הצבעים של מקטעי הגלגל ──
const COLORS = [
  "#1A3C40", // ירוק כהה — הצבע הראשי של האפליקציה
  "#7FB3B3", // turquoise בינוני
  "#E5A9A9", // ורוד עדין
  "#F4C77B", // צהוב חמים
  "#A5C99E", // ירוק רך
  "#B89BC9", // סגול עדין
  "#FF8B8B", // אדום-ורוד בהיר
  "#4ECDC4", // turquoise בהיר
  "#F9A66C", // כתום אפרסק
];





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

const enrichUser = async (basicUser) => {
  const [p, i, q] = await Promise.allSettled([
    getUserProfile(basicUser.userID),
    getUserInterests(basicUser.userID),
    getQuestionnaire(basicUser.userID),
  ]);

  return buildEnrichedUser(
    basicUser,
    p.status === "fulfilled" ? p.value : null,
    i.status === "fulfilled" ? i.value || [] : [],
    q.status === "fulfilled" ? q.value : null
  );
};




// ── הקומפוננטה הראשית של מסך גלגל המזל ──
// מסך זה מוצג כאשר המשתמש מדלג על בחירת יעד בשאלון ההעדפות
export default function WheelScreen() {
  const router = useRouter();
  const [destinations, setDestinations] = useState([]);
  const [users, setUsers] = useState([]);
const [currentUser, setCurrentUser] = useState(null);
const [bestMatch, setBestMatch] = useState(null);
// const [matches, setMatches] = useState([]);

// const saveTripToDB = async () => {
//   if (!result) return;

//   try {
//     const currentUser = getUser();

//     const payload = {
//   userID: currentUser.userID,
//   destination: result.name,
//   partnerID: bestMatch?.userID || null,
// };

// console.log("SENDING TRIP:");
// console.log(JSON.stringify(payload, null, 2));

// const response = await createTrip(payload);

// console.log("CREATE TRIP RESPONSE:");
// console.log(response);

// await saveWheelSelection(
//   currentUser.userID,
//   result.destinationId,
//   bestMatch?.userID
// );

// router.replace("/Home");
//   } catch (err) {
//   console.log("SAVE TRIP ERROR");
//   console.log(err);
// }
// };

const saveTripToDB = async () => {
  try {
    console.log("BUTTON CLICKED");

    if (!result) {
      console.log("NO RESULT");
      return;
    }

    const loggedUser = getUser();

    console.log("USER:", loggedUser);

    const startDate = new Date();
startDate.setDate(startDate.getDate() + 30);

const endDate = new Date();
endDate.setDate(endDate.getDate() + 37);

const payload = {
  createdByUserID: loggedUser.userID,
  destination: result.name,
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  status: "Active",
};

    console.log("PAYLOAD:");
    console.log(JSON.stringify(payload, null, 2));

    const response = await createTrip(payload);

    console.log("CREATE TRIP SUCCESS:");
    console.log(response);

    router.replace("/Home");
  } catch (err) {
    console.log("SAVE TRIP ERROR:");
    console.log(err);
    console.log(err?.message);
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

    setCurrentUser(me);

    const others = basicUsers.filter(
      (u) => u.userID !== myId
    );

    const enriched = await Promise.all(
      others.map(enrichUser)
    );

    const usersWithScore = enriched.map((user) => {
  let score = 0;

  if (user.age && me.age) {
    const ageDiff = Math.abs(user.age - me.age);

    if (ageDiff <= 2) score += 20;
    else if (ageDiff <= 5) score += 10;
  }

  const myInterests = (me.interests || []).map((s) =>
    s.toLowerCase()
  );

  const shared = (user.interests || []).filter((i) =>
    myInterests.includes(i.toLowerCase())
  );

  score += shared.length * 15;

  if (user.isSmoker === me.isSmoker) score += 10;
  if (user.keepsKosher === me.keepsKosher) score += 10;
  if (user.keepsShabbat === me.keepsShabbat) score += 10;

  return {
    ...user,
    matchScore: Math.min(score, 100),
  };
});

const rankedUsers = usersWithScore.sort(
  (a, b) => b.matchScore - a.matchScore
);





  const tripsArrays = await Promise.all(
  rankedUsers.map((u) => getUserTrips(u.userID).catch(() => []))
);
console.log(
  "tripsArrays:",
  JSON.stringify(tripsArrays, null, 2)
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

console.log("uniqueDestinations (real trips):", uniqueDestinations);

// מחבר את הגלגל ליעדים האמיתיים (עם הפרטנר האמיתי). בלי נתונים פיקטיביים.
setDestinations(uniqueDestinations);
setUsers(usersWithScore);
  } catch (err) {
    console.log(err);
  } finally {
    setLoadingDestinations(false);
  }
}

  // ── ערכי אנימציה ──
  // ערך הסיבוב הנוכחי של הגלגל (0 = עומד במקום, גדל בכל סיבוב)
  // useRef מונע יצירה מחדש בכל render
  const spinValue = useRef(new Animated.Value(0)).current;

  // ערך גודל לכפתור — מקטין מעט בלחיצה לאפקט פידבק
  const spinBtnScale = useRef(new Animated.Value(1)).current;

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

  // const smartMatches =
  // currentUser && users.length
  //   ? users
  //       .map((user) => {
  //         let score = 0;

  //         if (user.age && currentUser.age) {
  //           const ageDiff = Math.abs(
  //             user.age - currentUser.age
  //           );

  //           if (ageDiff <= 2) score += 20;
  //           else if (ageDiff <= 5) score += 10;
  //         }

  //         const myInterests = (
  //           currentUser.interests || []
  //         ).map((s) => s.toLowerCase());

  //         const shared = (
  //           user.interests || []
  //         ).filter((i) =>
  //           myInterests.includes(i.toLowerCase())
  //         );

  //         score += shared.length * 15;

  //         if (
  //           user.isSmoker === currentUser.isSmoker
  //         )
  //           score += 10;

  //         if (
  //           user.keepsKosher === currentUser.keepsKosher
  //         )
  //           score += 10;

  //         if (
  //           user.keepsShabbat ===
  //           currentUser.keepsShabbat
  //         )
  //           score += 10;

  //         return {
  //           ...user,
  //           matchScore: Math.min(score, 100),
  //         };
  //       })
  //       .sort(
  //         (a, b) =>
  //           b.matchScore - a.matchScore
  //       )
  //   : [];

  // ── פונקציה ראשית: מסובבת את הגלגל ──
  const spinWheel = () => {
    console.log("destinations:", destinations);
  console.log("length:", destinations.length);
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

  // ── אנימציות פידבק לכפתור הסיבוב ──
  // בלחיצה — מקטין את הכפתור ל-0.96 מגודלו (נראה לחוץ)
  const onSpinPressIn = () => {
    if (isSpinning) return;
    Animated.spring(spinBtnScale, {
      toValue: 0.96,
      useNativeDriver: Platform.OS !== "web",
      speed: 30,
      bounciness: 4,
    }).start();
  };
  const onSpinPressOut = () => {
    Animated.spring(spinBtnScale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
      speed: 30,
      bounciness: 4,
    }).start();
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
      {/* ── אזור הכותרת העליונה ── */}
      <View style={styles.header}>
        {/* כפתור החזרה — חץ ימינה (RTL) */}
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.5 }, // עמעום בלחיצה
          ]}
          onPress={() => router.back()}
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
                      fontSize="13"
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
          // אם יש תוצאה — מציג את היעד שנבחר ופרטי הפרטנר
          <View style={styles.bubble}>
            <View style={styles.bubbleHeader}>
              <View style={styles.bubbleIconCircle}>
                <MapPin size={18} color={THEME.onBrand} strokeWidth={2.2} />
              </View>
              <Text style={styles.bubbleTitle}>נוסעים ל{result.name}!</Text>
            </View>
            {/* קו מפריד דק */}
            <View style={styles.bubbleDivider} />
            {/* פרטי הפרטנר */}
            <View style={styles.bubblePartnerRow}>
              <User size={16} color={THEME.brand} strokeWidth={1.8} />
              <Text style={styles.bubblePartner}>{result.partner}</Text>
            </View>

            {bestMatch && (
              <View style={styles.partnerDetails}>
                <Text style={styles.bubbleInfo}>
                  התאמה של {bestMatch.matchScore}% · גיל {bestMatch.age}
                  {bestMatch.city ? ` · ${bestMatch.city}` : ""}
                </Text>

                {bestMatch.interests?.length > 0 && (
                  <View style={styles.partnerTagsRow}>
                    {bestMatch.interests.slice(0, 6).map((it) => (
                      <View key={it} style={styles.partnerTag}>
                        <Text style={styles.partnerTagText}>{it}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {(() => {
                  const lifestyle = [
                    bestMatch.isSmoker != null &&
                      (bestMatch.isSmoker ? "מעשן/ת" : "לא מעשן/ת"),
                    bestMatch.keepsKosher != null &&
                      (bestMatch.keepsKosher ? "כשר/ה" : "לא שומר/ת כשרות"),
                    bestMatch.keepsShabbat != null &&
                      (bestMatch.keepsShabbat ? "שומר/ת שבת" : "לא שומר/ת שבת"),
                  ].filter(Boolean);
                  return lifestyle.length > 0 ? (
                    <Text style={styles.bubbleInfo}>{lifestyle.join(" · ")}</Text>
                  ) : null;
                })()}
              </View>
            )}
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
                ? "החליקי שוב לסיבוב נוסף"
                : "החליקי את הגלגל כדי לסובב"}
          </Text>
        </Pressable>

        {/* כפתור אישור — מוצג רק אחרי שיש תוצאה */}
        {result && !isSpinning ? (
          <Pressable
  style={({ pressed }) => [
    styles.confirmBtn,
    pressed && { opacity: 0.85 },
  ]}
  onPress={saveTripToDB}
>
            <Text style={styles.confirmBtnText}>זה היעד שלי!</Text>
          </Pressable>
        ) : null}

        {/* כפתור דילוג — תמיד מוצג, מוביל למסך הבית בלי לבחור */}
        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}
          onPress={() => router.replace("/Home")}
          disabled={isSpinning}
        >
          <Text style={styles.skipText}>דלגי בלי לבחור יעד</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── קבועי עיצוב משותפים ──
// אובייקט הצל — נמצא בשימוש במספר מקומות (DRY)
const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3, // צל באנדרואיד
};

// ── הגדרת העיצובים ──
const styles = StyleSheet.create({
  // המיכל הראשי של המסך
  container: {
    flex: 1,
    backgroundColor: THEME.background, // אפור-ירוק עדין
    paddingHorizontal: 18,
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
  // הכרטיס עצמו (כשיש תוצאה)
  bubble: {
    backgroundColor: THEME.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    width: "100%",
    ...SHADOW,
    shadowOpacity: 0.12,
  },
  // אזור עליון של הכרטיס: אייקון + שם היעד
  bubbleHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  // עיגול האייקון (סיכת מפה)
  bubbleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  // כותרת הכרטיס — שם היעד
  bubbleTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    color: THEME.brand,
    textAlign: "right",
    flex: 1,
  },
  // קו מפריד דק בכרטיס
  bubbleDivider: {
    height: 1,
    backgroundColor: THEME.divider,
    marginVertical: 10,
  },
  // שורת פרטי הפרטנר
  bubblePartnerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  // שם הפרטנר
  bubblePartner: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: THEME.brand,
  },
  // טקסט המידע על הפרטנר
  bubbleInfo: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: THEME.textSecondary,
    lineHeight: 20,
  },
  // ── פרטי הפרטנר המורחבים ──
  partnerDetails: {
    marginTop: 6,
    gap: 6,
  },
  partnerTagsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
  },
  partnerTag: {
    backgroundColor: THEME.brandLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.brand,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  partnerTagText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
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
  // עטיפת כפתור הסיבוב — לאנימציית הגודל
  spinBtnWrapper: {
    width: "100%",
  },
  // כפתור הסיבוב הראשי
  spinBtn: {
    backgroundColor: THEME.brand, // ירוק כהה
    paddingVertical: 16,
    borderRadius: 30, // פינות מעוגלות לגמרי
    flexDirection: "row-reverse", // אייקון + טקסט בשורה אחת
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...SHADOW,
    shadowOpacity: 0.2,
  },
  // מצב מנוטרל של הכפתור (בזמן סיבוב)
  spinBtnDisabled: {
    backgroundColor: THEME.divider,
  },
  // טקסט הכפתור
  spinBtnText: {
    color: THEME.surface,
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  // כפתור אישור — לבן עם מסגרת ירוקה
  confirmBtn: {
    width: "100%",
    backgroundColor: THEME.surface,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: THEME.brand,
  },
  confirmBtnText: {
    color: THEME.brand,
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  // כפתור דילוג — קישור פשוט בלי רקע
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontFamily: FONTS.regular,
    textDecorationLine: "underline", // קו תחתון
  },
});

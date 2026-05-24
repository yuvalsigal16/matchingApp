// ייבוא אייקונים מ-lucide-react-native
import {
    ChevronRight, // אייקון נצנוצים — לכותרת "גלגל המזל"
    MapPin, // חץ ימינה — לכפתור חזרה
    RotateCw, // חץ סיבוב — לכפתור "סובב את הגלגל"
    Sparkles, // סיכת מפה — לכרטיס התוצאה
    User, // אייקון משתמש — לפרטי הפרטנר
} from "lucide-react-native";

// ייבוא Hooks של React
import { useRef, useState } from "react";

// ייבוא רכיבי UI מ-React Native
import {
    Animated, // מאפשר אנימציות (סיבוב הגלגל)
    Easing, // פונקציות שולטות במהירות האנימציה (האם מאיץ? מאט?)
    Pressable, // כפתור עם פידבק שינוי צבע בלחיצה
    StyleSheet, // הגדרת עיצובים
    Text, // הצגת טקסט
    View, // מיכל/קופסה
} from "react-native";

// SafeAreaView — מבטיח שהתוכן לא ייחסם על ידי ה-notch או סרגל הניווט
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
// פונטים מותאמים של האפליקציה
import { FONTS } from "../../theme/fonts";

// גודל הגלגל בפיקסלים — בסיס לחישוב כל המידות הפנימיות
const WHEEL_SIZE = 290;

// ── פלטת הצבעים של מקטעי הגלגל ──
// 8 צבעים שמתאימים לעיצוב של האפליקציה
// הסדר חוזר על עצמו אם יש יותר יעדים מצבעים (i % COLORS.length)
const COLORS = [
  "#1A3C40", // ירוק כהה — הצבע הראשי של האפליקציה
  "#7FB3B3", // turquoise בינוני
  "#E5A9A9", // ורוד עדין
  "#F4C77B", // צהוב חמים
  "#A5C99E", // ירוק רך
  "#B89BC9", // סגול עדין
  "#FF8B8B", // אדום-ורוד בהיר
  "#4ECDC4", // turquoise בהיר
];

// ── מאגר היעדים האפשריים ──
// 8 יעדים, כל אחד עם פרטנר מוצע ומידע קצר
// בעתיד — תוחלף ברשימה דינמית מהשרת
const DESTINATIONS_POOL = [
  { name: "ניו יורק", partner: "אלון, 28", info: "אוהב קולינריה וחיי לילה" },
  { name: "טוקיו", partner: "מיה, 24", info: "חובבת אנימה ותרבות יפן" },
  { name: "פריז", partner: "נועה, 31", info: "צלמת, מחפשת פינות נסתרות" },
  { name: "לונדון", partner: "עידו, 27", info: "חובב היסטוריה וכדורגל" },
  { name: "תאילנד", partner: "איתי, 26", info: "מחפש בטן-גב וצלילות באיים" },
  { name: "רומא", partner: "יובל, 26", info: "חובבת איטלקית ופיצה" },
  { name: "ברלין", partner: "תומר, 29", info: "מחפש מסיבות טכנו ואמנות" },
  { name: "מדריד", partner: "דניאל, 25", info: "חובב כדורגל וטאפאס" },
];

// ── הקומפוננטה הראשית של מסך גלגל המזל ──
// מסך זה מוצג כאשר המשתמש מדלג על בחירת יעד בשאלון ההעדפות
export default function WheelScreen() {
  const router = useRouter();
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

  // ── חישוב מספרי המקטעים והזווית של כל מקטע ──
  const numberOfSectors = DESTINATIONS_POOL.length; // 8 מקטעים
  const sectorAngle = 360 / numberOfSectors; // 45 מעלות לכל מקטע

  // ── פונקציה ראשית: מסובבת את הגלגל ──
  const spinWheel = () => {
    // אם הגלגל כבר מסתובב — לא לעשות כלום (מניעת לחיצה כפולה)
    if (isSpinning) return;
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
      toValue: totalRotation, // הזווית הסופית
      duration: 5000, // 5 שניות של סיבוב
      easing: Easing.out(Easing.back(0.5)), // האטה הדרגתית עם "back" — נראה טבעי
      useNativeDriver: true, // הרצה על thread גרפי — חלק יותר
    }).start(() => {
      // callback: רץ אחרי שהאנימציה הסתיימה
      setIsSpinning(false);
      setCurrentDeg(totalRotation); // שומר את המיקום הסופי
      setResult(DESTINATIONS_POOL[randomIndex]); // מציג את התוצאה
    });
  };

  // ── אנימציות פידבק לכפתור הסיבוב ──
  // בלחיצה — מקטין את הכפתור ל-0.96 מגודלו (נראה לחוץ)
  const onSpinPressIn = () => {
    if (isSpinning) return;
    Animated.spring(spinBtnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };
  // בשחרור — מחזיר לגודל המלא
  const onSpinPressOut = () => {
    Animated.spring(spinBtnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

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
          <ChevronRight size={26} color="#1A3C40" strokeWidth={2} />
        </Pressable>

        {/* טקסט הכותרת המרכזי */}
        <View style={styles.headerTextWrap}>
          <View style={styles.headerTitleRow}>
            <Sparkles size={20} color="#1A3C40" strokeWidth={2} />
            <Text style={styles.headerTitle}>גלגל המזל</Text>
          </View>
          <Text style={styles.headerSubtitle}>לאן הגורל ייקח אותך?</Text>
        </View>

        {/* רווח ריק בצד השני לאיזון הסידור */}
        <View style={styles.headerSpacer} />
      </View>

      {/* ── אזור הגלגל עצמו ── */}
      <View style={styles.wheelArea}>
        <View style={styles.wheelWrapper}>
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
                    // המרת ערך מספרי לזווית בdegrees
                    rotate: spinValue.interpolate({
                      inputRange: [0, 360],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* רנדור כל מקטע של הגלגל */}
            {DESTINATIONS_POOL.map((item, i) => (
              <View key={i} style={styles.sectorWrapper}>
                {/* המקטע עצמו — צורת משולש שמסובבת לזווית הנכונה */}
                <View
                  style={[
                    styles.sector,
                    {
                      backgroundColor: COLORS[i % COLORS.length], // צבע מהפלטה
                      transform: [{ rotate: `${i * sectorAngle}deg` }],
                    },
                  ]}
                />
                {/* תווית הטקסט של המקטע — מסובבת לאמצע המקטע */}
                <View
                  style={[
                    styles.labelContainer,
                    {
                      transform: [
                        { rotate: `${i * sectorAngle + sectorAngle / 2}deg` },
                      ],
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1} // לא מאפשר ירידת שורה
                    style={styles.sliceText}
                  >
                    {item.name}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>

          {/* עיגול קטן במרכז הגלגל — לעיצוב בלבד */}
          <View style={styles.centerHub}>
            <View style={styles.centerDot} />
          </View>
        </View>
      </View>

      {/* ── כרטיס התוצאה ── */}
      <View style={styles.bubbleArea}>
        {result ? (
          // אם יש תוצאה — מציג את היעד שנבחר ופרטי הפרטנר
          <View style={styles.bubble}>
            <View style={styles.bubbleHeader}>
              <View style={styles.bubbleIconCircle}>
                <MapPin size={18} color="#fff" strokeWidth={2.2} />
              </View>
              <Text style={styles.bubbleTitle}>נוסעים ל{result.name}!</Text>
            </View>
            {/* קו מפריד דק */}
            <View style={styles.bubbleDivider} />
            {/* פרטי הפרטנר */}
            <View style={styles.bubblePartnerRow}>
              <User size={16} color="#1A3C40" strokeWidth={1.8} />
              <Text style={styles.bubblePartner}>{result.partner}</Text>
            </View>
            <Text style={styles.bubbleInfo}>{result.info}</Text>
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
        {/* כפתור הסיבוב הראשי — עם אנימציית גודל בלחיצה */}
        <Animated.View
          style={[
            styles.spinBtnWrapper,
            { transform: [{ scale: spinBtnScale }] },
          ]}
        >
          <Pressable
            style={[styles.spinBtn, isSpinning && styles.spinBtnDisabled]}
            onPress={spinWheel}
            onPressIn={onSpinPressIn}
            onPressOut={onSpinPressOut}
            disabled={isSpinning} // נחסם בזמן סיבוב
          >
            <RotateCw
              size={18}
              color="#fff"
              strokeWidth={2.2}
              style={isSpinning && { opacity: 0.7 }}
            />
            {/* טקסט דינמי לפי המצב הנוכחי */}
            <Text style={styles.spinBtnText}>
              {isSpinning ? "מסתובב..." : result ? "סובב שוב" : "סובב את הגלגל"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* כפתור אישור — מוצג רק אחרי שיש תוצאה */}
        {result && !isSpinning ? (
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => router.replace("/Home")}
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
    backgroundColor: "#E8EDEF", // אפור-ירוק עדין
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
    backgroundColor: "#fff",
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
    color: "#1A3C40",
  },
  // טקסט תת-כותרת (מתחת לכותרת)
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#7A8B8E",
    marginTop: 2,
  },

  // ── אזור הגלגל ──
  wheelArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
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
    borderRadius: WHEEL_SIZE / 2, // עיגול מושלם
    borderWidth: 6,
    borderColor: "#fff",
    overflow: "hidden", // חותך את התוכן שיוצא מחוץ לעיגול
    position: "relative",
    backgroundColor: "#fff",
    ...SHADOW,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  // עטיפת מקטע — תופסת את כל הגלגל ומאפשרת מיקום מדויק
  sectorWrapper: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  // מקטע בודד של הגלגל — חצי ריבוע שמסובב לזווית מסוימת
  // transformOrigin מגדיר את נקודת הסיבוב של המקטע
  sector: {
    position: "absolute",
    width: WHEEL_SIZE / 2,
    height: WHEEL_SIZE / 2,
    left: WHEEL_SIZE / 2, // ממוקם במרכז
    top: WHEEL_SIZE / 2,
    transformOrigin: "0% 0%", // נקודת הסיבוב — הפינה הקרובה למרכז
  },
  // עטיפת הטקסט של המקטע — תופסת את כל הגלגל ומסובבת לזווית של המקטע.
  // justifyContent: "flex-start" מציב את הטקסט בקצה העליון של העטיפה (השוליים
  // החיצוניים של הגלגל), כך שאחרי הסיבוב כל תווית מופיעה ברדיוס של המקטע
  // שלה ולא נדחסת למרכז.
  labelContainer: {
    position: "absolute",
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    left: 0,
    top: 0,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 38, // מרחק מהקצה החיצוני — מספיק כדי שטקסט לא ייחתך ע"י overflow: hidden
  },
  // הטקסט של המקטע — שם היעד. צבע אחיד לכל המקטעים (לבן).
  sliceText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    textAlign: "center",
    width: 64,
    color: "#fff",
  },
  // העיגול המרכזי של הגלגל
  centerHub: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
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
    backgroundColor: "#1A3C40",
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
    borderTopColor: "#1A3C40", // הצבע של המשולש
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
    backgroundColor: "#fff",
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
    backgroundColor: "#1A3C40",
    justifyContent: "center",
    alignItems: "center",
  },
  // כותרת הכרטיס — שם היעד
  bubbleTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    color: "#1A3C40",
    textAlign: "right",
    flex: 1,
  },
  // קו מפריד דק בכרטיס
  bubbleDivider: {
    height: 1,
    backgroundColor: "#EEF1F2",
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
    color: "#1A3C40",
  },
  // טקסט המידע על הפרטנר
  bubbleInfo: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#5F6F72",
    lineHeight: 20,
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
    color: "#9AABAD",
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
    backgroundColor: "#1A3C40", // ירוק כהה
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
    backgroundColor: "#7FB3B3",
  },
  // טקסט הכפתור
  spinBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  // כפתור אישור — לבן עם מסגרת ירוקה
  confirmBtn: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1A3C40",
  },
  confirmBtnText: {
    color: "#1A3C40",
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  // כפתור דילוג — קישור פשוט בלי רקע
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    color: "#7A8B8E",
    fontSize: 14,
    fontFamily: FONTS.regular,
    textDecorationLine: "underline", // קו תחתון
  },
});

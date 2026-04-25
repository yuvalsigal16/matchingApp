// ייבוא ספריית Lottie להרצת אנימציות JSON מקצועיות
import LottieView from "lottie-react-native";

// ייבוא React עם שלושה hooks:
// useEffect — מריץ קוד בתגובה לשינויים
// useRef — שומר ערך שלא גורם לrender מחדש
// useState — שומר מצב שמשפיע על מה שמוצג
import React, { useEffect, useRef, useState } from "react";

// ייבוא רכיבי UI ואנימציה מ-React Native
import {
  Animated,    // מאפשר אנימציות על ערכים (opacity, position וכו')
  Dimensions,  // מחזיר את גודל המסך של המכשיר
  Easing,      // פונקציות easing — שולטות על מהירות האנימציה (האם מאיץ? מאט?)
  StyleSheet,  // הגדרת עיצובים
  Text,        // הצגת טקסט
  View,        // מיכל/קופסה
} from "react-native";

// מוודא שהתוכן לא נחסם על ידי notch או סרגל ניווט
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../theme/fonts";

// שומר את רוחב המסך — ישמש לחישוב גדלים יחסיים
const { width } = Dimensions.get("window");

// מערך של שלושת המשפטים שיוצגו ברצף
// \n = ירידת שורה בתוך הטקסט
const TEXTS = [
  "לפעמים רק צריך למצוא עם מי לחלוק את הרגע.",
  "המסע שלך מתחיל\nבחיבור הנכון",
  "עוד רגע נתחיל בשאלון\nההיכרות שידייק הכל.",
];

// ══════════════════════════════════════════════════════════
// קומפוננטת AnimatedText
// אחראית להציג טקסט עם אנימציית כניסה בכל פעם שהטקסט משתנה
// מקבלת: text — המשפט להצגה
// ══════════════════════════════════════════════════════════
function AnimatedText({ text }) {

  // ערך אנימציה לשקיפות: 0 = שקוף לגמרי, 1 = גלוי לגמרי
  // useRef מונע יצירת ערך חדש בכל render
  const opacity = useRef(new Animated.Value(0)).current;

  // ערך אנימציה לתזוזה אנכית: 16 = מוזז 16px למטה, 0 = במקומו
  const translateY = useRef(new Animated.Value(16)).current;

  // useEffect רץ בכל פעם שהפרופ text משתנה (תלות: [text])
  useEffect(() => {
    // מאפס את הערכים להתחלה (שקוף + מוזז למטה)
    opacity.setValue(0);
    translateY.setValue(16);

    // מריץ שתי אנימציות במקביל (parallel = בו זמנית):
    Animated.parallel([
      // אנימציה 1: הטקסט מופיע בהדרגה (0 → 1) תוך 600ms
      // Easing.out(Easing.quad) = מתחיל מהיר ומאט לקראת הסוף
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true, // מריץ על ה-thread הגרפי — חלק יותר
      }),

      // אנימציה 2: הטקסט עולה מלמטה (16px → 0) תוך 600ms
      // Easing.out(Easing.cubic) = עלייה מהירה שמאטה בצורה חלקה
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(); // מפעיל את האנימציות
  }, [text]); // מתפעל מחדש בכל שינוי של הטקסט

  return (
    // Animated.Text — גרסה אנימטיבית של Text, מאפשרת לשנות opacity ו-transform
    <Animated.Text
      style={[
        styles.quoteText,
        {
          opacity,                          // שקיפות דינמית
          transform: [{ translateY }],      // תזוזה אנכית דינמית
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

// ══════════════════════════════════════════════════════════
// קומפוננטת StepDots
// מציגה שלושה עיגולים קטנים בראש המסך שמסמנים באיזה שלב נמצאים
// מקבלת: active — מספר השלב הנוכחי (0, 1, או 2)
// ══════════════════════════════════════════════════════════
function StepDots({ active }) {
  return (
    <View style={styles.dotRow}>
      {/* עוברים על כל המשפטים ומציירים נקודה לכל אחד */}
      {TEXTS.map((_, i) => (
        <View
          key={i}
          // אם זה השלב הנוכחי — מוסיפים סגנון dotActive (נקודה מורחבת)
          style={[styles.dot, i === active && styles.dotActive]}
        />
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// קומפוננטה ראשית — QuizStartScreen
// מנהלת את כל לוגיקת המסך: טיימרים, מעברים, progress bar
// מקבלת: navigation — אובייקט לניווט בין מסכים
// ══════════════════════════════════════════════════════════
export default function QuizStartScreen({ navigation }) {

  // step = מספר השלב הנוכחי (0/1/2)
  // setStep = פונקציה לשינוי השלב שגורמת לrender מחדש
  const [step, setStep] = useState(0);

  // ערך אנימציה לProgress bar: 0 = ריק, 1 = מלא
  // useRef כי אנחנו לא צריכים render מחדש בשינויו
  const progress = useRef(new Animated.Value(0)).current;

  // ── טיימרים למעבר בין משפטים ──────────────────────────
  // useEffect ללא תלויות ([]) = רץ פעם אחת בלבד, כשהמסך נטען
  useEffect(() => {
    // אחרי 2.5 שניות → עובר למשפט השני (step = 1)
    const t1 = setTimeout(() => setStep(1), 2500);

    // אחרי 5 שניות → עובר למשפט השלישי (step = 2)
    const t2 = setTimeout(() => setStep(2), 5000);

    // cleanup: כשהמסך נסגר, מבטל את הטיימרים למניעת זיכרון דלוף
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // ── אנימציית Progress bar ───────────────────────────────
  // useEffect עם תלות ב-step = רץ בכל פעם שstep משתנה
  useEffect(() => {
    // אם לא הגענו לשלב האחרון — לא עושים כלום
    if (step !== 2) return;

    // מריץ רצף: קודם מחכה 400ms, אחר כך מאנים את ה-progress bar
    Animated.sequence([
      Animated.delay(400), // המתנה קצרה לפני שהProgress bar מתחיל

      Animated.timing(progress, {
        toValue: 1,          // ממלא את ה-bar עד הסוף
        duration: 2400,      // אורך האנימציה: 2.4 שניות
        easing: Easing.inOut(Easing.quad), // מאיץ באמצע, מאט בקצוות
        useNativeDriver: false, // חייב false כי אנחנו מאנימים את ה-width (מאפיין Layout)
      }),
    ]).start(() => {
      // callback: רץ אחרי שהProgress bar הסתיים — עובר למסך השאלון
      navigation.replace("Quiz");
    });
  }, [step]); // מתפעל מחדש בכל שינוי של step

  // ממיר את ערך progress (0→1) לרוחב בפרוצנט ("0%"→"100%")
  // משמש לאנימציה של רוחב ה-progress bar
  const barWidth = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    // SafeAreaView — מרחיב את כל המסך, שומר מרווח מה-notch
    <SafeAreaView style={styles.safe}>

      {/* נקודות השלב בראש המסך */}
      <StepDots active={step} />

      {/* ── אנימציית Lottie ──
          source: קובץ ה-JSON של האנימציה מתיקיית assets
          autoPlay: מתחיל לפעול אוטומטית
          loop={false}: מתנגן פעם אחת בלבד ולא חוזר
          speed={1}: מהירות רגילה (1 = נורמל, 2 = כפול)
          הLottie נטען פעם אחת ולא מאופס בין המשפטים */}
      <LottieView
        source={require("../../../assets/lottie/road trip.json")}
        autoPlay
        loop={false}
        speed={1}
        style={styles.lottie}
      />

      {/* ── בלוק הטקסט ──
          position: absolute מונע מהטקסט לדחוף את האנימציה למעלה
          כשאורך המשפט משתנה */}
      <View style={styles.textBlock}>

        {/* מציג את המשפט הנוכחי לפי step עם אנימציית כניסה */}
        <AnimatedText text={TEXTS[step]} />

        {/* Progress bar — מוצג רק בשלב האחרון (step === 2) */}
        {step === 2 && (
          <View style={styles.progressArea}>

            {/* המסלול האפור של ה-bar */}
            <View style={styles.progressTrack}>
              {/* המילוי הכחול שמתרחב אנימטיבית */}
              <Animated.View style={[styles.progressFill, { width: barWidth }]} />
            </View>

            {/* טקסט קטן מתחת ל-bar */}
            <Text style={styles.progressLabel}>מכינים את השאלון עבורך...</Text>

          </View>
        )}
      </View>

    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// עיצובים
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({

  // מיכל ראשי — מלא את כל המסך, ממרכז אלמנטים
  safe: {
    flex: 1,
    backgroundColor: "#EBF5F6", // כחול-ירקרק בהיר — צבע הרקע של האפליקציה
    alignItems: "center",       // מרכז אופקית
    justifyContent: "center",   // מרכז אנכית
  },

  // שורת הנקודות בראש המסך
  dotRow: {
    position: "absolute", // מרחף מעל שאר התוכן
    top: 52,              // מרחק מהחלק העליון של המסך
    flexDirection: "row", // הנקודות בשורה אחת
    alignItems: "center",
    gap: 10,              // רווח בין הנקודות
  },

  // נקודה רגילה (לא פעילה)
  dot: {
    width: 8, height: 8,
    borderRadius: 4,         // עיגול מושלם
    backgroundColor: "#7FB3B3",
    opacity: 0.35,           // שקוף חלקית — מעומם
  },

  // נקודה פעילה (השלב הנוכחי) — מורחבת ואטומה
  dotActive: {
    width: 26, height: 8,    // רחבה יותר — כמו pill
    borderRadius: 4,
    backgroundColor: "#1A3C40", // כהה יותר
    opacity: 1,              // גלוי לגמרי
  },

  // האנימציה עצמה — מכסה את כל רוחב המסך
  lottie: {
    width: width,  // רוחב מלא מקצה לקצה
    height: width, // ריבוע — גובה שווה לרוחב
  },

  // בלוק הטקסט — absolute כדי שלא ידחוף את האנימציה
  textBlock: {
    position: "absolute", // מנותק מהflow הרגיל
    bottom: 40,           // 40px מתחתית המסך
    left: 0,
    right: 0,
    height: 140,          // גובה קבוע — לא משתנה עם אורך הטקסט
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28, // ריווח פנימי מימין ושמאל
  },

  // עיצוב הטקסט הראשי
  quoteText: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: "#1A3C40",    // ירוק-כהה — צבע ראשי של האפליקציה
    textAlign: "center",
    lineHeight: 34,      // גובה שורה — נותן נשימה לטקסט
  },

  // אזור ה-Progress bar
  progressArea: {
    alignItems: "center",
    marginTop: 28, // רווח מהטקסט שמעליו
  },

  // המסלול הרקע של ה-bar (האפור)
  progressTrack: {
    width: width * 0.62, // 62% מרוחב המסך
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C8E0E2", // כחול-אפור בהיר
    overflow: "hidden",         // חותך את המילוי שלא יצא מחוץ לרדיוס
  },

  // המילוי הנע של ה-bar (הכהה)
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#1A3C40", // צבע ראשי כהה
  },

  // הטקסט מתחת ל-Progress bar
  progressLabel: {
    marginTop: 10,
    fontSize: 13,
    color: "#2D6A6F",    // גוון ביניים של הteal
    fontFamily: FONTS.bold,
  },
});

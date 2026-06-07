// ── ייבואים ──
import { Ionicons } from "@expo/vector-icons"; // אייקונים מוכרים (V/X וכו')
import { Slider } from "@miblanchard/react-native-slider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
// אייקונים מותאמים אישית — Globe2 לכותרת ה-intro, Plane/Home לתאריכים, Calendar למועדים
import {
  Calendar,
  Cigarette,
  Gem,
  Globe2,
  Home,
  MoonStar,
  Plane,
  UtensilsCrossed,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, // אינדיקטור טעינה (ספינר עגול)
  Animated, // לאנימציות מעבר בין שאלות
  KeyboardAvoidingView, // מזיז את התוכן כשהמקלדת עולה
  Platform, // מאפשר לבדוק אם זה iOS או Android
  Pressable, // כפתור עם פידבק לחיצה
  ScrollView, // מאפשר גלילה
  StyleSheet, // הגדרת עיצובים
  Text,
  TextInput, // שדה קלט
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── שירותי API ──
import { getAllInterests } from "../src/api/interestService"; // טעינת תחומי עניין
import {
  addTripPreferenceInterest, // קישור תחום עניין להעדפה
  createTrip, // יצירת טיול חדש
  createTripPreferences, // יצירת אובייקט העדפות
} from "../src/api/tripService";
import { getUser } from "../src/auth/authStore"; // משיכת המשתמש המחובר
import { FONTS } from "../src/theme/fonts";

// ── פונקציות עזר לתאריכים ──

// המרה ממחרוזת "DD/MM/YY" או "DD/MM/YYYY" לאובייקט Date
// מחזירה null אם הפורמט שגוי או התאריך לא קיים בלוח השנה
function parseDDMMYY(str) {
  if (!str) return null;
  // רגקס לפיצוח 3 קבוצות מספרים מופרדות בלוכסן
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(str.trim());
  if (!m) return null;
  let d = parseInt(m[1], 10);
  let mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  // אם השנה דו-ספרתית — מוסיפים 2000 (25 → 2025)
  if (y < 100) y += 2000;
  // ולידציה בסיסית של טווחים
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d); // החודש ב-JS מתחיל מ-0
  // ולידציה: בודקת שהתאריך באמת קיים (למשל 31/2 לא יעבור)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

// ממיר אובייקט Date ל-"YYYY-MM-DD" (פורמט תקני לשרת)
function toIsoDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

// ── מיפוי מגדר מעברית לאנגלית (לשרת) ──
// השרת מצפה לערכים באנגלית; "הכל" מתורגם ל-null (אין העדפה).
// CHECK constraint ב-DB מתיר רק Male/Female/Other/NULL.
const GENDER_HE_TO_DB = {
  גבר: "Male",
  אישה: "Female",
  הכל: null,
};

// ─── הגדרת שאלות השאלון ─────────────────────────────────────────────────────
// כל שאלה מכילה: id (מפתח לשמירה), type (סוג השאלה), title (כותרת), progress (אחוז התקדמות)
// סדר המערך = סדר הצגת השאלות
const QUESTIONS = [
  {
    id: "intro", // מסך פתיחה (לא שאלה אמיתית)
    type: "intro",
    title: "שאלון העדפות טיול",
    subtitle: "בואי נתכנן יחד את הטיול המושלם שלך",
  },
  {
    id: "tripName", // שם הטיול — שדה טקסט חופשי
    type: "field",
    title: "איך נקרא לטיול שלך?",
    placeholder: "למשל: טיול שחרור לתאילנד",
  },
  {
    id: "destination", // יעד הטיול — לא חובה
    type: "field",
    title: "מה היעד?",
    placeholder: "יעד הטיול (לא חובה)",
    optional: true, // אם ריק — מציע גלגל מזל
  },
  {
    id: "dates", // תאריכי יציאה וחזרה
    type: "dates",
    title: "מתי יוצאים?",
  },
  {
    id: "gender", // העדפת מגדר לפרטנר
    type: "single-select",
    title: "איזה סוג של פרטנר/ית תרצי?",
    options: ["גבר", "אישה", "הכל"],
  },
  {
    id: "age", // העדפת גיל לפרטנר
    type: "age",
    title: "איזה גיל מתאים לי?",
  },
  {
    id: "lifestyle", // 5 העדפות לאורח חיים של הפרטנר — כולן אופציונליות
    type: "lifestyle",
    title: "אורח החיים שאני מחפש/ת",
    subtitle: "הכל אופציונלי — בחרי 'אין העדפה' אם זה לא חשוב לך",
  },
  {
    id: "interests", // תחומי עניין — נטענים מהשרת
    type: "multi-select",
    title: "תחומי עניין לטיול",
  },
];

// ─── ולידציה ─────────────────────────────────────────────────────────────────
// בודקת אם השאלה הנוכחית נענתה בצורה תקינה
// משמשת להפעלה/השבתה של כפתור "המשך"
function getIsAnswered(question, data) {
  switch (question.type) {
    case "intro":
      return true; // מסך פתיחה — תמיד "מאושר"
    case "field": {
      if (question.optional) return true; // שדה לא-חובה — תמיד מאושר
      return !!(data[question.id] || "").trim(); // חובה שיהיה טקסט אחרי trim
    }
    case "dates": {
      // startDate ו-endDate נשמרים כאובייקטי Date מבורר התאריכים
      const start = data.startDate;
      const end = data.endDate;
      if (!(start instanceof Date) || !(end instanceof Date)) return false;
      if (end < start) return false; // תאריך חזרה לא יכול להיות לפני יציאה
      return true;
    }
    case "single-select":
      return !!data[question.id]; // חובה לבחור אופציה
    case "age": {
      // ageRange הוא אובייקט { min, max } — שניהם חייבים להיות בטווח 18-60+
      // והגיל המינימלי לא יכול לעבור את המקסימלי
      const r = data.ageRange;
      if (!r || typeof r !== "object") return false;
      const okMin = r.min >= 18 && r.min <= 60;
      const okMax = r.max >= 18 && r.max <= 60;
      return okMin && okMax && r.min <= r.max;
    }
    case "multi-select":
      // חייב לפחות תחום עניין אחד
      return Array.isArray(data.interests) && data.interests.length > 0;
    case "lifestyle":
      // כל השאלות אופציונליות — תמיד מאושר
      return true;
    default:
      return false;
  }
}

// ─── הקומפוננטה הראשית ───────────────────────────────────────────────────────

export default function PreferencesQuizScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  // מספר השאלה הנוכחית (אינדקס במערך QUESTIONS)
  const [step, setStep] = useState(0);

  // כל הנתונים שנאספו מהמשתמש — אובייקט אחד עם כל השדות
  const [data, setData] = useState({
    tripName: "", // שם הטיול
    destination: "", // יעד
    startDate: null, // תאריך יציאה (Date מבורר התאריכים)
    endDate: null, // תאריך חזרה (Date מבורר התאריכים)
    recommendPeriod: false, // האם להמליץ על תקופה?
    gender: "", // העדפת מגדר
    ageRange: { min: 24, max: 38 }, // העדפת גיל — טווח עם min/max
    interests: [], // מערך IDs של תחומי עניין
    // ── העדפות אורח חיים לפרטנר/ית (אופציונלי — null = אין העדפה) ──
    partnerIsSmoker: null,       // true / false / null
    partnerKeepsKosher: null,
    partnerKeepsShabbat: null,
    partnerSpontaneity: null,    // 1..5 / null
    partnerLifestyle: null,
  });
  const isNewTripFlow = mode === "newTrip" || mode === "editTrip";

  // ── תחומי עניין מהשרת ──
  const [interestOptions, setInterestOptions] = useState([]); // הרשימה שנטענה
  const [interestsLoading, setInterestsLoading] = useState(true); // האם בטעינה?
  const [interestsLoadError, setInterestsLoadError] = useState(""); // שגיאת טעינה

  // ── בוררי תאריכים: איזה בורר פתוח כרגע (null = שום בורר לא פתוח) ──
  const [datePickerOpen, setDatePickerOpen] = useState(null); // "start" | "end" | null

  // ── מצב שליחה לשרת ──
  const [submitting, setSubmitting] = useState(false); // האם בתהליך שליחה?
  const [submitError, setSubmitError] = useState(""); // שגיאת שליחה

  // ── ערכי אנימציה (useRef שומר ערך בין renders ללא הפעלה מחדש) ──

  const fadeAnim = useRef(new Animated.Value(1)).current; // שקיפות בין מעברים
  const slideAnim = useRef(new Animated.Value(0)).current; // החלקה בין מעברים
  const nextBtnScale = useRef(new Animated.Value(1)).current; // גודל כפתור "המשך"

  const currentQ = QUESTIONS[step]; // השאלה הנוכחית
  const realQuestions = QUESTIONS.filter((q) => q.type !== "intro");

  const currentStepIndex = realQuestions.findIndex((q) => q.id === currentQ.id);
  const answered = getIsAnswered(currentQ, data); // האם נענתה?

  // ── טעינת תחומי עניין מהשרת — פעם אחת בעת טעינת הקומפוננטה ──
  useEffect(() => {
    // cancelled — דגל למניעת setState אחרי שהקומפוננטה כבר נסגרה
    let cancelled = false;
    (async () => {
      try {
        const result = await getAllInterests();
        if (!cancelled) {
          setInterestOptions(Array.isArray(result) ? result : []);
          setInterestsLoadError("");
        }
      } catch (err) {
        if (!cancelled) setInterestsLoadError(err.message);
      } finally {
        if (!cancelled) setInterestsLoading(false);
      }
    })();
    // cleanup: נקרא כשהקומפוננטה נסגרת — מונע memory leaks
    return () => {
      cancelled = true;
    };
  }, []); // [] = מערך תלויות ריק → רץ רק פעם אחת

  // ── אנימציית מעבר בין שאלות (fade-out → fade-in) ──
  // useCallback — הפונקציה נוצרת מחדש רק כשstep משתנה
  const animateTransition = useCallback(
    (nextStep) => {
      // כיוון ההחלקה: שמאלה אם מתקדמים, ימינה אם חוזרים אחורה
      const exitDir = nextStep > step ? -24 : 24;
      // שלב 1: פיידאאוט במקביל לתזוזה
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true, // אופטימיזציה — רץ ב-thread גרפי
        }),
        Animated.timing(slideAnim, {
          toValue: exitDir,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // שלב 2: אחרי שהתוכן נעלם — מחליפים את השאלה ומכניסים אותה מהצד השני
        setStep(nextStep);
        slideAnim.setValue(-exitDir); // מתחיל מצד הפוך
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [step],
  );

  // ── עדכון שדה בודד ב-data ──
  // useCallback מבטיח שאותה פונקציה מחזירה (אופטימיזציית רנדור)
  const updateField = useCallback((key, value) => {
    // ...prev — מעתיק את כל השדות הקיימים, ומחליף רק את [key]
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── הוספה/הסרה של תחום עניין מהמערך ──
  const toggleInterest = useCallback((interestId) => {
    setData((prev) => ({
      ...prev,
      // אם כבר קיים — מסירים, אחרת מוסיפים (toggle)
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((i) => i !== interestId)
        : [...prev.interests, interestId],
    }));
  }, []);

  // ── שליחת כל נתוני הטיול ל-DB (3 קריאות API) ──
  const submitFullTrip = useCallback(async () => {
    const u = getUser();
    if (!u?.userID) {
      throw new Error("לא נמצא משתמש מחובר. נא להתחבר מחדש.");
    }

    // המרת המידע לפורמט שהשרת מצפה לו
    const dest = (data.destination || "").trim();
    // התאריכים כבר אובייקטי Date מבורר לוח השנה — אין צורך ב-parsing
    const start = data.startDate;
    const end = data.endDate;

    // ולידציה: תאריך יציאה לא יכול להיות בעבר
    const today = new Date();
    today.setHours(0, 0, 0, 0); // איפוס שעות לתחילת היום
    if (start < today) throw new Error("תאריך יציאה חייב להיות בעתיד");

    // ── שלב 1: יצירת רשומת Trip ──
    // Status הוא שדה חובה במודל בצד השרת. "Active" הוא ערך ברירת מחדל סביר
    // לטיול חדש שנוצר זה עתה. אם השרת מצפה לערך אחר (למשל "Open"/"Planning") —
    // יש לעדכן כאן.
    const tripId = await createTrip({
      CreatedByUserID: u.userID,
      Destination: dest,
      StartDate: toIsoDateOnly(start), // YYYY-MM-DD
      EndDate: toIsoDateOnly(end),
      Status: "Active",
    });

    // ── שלב 2: יצירת רשומת TripPreferences (קשורה ל-Trip) ──
    // טווח הגיל מגיע כ-{ min, max } מסליידר הטווח
    // שדות אורח חיים — null משמעו "אין העדפה" (כל השאלות בשלב lifestyle אופציונליות)
    const prefId = await createTripPreferences({
      TripID: tripId,
      PreferredGender: GENDER_HE_TO_DB[data.gender],
      PreferredAgeMin: data.ageRange?.min,
      PreferredAgeMax: data.ageRange?.max,
      IsSmoker: data.partnerIsSmoker,
      KeepsKosher: data.partnerKeepsKosher,
      KeepsShabbat: data.partnerKeepsShabbat,
      SpontaneityLevel: data.partnerSpontaneity,
      LifestyleLevel: data.partnerLifestyle,
    });
    // ── שלב 3: שמירת תחומי העניין שנבחרו (קישור many-to-many) ──
    if (Array.isArray(data.interests) && data.interests.length > 0) {
      // Promise.all שולח את כל הקריאות במקביל לחיסכון בזמן
      await Promise.all(
        data.interests.map((interestId) =>
          addTripPreferenceInterest(prefId, interestId),
        ),
      );
    }
  }, [data]);

  // ── מטפל בלחיצה על "המשך" ──
  const handleNext = async () => {
    // אם השאלה לא נענתה או בתהליך שליחה — לא עושים כלום
    if (!answered || submitting) return;

    // האם זו השאלה האחרונה?
    if (step === QUESTIONS.length - 1) {
      // אם המשתמש לא בחר יעד — מפנה לגלגל המזל
      if (!(data.destination || "").trim()) {
        router.push("/Wheel");
        return;
      }

      // אחרת — שולח את כל הנתונים לשרת
      setSubmitError("");
      setSubmitting(true);
      try {
        console.log("START submitFullTrip");

        await submitFullTrip();

        console.log("submitFullTrip SUCCESS");
        console.log("isNewTripFlow =", isNewTripFlow);

        if (isNewTripFlow) {
          console.log("NAVIGATING TO MYTRIPS");
          router.replace("/(tabs)/myTrips");
        } else {
          console.log("NAVIGATING TO HOME");
          router.replace("/(tabs)/Home");
        }
      } catch (err) {
        console.log("SUBMIT ERROR:", err);
        setSubmitError(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // שאלה אמצעית — מעבר חלק לשאלה הבאה
    animateTransition(step + 1);
  };

  // ── מטפל בלחיצה על "חזרה" ──
  const handleBack = () => {
    // אם זו לא השאלה הראשונה — חוזרים לקודמת; אחרת — חוזרים למסך הקודם
    if (step > 0) animateTransition(step - 1);
    else router.back();
  };

  // ── אנימציות פידבק לכפתור "המשך" ──
  // בלחיצה — מקטין את הכפתור מעט (אפקט "נלחץ")
  const onNextPressIn = () => {
    if (!answered) return;
    Animated.spring(nextBtnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };
  // בשחרור — מחזיר לגודל המלא
  const onNextPressOut = () => {
    Animated.spring(nextBtnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  // ─── פונקציות רנדור לכל סוג שאלה ──────────────────────────────────────────
  // כל סוג שאלה מטופל בפונקציה נפרדת — ארגון נקי וקל לתחזוקה

  // ── מסך הפתיחה — אייקון גדול + כותרת משנה ──
  const renderIntro = () => (
    <View style={styles.introWrapper}>
      <View style={styles.introIconCircle}>
        <Globe2 size={76} color="#1A3C40" strokeWidth={1.6} />
      </View>
      <Text style={styles.introSubtitle}>{currentQ.subtitle}</Text>
    </View>
  );

  // ── שדה טקסט פשוט (שם הטיול / יעד) ──
  const renderField = () => (
    <View style={styles.fieldsWrapper}>
      <TextInput
        style={styles.input}
        placeholder={currentQ.placeholder}
        placeholderTextColor="#aaa"
        textAlign="right" // יישור טקסט לימין (RTL)
        value={data[currentQ.id] || ""}
        // שמירת הערך ב-data תחת ה-id של השאלה
        onChangeText={(v) => updateField(currentQ.id, v)}
      />
      {/* טקסט עזרה רק לשדות אופציונליים */}
      {currentQ.optional ? (
        <Text style={styles.hintText}>
          ניתן לדלג — נציע לך יעד אקראי בגלגל המזל
        </Text>
      ) : null}
    </View>
  );

  // ── שאלת תאריכים: יציאה + חזרה + checkbox המלצה ──
  // formatDate ממיר Date → "DD/MM/YYYY" להצגה למשתמש (שאר ה-app עובד עם אובייקט Date)
  const formatDate = (d) =>
    d
      ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      : "DD/MM/YYYY";

  const renderDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <View style={styles.fieldsWrapper}>
        {/* תווית "תאריך יציאה" עם אייקון מטוס */}
        <View style={styles.dateLabelRow}>
          <Plane size={18} color="#1A3C40" strokeWidth={1.8} />
          <Text style={styles.dateLabel}>תאריך יציאה</Text>
        </View>
        {/* כפתור שפותח לוח שנה — תאריך יציאה */}
        <Pressable
          style={styles.dateInputCard}
          onPress={() => setDatePickerOpen("start")}
        >
          <Calendar size={18} color="#9AABAD" strokeWidth={1.8} />
          <Text
            style={[
              styles.dateTextInput,
              !data.startDate && styles.dateTextPlaceholder,
            ]}
          >
            {formatDate(data.startDate)}
          </Text>
        </Pressable>

        {/* תווית "תאריך חזרה" עם אייקון בית */}
        <View style={styles.dateLabelRow}>
          <Home size={18} color="#1A3C40" strokeWidth={1.8} />
          <Text style={styles.dateLabel}>תאריך חזרה</Text>
        </View>
        {/* כפתור שפותח לוח שנה — תאריך חזרה */}
        <Pressable
          style={styles.dateInputCard}
          onPress={() => setDatePickerOpen("end")}
        >
          <Calendar size={18} color="#9AABAD" strokeWidth={1.8} />
          <Text
            style={[
              styles.dateTextInput,
              !data.endDate && styles.dateTextPlaceholder,
            ]}
          >
            {formatDate(data.endDate)}
          </Text>
        </Pressable>

        {/* בורר תאריכים native — מוצג רק כש-datePickerOpen אינו null.
          minimumDate משתנה לפי איזה בורר פתוח: יציאה לא יכול להיות בעבר,
          חזרה לא יכול להיות לפני יציאה. */}
        {datePickerOpen && (
          <DateTimePicker
            value={
              datePickerOpen === "start"
                ? data.startDate || today
                : data.endDate || data.startDate || today
            }
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={
              datePickerOpen === "start" ? today : data.startDate || today
            }
            onChange={(event, date) => {
              // ב-Android הבורר נסגר לבד; ב-iOS משאירים פתוח עד שהמשתמש יגלול
              const isIos = Platform.OS === "ios";
              // datePickerOpen הוא "start"/"end" — ממפים לשם השדה האמיתי ב-data
              const fieldName =
                datePickerOpen === "start" ? "startDate" : "endDate";
              if (event.type === "set" && date) {
                updateField(fieldName, date);
                if (!isIos) setDatePickerOpen(null);
              } else if (!isIos) {
                setDatePickerOpen(null);
              }
            }}
          />
        )}
        {/* ב-iOS הבורר נשאר פתוח — מוסיפים כפתור "סיום" לסגירה ידנית */}
        {datePickerOpen && Platform.OS === "ios" && (
          <Pressable
            style={styles.dateDoneBtn}
            onPress={() => setDatePickerOpen(null)}
          >
            <Text style={styles.dateDoneText}>סיום</Text>
          </Pressable>
        )}

        {/* checkbox עם טקסט — לחיצה הופכת את המצב הבוליאני */}
        <Pressable
          style={styles.checkboxRow}
          onPress={() => updateField("recommendPeriod", !data.recommendPeriod)}
        >
          {/* ריבוע ה-checkbox — מקבל סגנון נוסף כשמסומן */}
          <View
            style={[
              styles.checkbox,
              data.recommendPeriod && styles.checkboxChecked,
            ]}
          >
            {/* סימן וי — מוצג רק כשמסומן */}
            {data.recommendPeriod && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            תמליצי לי על תקופה טובה לטיסה
          </Text>
        </Pressable>
      </View>
    );
  };

  // ── שאלת בחירה יחידה (single-select) — בחירת מגדר ──
  const renderSingleSelect = () => (
    <View style={styles.optionsContainer}>
      {/* רנדור של כל אופציה כפרטה לחיצה */}
      {currentQ.options.map((opt) => {
        const isSelected = data[currentQ.id] === opt;
        return (
          <Pressable
            key={opt}
            // סגנון דינמי: רגיל / נבחר / נלחץ
            style={({ pressed }) => [
              styles.optionBtn,
              isSelected && styles.selectedBtn,
              pressed && !isSelected && styles.pressedBtn,
            ]}
            onPress={() => updateField(currentQ.id, opt)}
          >
            <Text
              style={[styles.optionText, isSelected && styles.selectedText]}
            >
              {opt}
            </Text>
            {/* סימון וי — רק לאופציה שנבחרה */}
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );

  // ── שאלת גיל — סליידר טווח עם שני handles (min ו-max) ──
  // הסליידר נע בין AGE_MIN ל-AGE_MAX. data.ageRange = { min, max }.
  // המספרים מעל ה-handles מוצגים ב-row-reverse (RTL), כך ש-max מופיע מימין-שמאל.
  const renderAge = () => {
    const AGE_MIN = 18;
    const AGE_MAX = 60;
    const r = data.ageRange || { min: AGE_MIN, max: AGE_MAX };

    return (
      <View style={styles.fieldsWrapper}>
        <Text style={styles.ageHint}>טווח גילאים</Text>

        {/* תצוגה מרכזית של הטווח הנבחר — שני pills עם קו מקשר באמצע.
            ממורכז ויזואלית כדי שלא יזוז בעת גרירה של ה-handles. */}
        <View style={styles.ageRangeDisplay}>
          <View style={styles.ageNumberPill}>
            <Text style={styles.ageNumberText}>{r.min}</Text>
          </View>
          <View style={styles.ageRangeDash} />
          <View style={styles.ageNumberPill}>
            <Text style={styles.ageNumberText}>
              {r.max}
              {r.max >= AGE_MAX ? "+" : ""}
            </Text>
          </View>
        </View>

        <Slider
          value={[r.min, r.max]}
          minimumValue={AGE_MIN}
          maximumValue={AGE_MAX}
          step={1}
          minimumTrackTintColor="#1A3C40"
          maximumTrackTintColor="#D8E0E1"
          thumbTintColor="#fff"
          thumbStyle={styles.ageThumb}
          trackStyle={styles.ageTrack}
          containerStyle={styles.ageSliderContainer}
          onValueChange={(values) => {
            // הספרייה מחזירה [min, max] — שומרים כאובייקט נגיש בשאר הקוד
            updateField("ageRange", { min: values[0], max: values[1] });
          }}
        />

        {/* תוויות גבולות הסקלה — מתואמות לכיוון הסליידר */}
        <View style={styles.ageBoundsRow}>
          <Text style={styles.ageBound}>{AGE_MIN}</Text>
          <Text style={styles.ageBound}>+{AGE_MAX}</Text>
        </View>
      </View>
    );
  };

  // ── שאלת multi-select — תחומי עניין מהשרת ──
  const renderMultiSelect = () => {
    // מצב טעינה — מציג ספינר
    if (interestsLoading) {
      return (
        <View style={styles.optionsContainer}>
          <ActivityIndicator color="#1A3C40" />
        </View>
      );
    }

    // מצב שגיאה — מציג הודעת שגיאה
    if (interestsLoadError) {
      return (
        <View style={styles.optionsContainer}>
          <Text style={styles.submitErrorText}>
            כשל בטעינת תחומי העניין: {interestsLoadError}
          </Text>
        </View>
      );
    }

    // הצלחה — מציג רשת של תגיות לחיצות
    return (
      <View style={styles.tagsGrid}>
        {interestOptions.map((opt) => {
          // האם התג הזה כבר נבחר?
          const isSelected = data.interests.includes(opt.interestID);
          return (
            <Pressable
              key={opt.interestID}
              style={({ pressed }) => [
                styles.tag,
                isSelected && styles.tagSelected,
                pressed && !isSelected && styles.pressedBtn,
              ]}
              onPress={() => toggleInterest(opt.interestID)} // toggle
            >
              <Text
                style={[styles.tagText, isSelected && styles.tagTextSelected]}
              >
                {opt.interestName}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // ── שאלת lifestyle — 5 העדפות לפרטנר בקבוצה אחת ──
  // 3 שאלות בוליאניות (כן/לא/אין העדפה) + 2 דירוגים (1-5/אין העדפה)
  const renderTriToggle = (value, onChange) => (
    <View style={styles.triToggleRow}>
      <Pressable
        style={[styles.triBtn, value === true && styles.triBtnActive]}
        onPress={() => onChange(true)}
      >
        <Text style={[styles.triBtnText, value === true && styles.triBtnTextActive]}>כן</Text>
      </Pressable>
      <Pressable
        style={[styles.triBtn, value === false && styles.triBtnActive]}
        onPress={() => onChange(false)}
      >
        <Text style={[styles.triBtnText, value === false && styles.triBtnTextActive]}>לא</Text>
      </Pressable>
      <Pressable
        style={[styles.triBtnWide, value === null && styles.triBtnActive]}
        onPress={() => onChange(null)}
      >
        <Text style={[styles.triBtnText, value === null && styles.triBtnTextActive]}>אין העדפה</Text>
      </Pressable>
    </View>
  );

  const renderRatingWithNone = (value, onChange) => (
    <View>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            style={[styles.ratingDot, value === n && styles.ratingDotActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.ratingNum, value === n && styles.ratingNumActive]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[styles.noPrefBtn, value === null && styles.noPrefBtnActive]}
        onPress={() => onChange(null)}
      >
        <Text style={[styles.noPrefText, value === null && styles.noPrefTextActive]}>
          אין העדפה
        </Text>
      </Pressable>
    </View>
  );

  const renderLifestyleCard = (Icon, label, content) => (
    <View style={styles.lifestyleCard}>
      <View style={styles.lifestyleCardHeader}>
        <Icon size={20} color="#1A3C40" strokeWidth={2} />
        <Text style={styles.lifestyleCardLabel}>{label}</Text>
      </View>
      {content}
    </View>
  );

  const renderLifestyle = () => (
    <View style={styles.fieldsWrapper}>
      <Text style={styles.lifestyleIntro}>{currentQ.subtitle}</Text>

      {renderLifestyleCard(
        Cigarette,
        "פרטנר/ית מעשן/ת?",
        renderTriToggle(data.partnerIsSmoker, (v) => updateField("partnerIsSmoker", v)),
      )}

      {renderLifestyleCard(
        MoonStar,
        "פרטנר/ית שומר/ת שבת?",
        renderTriToggle(data.partnerKeepsShabbat, (v) =>
          updateField("partnerKeepsShabbat", v),
        ),
      )}

      {renderLifestyleCard(
        UtensilsCrossed,
        "פרטנר/ית שומר/ת כשרות?",
        renderTriToggle(data.partnerKeepsKosher, (v) => updateField("partnerKeepsKosher", v)),
      )}

      {renderLifestyleCard(
        Zap,
        "רמת ספונטניות מועדפת",
        <View>
          <Text style={styles.lifestyleHelp}>1 = שקול/ה ומחושב/ת · 5 = הרפתקנ/ית</Text>
          {renderRatingWithNone(data.partnerSpontaneity, (v) =>
            updateField("partnerSpontaneity", v),
          )}
        </View>,
      )}

      {renderLifestyleCard(
        Gem,
        "אורח חיים בטיול",
        <View>
          <Text style={styles.lifestyleHelp}>1 = פשוט וחסכוני · 5 = יוקרתי ומפנק</Text>
          {renderRatingWithNone(data.partnerLifestyle, (v) =>
            updateField("partnerLifestyle", v),
          )}
        </View>,
      )}
    </View>
  );

  const renderQuestionContent = () => {
    switch (currentQ.type) {
      case "intro":
        return renderIntro();
      case "field":
        return renderField();
      case "dates":
        return renderDates();
      case "single-select":
        return renderSingleSelect();
      case "age":
        return renderAge();
      case "lifestyle":
        return renderLifestyle();
      case "multi-select":
        return renderMultiSelect();
      default:
        return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const showProgress = currentQ.type !== "intro";
  const isLastStep = step === QUESTIONS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Stepper */}
        {showProgress ? (
          <View style={styles.stepperWrapper}>
            {realQuestions.map((q, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;

              return (
                <React.Fragment key={q.id}>
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isActive && styles.stepCircleActive,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          (isActive || isCompleted) && styles.stepNumberActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  {index < realQuestions.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        index < currentStepIndex && styles.stepLineCompleted,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        ) : (
          <View style={styles.progressSpacer} />
        )}
        {/* Animated content */}
        <Animated.View
          style={[
            styles.contentWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>{currentQ.title}</Text>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderQuestionContent()}
          </ScrollView>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          {submitError ? (
            <Text style={styles.submitErrorText}>{submitError}</Text>
          ) : null}
          <Animated.View
            style={[
              styles.nextBtnWrapper,
              { transform: [{ scale: nextBtnScale }] },
            ]}
          >
            <Pressable
              style={[
                styles.nextBtn,
                (!answered || submitting) && styles.nextBtnDisabled,
              ]}
              onPress={handleNext}
              onPressIn={onNextPressIn}
              onPressOut={onNextPressOut}
              disabled={!answered || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.nextBtnText,
                    !answered && styles.nextBtnTextDisabled,
                  ]}
                >
                  {currentQ.type === "intro"
                    ? "בואו נתחיל"
                    : isLastStep
                      ? "מוכנים למצוא התאמות"
                      : "נמשיך הלאה?"}
                </Text>
              )}
            </Pressable>
          </Animated.View>

          {step > 0 && !submitting ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.backLink}>חזרה לאחור</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  flex: { flex: 1, alignItems: "center" },

  // ── Progress ──
  progressSpacer: {
    width: "100%",
    paddingTop: 18,
    paddingBottom: 6,
  },

  // ── Stepper ──
  stepperWrapper: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 10,
  },

  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#D0D8DA",
    justifyContent: "center",
    alignItems: "center",
  },

  stepCircleActive: {
    backgroundColor: "#1A3C40",
    transform: [{ scale: 1.08 }],
  },

  stepCircleCompleted: {
    backgroundColor: "#1A3C40",
  },

  stepNumber: {
    color: "#5E6B6E",
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  stepNumberActive: {
    color: "#fff",
  },

  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#D0D8DA",
    marginHorizontal: 6,
    borderRadius: 2,
  },

  stepLineCompleted: {
    backgroundColor: "#1A3C40",
  },

  // ── Content ──
  contentWrapper: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontFamily: FONTS.extraBold,
    marginTop: 22,
    marginBottom: 28,
    textAlign: "center",
    paddingHorizontal: 24,
    color: "#1A1A1A",
  },
  scrollView: { width: "100%" },
  scrollArea: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  // ── Intro ──
  introWrapper: {
    width: "100%",
    alignItems: "center",
    paddingTop: 10,
  },
  introIconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
    ...SHADOW,
    shadowOpacity: 0.12,
  },
  introSubtitle: {
    fontSize: 17,
    fontFamily: FONTS.regular,
    color: "#555",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 26,
  },

  // ── Standard input ──
  fieldsWrapper: {
    width: "100%",
  },
  input: {
    backgroundColor: "#fff",
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#222",
    ...SHADOW,
  },
  hintText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#888",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 12,
  },

  // ── Dates ──
  dateLabelRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },
  dateInputCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    width: "100%",
    paddingVertical: 4,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 14,
    gap: 10,
    ...SHADOW,
  },
  dateTextInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#222",
  },
  // צבע אפור כשעוד לא נבחר תאריך — אפקט "placeholder"
  dateTextPlaceholder: {
    color: "#aaa",
  },
  // כפתור "סיום" שסוגר את בורר התאריכים ב-iOS
  dateDoneBtn: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  dateDoneText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },
  checkboxRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#9AABAD",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#1A3C40",
    borderColor: "#1A3C40",
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#333",
    flexShrink: 1,
    textAlign: "right",
  },

  // ── Single-select options ──
  optionsContainer: { width: "100%", alignItems: "center" },
  optionBtn: {
    backgroundColor: "#fff",
    width: "100%",
    paddingVertical: 17,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOW,
  },
  pressedBtn: { backgroundColor: "#F0F4F5" },
  selectedBtn: { backgroundColor: "#1A3C40", shadowOpacity: 0.18 },
  optionText: { fontSize: 17, fontFamily: FONTS.regular, color: "#333" },
  selectedText: { color: "#fff", fontFamily: FONTS.bold },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginLeft: 6,
  },

  // ── Age range slider ──
  ageHint: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
    marginBottom: 14,
  },
  // תצוגה מרכזית של הטווח: [min] — [max], pills יפים עם קו מקשר באמצע
  ageRangeDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  // pill לכל אחד מהמספרים — רקע turquoise כהה (כצבע הראשי), טקסט לבן
  ageNumberPill: {
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#1A3C40",
    alignItems: "center",
    shadowColor: "#1A3C40",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  ageNumberText: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#fff",
    letterSpacing: 0.5,
  },
  // קו מקשר עדין בין שני ה-pills
  ageRangeDash: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#1A3C40",
    opacity: 0.45,
  },
  // עיצוב הסליידר עצמו
  ageSliderContainer: {
    height: 40,
    width: "100%",
  },
  ageTrack: {
    height: 6,
    borderRadius: 3,
  },
  // ראשי הסליידר — לבנים עם מסגרת turquoise כדי להבליט
  ageThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#1A3C40",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  // שורת התוויות של גבולות הסקלה (+60 בצד שמאל, 18 בצד ימין)
  ageBoundsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 2,
  },
  ageBound: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#9AABAD",
  },

  // ── Tags grid (multi-select) ──
  tagsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    width: "100%",
  },
  tag: {
    backgroundColor: "#fff",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 22,
    ...SHADOW,
  },
  tagSelected: {
    backgroundColor: "#1A3C40",
    shadowOpacity: 0.18,
  },
  tagText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#333",
  },
  tagTextSelected: {
    color: "#fff",
    fontFamily: FONTS.bold,
  },

  // ── Lifestyle section (5 partner preferences) ──
  lifestyleIntro: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#7A8B8E",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  lifestyleCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    ...SHADOW,
  },
  lifestyleCardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  lifestyleCardLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    flex: 1,
    textAlign: "right",
  },
  lifestyleHelp: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#9A9A9A",
    textAlign: "right",
    marginBottom: 10,
  },

  // ── Tri-state toggle (yes / no / no-preference) ──
  triToggleRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  triBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F4F6F7",
    alignItems: "center",
  },
  triBtnWide: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F4F6F7",
    alignItems: "center",
  },
  triBtnActive: {
    backgroundColor: "#1A3C40",
  },
  triBtnText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#1A3C40",
  },
  triBtnTextActive: {
    color: "#fff",
    fontFamily: FONTS.bold,
  },

  // ── Rating 1-5 with "no preference" option ──
  ratingRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 10,
  },
  ratingDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: 10,
    backgroundColor: "#F4F6F7",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDotActive: {
    backgroundColor: "#1A3C40",
  },
  ratingNum: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },
  ratingNumActive: {
    color: "#fff",
  },
  noPrefBtn: {
    alignSelf: "center",
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#F4F6F7",
  },
  noPrefBtnActive: {
    backgroundColor: "#1A3C40",
  },
  noPrefText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#1A3C40",
  },
  noPrefTextActive: {
    color: "#fff",
    fontFamily: FONTS.bold,
  },

  // ── Submit error ──
  submitErrorText: {
    color: "#e74c3c",
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 24,
  },

  // ── Footer ──
  footer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#F0F2F5",
  },
  nextBtnWrapper: { width: "72%", marginBottom: 8 },
  nextBtn: {
    backgroundColor: "#1A3C40",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    ...SHADOW,
    shadowOpacity: 0.2,
  },
  nextBtnDisabled: {
    backgroundColor: "#C8D0D2",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: { fontFamily: FONTS.bold, fontSize: 18, color: "#fff" },
  nextBtnTextDisabled: { color: "#9AABAD" },
  backBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  backLink: {
    color: "#888",
    fontSize: 14,
    fontFamily: FONTS.regular,
    textDecorationLine: "underline",
  },
});

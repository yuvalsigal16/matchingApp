// ── ייבואים ──
import { Ionicons } from "@expo/vector-icons"; // אייקונים מוכרים (V/X וכו')
import { Slider } from "@miblanchard/react-native-slider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native"; // אנימציית פתיחה
// אייקונים מותאמים אישית — Plane/Home לתאריכים, Calendar למועדים
import {
  Calendar,
  Cigarette,
  Gem,
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
  Dimensions, // למדידת רוחב המסך (גודל אנימציית הפתיחה)
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
  addTripPreferenceInterest,
  createTrip,
  createTripPreferences,
  getTripPreferenceInterests,
  getTripPreferences,
  removeTripPreferenceInterest,
  updateTrip,
  updateTripPreferences,
} from "../src/api/tripService";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
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

// ממיר אובייקט Date ל-"YYYY-MM-DD" לפי שעון מקומי (לא UTC)
function toIsoDateOnly(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── מיפוי מגדר מעברית לאנגלית (לשרת) ──
// השרת מצפה לערכים באנגלית; "הכל" מתורגם ל-null (אין העדפה).
// CHECK constraint ב-DB מתיר רק Male/Female/Other/NULL.
const GENDER_HE_TO_DB = {
  גבר: "Male",
  אישה: "Female",
  הכל: null,
};

const GENDER_DB_TO_HE = {
  Male: "גבר",
  Female: "אישה",
};

const MONTHS_HE = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// ─── הגדרת שאלות השאלון ─────────────────────────────────────────────────────
// כל שאלה מכילה: id (מפתח לשמירה), type (סוג השאלה), title (כותרת), progress (אחוז התקדמות)
// רוחב המסך — לחישוב גודל אנימציית הפתיחה
const { width: SCREEN_W } = Dimensions.get("window");

// סדר המערך = סדר הצגת השאלות
const QUESTIONS = [
  {
    id: "intro", // מסך פתיחה (לא שאלה אמיתית)
    type: "intro",
    title: "שאלון העדפות טיול",
    subtitle: "כל מסע מתחיל בחלום — בואי נגשים אותו יחד",
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
      const start = data.startDate;
      if (!(start instanceof Date) || isNaN(start)) return false;
      if (data.oneWay) return true; // כרטיס לכיוון אחד — מספיק תאריך יציאה
      const end = data.endDate;
      if (!(end instanceof Date) || isNaN(end)) return false;
      if (end < start) return false;
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
  const { mode, tripId } = useLocalSearchParams();
  const [step, setStep] = useState(0);

  // כל הנתונים שנאספו מהמשתמש — אובייקט אחד עם כל השדות
  const [data, setData] = useState({
    tripName: "", // שם הטיול
    destination: "", // יעד
    startDate: null, // תאריך יציאה (Date מבורר התאריכים)
    endDate: null, // תאריך חזרה (Date מבורר התאריכים)
    oneWay: false, // כרטיס לכיוון אחד — אין תאריך חזרה
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

  // ── המלצת תקופת טיסה ──
  const [recLoading, setRecLoading] = useState(false);
  const [recInfo, setRecInfo] = useState(null); // { placeName, bestMonths } | { error } | null

  // ── ערכי אנימציה (useRef שומר ערך בין renders ללא הפעלה מחדש) ──

  const fadeAnim = useRef(new Animated.Value(1)).current; // שקיפות בין מעברים
  const slideAnim = useRef(new Animated.Value(0)).current; // החלקה בין מעברים
  const nextBtnScale = useRef(new Animated.Value(1)).current; // גודל כפתור "המשך"

  const currentQ = QUESTIONS[step]; // השאלה הנוכחית
  const realQuestions = QUESTIONS.filter((q) => q.type !== "intro");

  const currentStepIndex = realQuestions.findIndex((q) => q.id === currentQ.id);
  const answered = mode === "editTrip" || getIsAnswered(currentQ, data);

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
    return () => { cancelled = true; };
  }, []);

  // טעינת נתוני טיול קיים במצב עריכה
  useEffect(() => {
    if (mode !== "editTrip" || !tripId) return;
    (async () => {
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [tripRes, prefRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/Trip/${tripId}`, { headers }),
          getTripPreferences(tripId),
        ]);

        const updates = {};

        if (tripRes.status === "fulfilled" && tripRes.value.ok) {
          const t = await tripRes.value.json();
          updates.destination = t.destination || "";
          if (t.startDate) {
            const m = String(t.startDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) updates.startDate = new Date(+m[1], +m[2] - 1, +m[3]);
          }
          if (t.endDate) {
            const m = String(t.endDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) updates.endDate = new Date(+m[1], +m[2] - 1, +m[3]);
          }
        }

        if (prefRes.status === "fulfilled" && prefRes.value) {
          const p = prefRes.value;
          updates.gender = GENDER_DB_TO_HE[p.preferredGender] || "הכל";
          updates.ageRange = {
            min: p.preferredAgeMin ?? 18,
            max: p.preferredAgeMax ?? 60,
          };
          updates.partnerIsSmoker = p.isSmoker ?? null;
          updates.partnerKeepsKosher = p.keepsKosher ?? null;
          updates.partnerKeepsShabbat = p.keepsShabbat ?? null;
          updates.partnerSpontaneity = p.spontaneityLevel ?? null;
          updates.partnerLifestyle = p.lifestyleLevel ?? null;

          // טען תחומי עניין קיימים
          try {
            const ints = await getTripPreferenceInterests(p.tripPreferenceID);
            updates.interests = (ints || []).map((i) => i.interestID ?? i.InterestID);
          } catch {}
        }

        setData((prev) => ({ ...prev, ...updates }));
        // קפוץ ישר לשלב הראשון הממשי (דלג על מסך intro)
        setStep(1);
      } catch (err) {
        console.log("[editTrip] load error:", err);
      }
    })();
  }, [mode, tripId]);

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
      TripName: (data.tripName || "").trim() || dest,
      Destination: dest,
      StartDate: toIsoDateOnly(start), // YYYY-MM-DD
      EndDate: end ? toIsoDateOnly(end) : null,
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

  // ── עדכון טיול קיים (מצב עריכה) ──
  const updateFullTrip = useCallback(async () => {
    const dest = (data.destination || "").trim();
    const start = data.startDate;
    const end = data.endDate;
    if (!start) throw new Error("חובה לבחור תאריך יציאה");

    // עדכן את הטיול עצמו
    await updateTrip({
      TripID: Number(tripId),
      Destination: dest,
      StartDate: toIsoDateOnly(start),
      EndDate: end ? toIsoDateOnly(end) : null,
      Status: "Active",
    });

    // טען העדפות קיימות כדי לקבל את ה-ID
    const existingPref = await getTripPreferences(tripId);
    if (existingPref) {
      await updateTripPreferences({
        TripPreferenceID: existingPref.tripPreferenceID,
        TripID: Number(tripId),
        PreferredGender: GENDER_HE_TO_DB[data.gender],
        PreferredAgeMin: data.ageRange?.min,
        PreferredAgeMax: data.ageRange?.max,
        IsSmoker: data.partnerIsSmoker,
        KeepsKosher: data.partnerKeepsKosher,
        KeepsShabbat: data.partnerKeepsShabbat,
        SpontaneityLevel: data.partnerSpontaneity,
        LifestyleLevel: data.partnerLifestyle,
      });

      // עדכן תחומי עניין — מחק ישנים, הוסף חדשים
      const prefId = existingPref.tripPreferenceID;
      const oldInts = await getTripPreferenceInterests(prefId).catch(() => []);
      const oldIds = (oldInts || []).map((i) => i.interestID ?? i.InterestID);
      const newIds = data.interests || [];

      await Promise.all([
        ...oldIds.filter((id) => !newIds.includes(id)).map((id) =>
          removeTripPreferenceInterest(prefId, id).catch(() => {})
        ),
        ...newIds.filter((id) => !oldIds.includes(id)).map((id) =>
          addTripPreferenceInterest(prefId, id).catch(() => {})
        ),
      ]);
    }
  }, [data, tripId]);

  // ── מטפל בלחיצה על "המשך" ──
  // ── מעבר אוטומטי ממסך הפתיחה לשאלה הראשונה (בלי לחיצה), אחרי כמה שניות ──
  useEffect(() => {
    if (currentQ.type !== "intro") return;
    const timer = setTimeout(() => animateTransition(step + 1), 3500);
    return () => clearTimeout(timer);
  }, [currentQ.type, step, animateTransition]);

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
        if (mode === "editTrip") {
          await updateFullTrip();
        } else {
          await submitFullTrip();
        }
        router.replace("/(tabs)/myTrips");
      } catch (err) {
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
      <LottieView
        source={require("../../assets/lottie/globev3.json")}
        autoPlay
        loop
        style={styles.introLottie}
      />
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
  // ── שליפת המלצת תקופה מ-Claude AI דרך השרת ──
  const handleRecommendToggle = async () => {
    const next = !data.recommendPeriod;
    updateField("recommendPeriod", next);
    if (!next) { setRecInfo(null); return; }

    const dest = (data.destination || "").trim();
    if (!dest) { setRecInfo({ error: "יש להזין יעד טיול כדי לקבל המלצה" }); return; }

    setRecLoading(true);
    setRecInfo(null);
    try {
      const token = getToken();
      const res = await fetch(
        `${BASE_URL}/Trip/recommend-period?destination=${encodeURIComponent(dest)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) {
        const serverMsg = await res.text().catch(() => "");
        throw new Error(serverMsg || `שגיאה בקבלת המלצה מהשרת (${res.status})`);
      }
      const json = await res.json();
      setRecInfo({ placeName: dest, bestMonths: json.months, reason: json.reason });
    } catch (e) {
      setRecInfo({ error: e.message || "שגיאה בטעינת המלצה" });
    } finally {
      setRecLoading(false);
    }
  };

  // ── כרטיסיית המלצה — מוצגת מתחת לצ'קבוקס בשני גרסאות (web + native) ──
  const renderRecCard = () => {
    if (!data.recommendPeriod) return null;
    if (recLoading) return (
      <View style={styles.recCard}>
        <ActivityIndicator size="small" color="#1A3C40" />
        <Text style={styles.recLoadingText}>טוענת המלצה מהבינה המלאכותית...</Text>
      </View>
    );
    if (!recInfo) return null;
    if (recInfo.error) return (
      <View style={[styles.recCard, styles.recCardError]}>
        <Text style={styles.recErrorText}>{recInfo.error}</Text>
      </View>
    );
    return (
      <View style={styles.recCard}>
        <Text style={styles.recTitle}>{recInfo.placeName}</Text>
        <View style={styles.recMonthsRow}>
          {recInfo.bestMonths.map((m) => (
            <View key={m} style={styles.recMonthBadge}>
              <Text style={styles.recMonthText}>{MONTHS_HE[m]}</Text>
            </View>
          ))}
        </View>
        {recInfo.reason && (
          <Text style={styles.recReason}>{recInfo.reason}</Text>
        )}
      </View>
    );
  };

  // formatDate ממיר Date → "DD/MM/YYYY" להצגה למשתמש (שאר ה-app עובד עם אובייקט Date)
  const formatDate = (d) =>
    d
      ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      : "DD/MM/YYYY";

  // סגנון CSS לשדה תאריך web — טקסט כהה על רקע שקוף
  const webInputStyle = (hasValue) => ({
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 15,
    colorScheme: "light",
    color: hasValue ? "#222" : "#aaa",
    direction: "rtl",
    cursor: "pointer",
    width: "100%",
    fontFamily: "inherit",
  });

  const renderDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toInputVal = (d) =>
      d instanceof Date && !isNaN(d)
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : "";

    const fromInputVal = (str) => {
      if (!str) return null;
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    const todayStr = toInputVal(today);

    // ── גרסת WEB ──────────────────────────────────────────────────────────────
    if (Platform.OS === "web") {
      return (
        <View style={styles.fieldsWrapper}>
          <View style={styles.dateLabelRow}>
            <Plane size={18} color="#1A3C40" strokeWidth={1.8} />
            <Text style={styles.dateLabel}>תאריך יציאה</Text>
          </View>
          <View style={styles.dateInputCard}>
            <input
              type="date"
              min={todayStr}
              value={toInputVal(data.startDate)}
              onChange={(e) => updateField("startDate", fromInputVal(e.target.value))}
              style={webInputStyle(!!data.startDate)}
            />
          </View>

          {/* checkbox כרטיס לכיוון אחד */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => {
              const next = !data.oneWay;
              updateField("oneWay", next);
              if (next) updateField("endDate", null);
            }}
          >
            <View style={[styles.checkbox, data.oneWay && styles.checkboxChecked]}>
              {data.oneWay && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>כרטיס לכיוון אחד (ללא תאריך חזרה)</Text>
          </Pressable>

          {!data.oneWay && (
            <>
              <View style={styles.dateLabelRow}>
                <Home size={18} color="#1A3C40" strokeWidth={1.8} />
                <Text style={styles.dateLabel}>תאריך חזרה</Text>
              </View>
              <View style={styles.dateInputCard}>
                <input
                  type="date"
                  min={toInputVal(data.startDate) || todayStr}
                  value={toInputVal(data.endDate)}
                  onChange={(e) => updateField("endDate", fromInputVal(e.target.value))}
                  style={webInputStyle(!!data.endDate)}
                />
              </View>
            </>
          )}

          <Pressable
            style={styles.checkboxRow}
            onPress={handleRecommendToggle}
          >
            <View style={[styles.checkbox, data.recommendPeriod && styles.checkboxChecked]}>
              {data.recommendPeriod && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>תמליצי לי על תקופה טובה לטיסה</Text>
          </Pressable>
          {renderRecCard()}
        </View>
      );
    }

    // ── גרסת NATIVE (iOS + Android) ───────────────────────────────────────────
    return (
      <View style={styles.fieldsWrapper}>
        <View style={styles.dateLabelRow}>
          <Plane size={18} color="#1A3C40" strokeWidth={1.8} />
          <Text style={styles.dateLabel}>תאריך יציאה</Text>
        </View>
        <Pressable
          style={styles.dateInputCard}
          onPress={() => setDatePickerOpen("start")}
        >
          <Calendar size={18} color="#9AABAD" strokeWidth={1.8} />
          <Text style={[styles.dateTextInput, !data.startDate && styles.dateTextPlaceholder]}>
            {formatDate(data.startDate)}
          </Text>
        </Pressable>

        {/* checkbox כרטיס לכיוון אחד */}
        <Pressable
          style={styles.checkboxRow}
          onPress={() => {
            const next = !data.oneWay;
            updateField("oneWay", next);
            if (next) {
              updateField("endDate", null);
              setDatePickerOpen(null);
            }
          }}
        >
          <View style={[styles.checkbox, data.oneWay && styles.checkboxChecked]}>
            {data.oneWay && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>כרטיס לכיוון אחד (ללא תאריך חזרה)</Text>
        </Pressable>

        {!data.oneWay && (
          <>
            <View style={styles.dateLabelRow}>
              <Home size={18} color="#1A3C40" strokeWidth={1.8} />
              <Text style={styles.dateLabel}>תאריך חזרה</Text>
            </View>
            <Pressable
              style={styles.dateInputCard}
              onPress={() => setDatePickerOpen("end")}
            >
              <Calendar size={18} color="#9AABAD" strokeWidth={1.8} />
              <Text style={[styles.dateTextInput, !data.endDate && styles.dateTextPlaceholder]}>
                {formatDate(data.endDate)}
              </Text>
            </Pressable>
          </>
        )}

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
              const isIos = Platform.OS === "ios";
              const fieldName = datePickerOpen === "start" ? "startDate" : "endDate";
              if (event.type === "set" && date) {
                updateField(fieldName, date);
                if (!isIos) setDatePickerOpen(null);
              } else if (!isIos) {
                setDatePickerOpen(null);
              }
            }}
          />
        )}
        {datePickerOpen && Platform.OS === "ios" && (
          <Pressable style={styles.dateDoneBtn} onPress={() => setDatePickerOpen(null)}>
            <Text style={styles.dateDoneText}>סיום</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.checkboxRow}
          onPress={handleRecommendToggle}
        >
          <View style={[styles.checkbox, data.recommendPeriod && styles.checkboxChecked]}>
            {data.recommendPeriod && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>תמליצי לי על תקופה טובה לטיסה</Text>
        </Pressable>
        {renderRecCard()}
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

        <View style={styles.ageRangeDisplay}>
          <View style={styles.ageNumberPill}>
            <Text style={styles.ageNumberText}>{r.min}</Text>
          </View>
          <View style={styles.ageRangeDash} />
          <View style={styles.ageNumberPill}>
            <Text style={styles.ageNumberText}>
              {r.max}{r.max >= AGE_MAX ? "+" : ""}
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
            updateField("ageRange", { min: values[0], max: values[1] });
          }}
        />

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
          <View style={styles.progressSpacer}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.introBackBtn, pressed && { opacity: 0.5 }]}
            >
              <Ionicons name="chevron-forward" size={26} color="#1A3C40" />
            </Pressable>
          </View>
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
          {currentQ.type !== "intro" && (
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
          )}

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
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  introBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
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
  introLottie: {
    width: SCREEN_W * 0.9,
    height: SCREEN_W * 0.9,
    marginBottom: 8,
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

  // ── Recommendation card ──
  recCard: {
    backgroundColor: "#EAF4F4",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    width: "100%",
    flexDirection: "column",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C5DFE0",
  },
  recCardError: {
    backgroundColor: "#FFF0F0",
    borderColor: "#F5C0C0",
  },
  recTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
  },
  recMonthsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  recMonthBadge: {
    backgroundColor: "#1A3C40",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  recMonthText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: "#fff",
  },
  recLoadingText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#1A3C40",
    textAlign: "right",
    marginTop: 6,
  },
  recReason: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#2C6B6E",
    textAlign: "right",
    marginTop: 4,
  },
  recErrorText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#C0392B",
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

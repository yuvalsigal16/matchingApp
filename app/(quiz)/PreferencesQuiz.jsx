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
  Compass,
  Gem,
  Home,
  Landmark,
  Leaf,
  MoonStar,
  Mountain,
  Music,
  PartyPopper,
  Plane,
  ShoppingBag,
  Umbrella,
  Utensils,
  UtensilsCrossed,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, // אינדיקטור טעינה (ספינר עגול)
  Animated, // לאנימציות מעבר בין שאלות
  Dimensions, // למדידת רוחב המסך (גודל אנימציית הפתיחה)
  Platform, // מאפשר לבדוק אם זה iOS או Android
  Pressable, // כפתור עם פידבק לחיצה
  StyleSheet, // הגדרת עיצובים
  Text,
  TextInput, // שדה קלט
  View,
} from "react-native";

// ── שירותי API ──
import { getAllInterests } from "../src/api/interestService"; // טעינת תחומי עניין
import {
  addTripPreferenceInterest,
  addTripPreferencePriority,
  clearTripPreferencePriorities,
  createFullTrip,
  getTripPreferenceInterests,
  getTripPreferencePriorities,
  getTripPreferences,
  removeTripPreferenceInterest,
  updateTrip,
  updateTripPreferences,
} from "../src/api/tripService";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from "../src/theme";
import QuizShell from "../../components/ui/QuizShell";
import CompletionOverlay from "../../components/ui/CompletionOverlay";
import Tappable from "../../components/ui/Tappable";

// אייקון לכל תחום עניין (לפי שם מהשרת) — זהה ל-Quiz, לרצף ויזואלי.
const INTEREST_ICONS = {
  "אקסטרים": Mountain,
  "טבע": Leaf,
  "תרבות": Landmark,
  "קולינריה": Utensils,
  "שופינג": ShoppingBag,
  "בטן גב": Umbrella,
  "מוזיקה": Music,
  "מסיבות": PartyPopper,
};
const interestIcon = (name) => INTEREST_ICONS[name] || Compass;

// ── פונקציות עזר לתאריכים ──

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

// בונה את אובייקט העדפות הפרטנר מתשובות השאלון.
// משותף למסלול הרגיל (submitFullTrip) ולמסלול הגלגל — כדי לא לשכפל את המיפוי.
function buildPartnerPref(data) {
  return {
    PreferredGender: GENDER_HE_TO_DB[data.gender],
    PreferredAgeMin: data.ageRange?.min,
    PreferredAgeMax: data.ageRange?.max,
    IsSmoker: data.partnerIsSmoker,
    KeepsKosher: data.partnerKeepsKosher,
    KeepsShabbat: data.partnerKeepsShabbat,
    SpontaneityLevel: data.partnerSpontaneity,
    LifestyleLevel: data.partnerLifestyle,
  };
}

const GENDER_DB_TO_HE = {
  Male: "גבר",
  Female: "אישה",
};

const MONTHS_HE = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// ── גורמי ההתאמה לדירוג חשיבות אישי ──
// ה-key חייב להתאים למפתחות באלגוריתם (TripMatches) ול-CHECK ב-DB.
// המשתמש בוחר עד MAX_PRIORITIES לפי הסדר, והאלגוריתם נותן להם משקל גבוה יותר.
const PRIORITY_FACTORS = [
  { key: "gender", label: "מגדר הפרטנר" },
  { key: "interests", label: "תחומי עניין משותפים" },
  { key: "age", label: "טווח הגילאים" },
  { key: "smoker", label: "עישון" },
  { key: "kosher", label: "כשרות" },
  { key: "shabbat", label: "שמירת שבת" },
  { key: "spontaneity", label: "רמת ספונטניות" },
  { key: "lifestyle", label: "אורח חיים" },
];
const MAX_PRIORITIES = 3;

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
  {
    id: "priorities", // דירוג חשיבות הגורמים — אופציונלי
    type: "priorities",
    title: "מה הכי חשוב לך בהתאמה?",
    subtitle: `בחרי עד ${MAX_PRIORITIES} לפי הסדר — האלגוריתם ייתן להם משקל גבוה יותר`,
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
    case "priorities":
      // דירוג חשיבות אופציונלי — תמיד מאושר
      return true;
    default:
      return false;
  }
}

// רמז ידידותי *למה* אי אפשר להמשיך (למקום כפתור מושבת ואילם). קריאה-בלבד.
function getValidationHint(question, data) {
  switch (question.type) {
    case "field":
      return question.optional ? "" : "יש למלא שדה זה";
    case "dates": {
      const start = data.startDate;
      if (!(start instanceof Date) || isNaN(start)) return "בחרו תאריך יציאה";
      if (!data.oneWay) {
        const end = data.endDate;
        if (!(end instanceof Date) || isNaN(end)) return "בחרו תאריך חזרה";
        if (end < start) return "תאריך החזרה חייב להיות אחרי היציאה";
      }
      return "";
    }
    case "single-select":
      return "בחרו אפשרות אחת";
    case "age":
      return "כוונו את טווח הגילאים";
    case "multi-select":
      return "בחרו לפחות תחום עניין אחד";
    default:
      return "";
  }
}

// ─── הקומפוננטה הראשית ───────────────────────────────────────────────────────

export default function PreferencesQuizScreen() {
  const router = useRouter();
  const { mode, tripId } = useLocalSearchParams();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false); // רגע-סיום קצר לפני היציאה מהאונבורדינג

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
    priorities: [], // דירוג חשיבות הגורמים (מערך keys לפי סדר) — אופציונלי
  });

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

  const currentQ = QUESTIONS[step]; // השאלה הנוכחית
  const realQuestions = QUESTIONS.filter((q) => q.type !== "intro");

  const currentStepIndex = realQuestions.findIndex((q) => q.id === currentQ.id);
  const answered = mode === "editTrip" || getIsAnswered(currentQ, data);
  const isLastStep = step === QUESTIONS.length - 1;
  const isIntro = currentQ.type === "intro";
  // רמז מוצג מעל ה-CTA כשהוא מושבת (לא ב-intro / edit).
  const validationHint = !answered ? getValidationHint(currentQ, data) : "";

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

          // טען דירוג חשיבות קיים (ממוין לפי PriorityRank)
          try {
            const prios = await getTripPreferencePriorities(p.tripPreferenceID);
            updates.priorities = (prios || [])
              .slice()
              .sort((a, b) => a.priorityRank - b.priorityRank)
              .map((x) => x.factor)
              .filter(Boolean);
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

  // ── הוספה/הסרה של גורם מדירוג החשיבות (שומר על הסדר, עד MAX_PRIORITIES) ──
  const togglePriority = useCallback((factorKey) => {
    setData((prev) => {
      if (prev.priorities.includes(factorKey)) {
        return { ...prev, priorities: prev.priorities.filter((k) => k !== factorKey) };
      }
      if (prev.priorities.length >= MAX_PRIORITIES) return prev; // הגענו למקסימום
      return { ...prev, priorities: [...prev.priorities, factorKey] };
    });
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

    // שמירה מלאה דרך הפונקציה המשותפת (Trip + העדפות + תחומי עניין + דירוגים).
    // אותן קריאות ובאותו סדר כמו קודם — רק מרוכזות במקום אחד (משותף עם מסלול הגלגל).
    await createFullTrip({
      createdByUserID: u.userID,
      tripName: (data.tripName || "").trim() || dest,
      destination: dest,
      startDate: toIsoDateOnly(start), // YYYY-MM-DD
      endDate: end ? toIsoDateOnly(end) : null,
      pref: buildPartnerPref(data),
      interests: data.interests || [],
      priorities: data.priorities || [],
    });
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

      // עדכן דירוג חשיבות — מנקים הכל ומוסיפים מחדש לפי הסדר הנוכחי
      await clearTripPreferencePriorities(prefId).catch(() => {});
      if (Array.isArray(data.priorities) && data.priorities.length > 0) {
        await Promise.all(
          data.priorities.map((factor, idx) =>
            addTripPreferencePriority(prefId, factor, idx + 1).catch(() => {}),
          ),
        );
      }
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
      // אם המשתמש לא בחר יעד — מפנה לגלגל המזל.
      // מעבירים את ההעדפות שכבר נאספו כדי שהגלגל ישמור טיול *מלא* (ולא יאבד אותן).
      if (!(data.destination || "").trim()) {
        const wheelPrefs = {
          tripName: (data.tripName || "").trim(),
          startDate: data.startDate ? toIsoDateOnly(data.startDate) : null,
          endDate: data.endDate ? toIsoDateOnly(data.endDate) : null,
          pref: buildPartnerPref(data),
          interests: data.interests || [],
          priorities: data.priorities || [],
        };
        router.push({
          pathname: "/Wheel",
          params: { prefs: JSON.stringify(wheelPrefs) },
        });
        return;
      }

      // אחרת — שולח את כל הנתונים לשרת
      setSubmitError("");
      setSubmitting(true);
      try {
        if (mode === "editTrip") {
          await updateFullTrip();
          router.replace("/(tabs)/myTrips");
        } else {
          await submitFullTrip();
          // רגע-סיום קצר לפני הכניסה למוצר (רק בסיום אונבורדינג, לא בעריכה).
          setDone(true);
          setTimeout(() => router.replace("/(tabs)/myTrips"), 1500);
        }
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
      <Text style={styles.introTitle}>{currentQ.title}</Text>
      <Text style={styles.introSubtitle}>{currentQ.subtitle}</Text>
    </View>
  );

  // ── שדה טקסט פשוט (שם הטיול / יעד) ──
  const renderField = () => (
    <View style={styles.fieldsWrapper}>
      <TextInput
        style={styles.input}
        placeholder={currentQ.placeholder}
        placeholderTextColor={COLORS.textMuted}
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
        <ActivityIndicator size="small" color={COLORS.brand} />
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
    color: hasValue ? "#222" : COLORS.textMuted,
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
            <Plane size={18} color={COLORS.brand} strokeWidth={1.8} />
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
              {data.oneWay && <Ionicons name="checkmark" size={16} color={COLORS.onBrand} />}
            </View>
            <Text style={styles.checkboxLabel}>כרטיס לכיוון אחד (ללא תאריך חזרה)</Text>
          </Pressable>

          {!data.oneWay && (
            <>
              <View style={styles.dateLabelRow}>
                <Home size={18} color={COLORS.brand} strokeWidth={1.8} />
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
              {data.recommendPeriod && <Ionicons name="checkmark" size={16} color={COLORS.onBrand} />}
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
          <Plane size={18} color={COLORS.brand} strokeWidth={1.8} />
          <Text style={styles.dateLabel}>תאריך יציאה</Text>
        </View>
        <Pressable
          style={styles.dateInputCard}
          onPress={() => setDatePickerOpen("start")}
        >
          <Calendar size={18} color={COLORS.textMuted} strokeWidth={1.8} />
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
            {data.oneWay && <Ionicons name="checkmark" size={16} color={COLORS.onBrand} />}
          </View>
          <Text style={styles.checkboxLabel}>כרטיס לכיוון אחד (ללא תאריך חזרה)</Text>
        </Pressable>

        {!data.oneWay && (
          <>
            <View style={styles.dateLabelRow}>
              <Home size={18} color={COLORS.brand} strokeWidth={1.8} />
              <Text style={styles.dateLabel}>תאריך חזרה</Text>
            </View>
            <Pressable
              style={styles.dateInputCard}
              onPress={() => setDatePickerOpen("end")}
            >
              <Calendar size={18} color={COLORS.textMuted} strokeWidth={1.8} />
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
            {data.recommendPeriod && <Ionicons name="checkmark" size={16} color={COLORS.onBrand} />}
          </View>
          <Text style={styles.checkboxLabel}>תמליצי לי על תקופה טובה לטיסה</Text>
        </Pressable>
        {renderRecCard()}
      </View>
    );
  };

  // ── שאלת בחירה יחידה (single-select) — בחירת מגדר ──
  const renderSingleSelect = () => (
    <View style={styles.chipsWrap}>
      {currentQ.options.map((opt) => {
        const isSelected = data[currentQ.id] === opt;
        return (
          <Tappable
            key={opt}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => updateField(currentQ.id, opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={opt}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {opt}
            </Text>
          </Tappable>
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
          minimumTrackTintColor={COLORS.brand}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.onBrand}
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
          <ActivityIndicator color={COLORS.brand} />
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

    // הצלחה — שבבים (chips) עם אייקון, זהים ל-Quiz
    return (
      <View style={styles.chipsWrap}>
        {interestOptions.map((opt) => {
          const isSelected = data.interests.includes(opt.interestID);
          const Icon = interestIcon(opt.interestName);
          return (
            <Tappable
              key={opt.interestID}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleInterest(opt.interestID)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={opt.interestName}
            >
              <Icon
                size={18}
                color={isSelected ? COLORS.onBrand : COLORS.brand}
                strokeWidth={2}
              />
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {opt.interestName}
              </Text>
            </Tappable>
          );
        })}
      </View>
    );
  };

  // ── שאלת lifestyle — 5 העדפות לפרטנר בקבוצה אחת ──
  // 3 שאלות בוליאניות (כן/לא/אין העדפה) + 2 דירוגים (1-5/אין העדפה)
  const renderTriToggle = (value, onChange) => (
    <View style={styles.triToggleRow}>
      <Tappable
        style={[styles.triBtn, value === true && styles.triBtnActive]}
        onPress={() => onChange(true)}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === true }}
        accessibilityLabel="כן"
      >
        <Text style={[styles.triBtnText, value === true && styles.triBtnTextActive]}>כן</Text>
      </Tappable>
      <Tappable
        style={[styles.triBtn, value === false && styles.triBtnActive]}
        onPress={() => onChange(false)}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === false }}
        accessibilityLabel="לא"
      >
        <Text style={[styles.triBtnText, value === false && styles.triBtnTextActive]}>לא</Text>
      </Tappable>
      <Tappable
        style={[styles.triBtnWide, value === null && styles.triBtnActive]}
        onPress={() => onChange(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === null }}
        accessibilityLabel="אין העדפה"
      >
        <Text style={[styles.triBtnText, value === null && styles.triBtnTextActive]}>אין העדפה</Text>
      </Tappable>
    </View>
  );

  const renderRatingWithNone = (value, onChange) => (
    <View>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Tappable
            key={n}
            style={[styles.ratingDot, value === n && styles.ratingDotActive]}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === n }}
            accessibilityLabel={`דרגה ${n} מתוך 5`}
          >
            <Text style={[styles.ratingNum, value === n && styles.ratingNumActive]}>{n}</Text>
          </Tappable>
        ))}
      </View>
      <Tappable
        style={[styles.noPrefBtn, value === null && styles.noPrefBtnActive]}
        onPress={() => onChange(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === null }}
        accessibilityLabel="אין העדפה"
      >
        <Text style={[styles.noPrefText, value === null && styles.noPrefTextActive]}>
          אין העדפה
        </Text>
      </Tappable>
    </View>
  );

  const renderLifestyleCard = (Icon, label, content) => (
    <View style={styles.lifestyleCard}>
      <View style={styles.lifestyleCardHeader}>
        <Icon size={20} color={COLORS.brand} strokeWidth={2} />
        <Text style={styles.lifestyleCardLabel}>{label}</Text>
      </View>
      {content}
    </View>
  );

  const renderLifestyle = () => (
    <View style={styles.fieldsWrapper}>
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

  // ── שאלת דירוג חשיבות — בחירה מסודרת של עד MAX_PRIORITIES גורמים ──
  const renderPriorities = () => {
    const atMax = data.priorities.length >= MAX_PRIORITIES;
    return (
      <View style={styles.fieldsWrapper}>
        {PRIORITY_FACTORS.map((f) => {
          const order = data.priorities.indexOf(f.key); // -1 אם לא נבחר
          const selected = order >= 0;
          const blocked = !selected && atMax; // הגענו למקסימום ולא נבחר
          return (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.priorityRow,
                selected && styles.priorityRowSelected,
                pressed && !selected && !blocked && styles.pressedBtn,
                blocked && styles.priorityRowBlocked,
              ]}
              onPress={() => togglePriority(f.key)}
              disabled={blocked}
            >
              <View
                style={[
                  styles.priorityBadge,
                  selected && styles.priorityBadgeSelected,
                ]}
              >
                {selected && (
                  <Text style={styles.priorityBadgeText}>{order + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.priorityLabel,
                  selected && styles.priorityLabelSelected,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderQuestionContent = () => {
    switch (currentQ.type) {
      case "intro":
        return renderIntro();
      case "priorities":
        return renderPriorities();
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

  return (
    <>
      <CompletionOverlay visible={done} />
      <QuizShell
        showProgress={!isIntro}
        step={currentStepIndex + 1}
        total={realQuestions.length}
        onBack={isIntro ? () => router.back() : step > 0 ? handleBack : undefined}
        title={isIntro ? undefined : currentQ.title}
        subtitle={isIntro ? undefined : currentQ.subtitle}
        fade={fadeAnim}
        slide={slideAnim}
        hint={validationHint}
        error={submitError}
        ctaLabel={
          isIntro ? "בואו נתחיל" : isLastStep ? "מוכנים למצוא התאמות" : "המשך"
        }
        onNext={handleNext}
        loading={submitting}
        disabled={!answered || submitting}
      >
        {renderQuestionContent()}
      </QuizShell>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// צל אחיד ועדין מהטוקנים (זהה ל-Quiz).
const SHADOW = SHADOWS.sm;

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
    ...SHADOW,
    shadowOpacity: 0.12,
  },
  introTitle: {
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: 0.2,
    marginTop: 4,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 23,
  },

  // ── Interest / choice chips (זהה ל-Quiz) ──
  chipsWrap: {
    width: "100%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: SPACING.sm + 2,
    paddingTop: SPACING.xs,
  },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  chipSelected: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text },
  chipTextSelected: { color: COLORS.onBrand, fontFamily: FONTS.bold },

  // ── Standard input ──
  fieldsWrapper: {
    width: "100%",
  },
  input: {
    backgroundColor: COLORS.surface,
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  hintText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
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
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  dateInputCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    width: "100%",
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  dateTextInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: COLORS.text,
  },
  // צבע אפור כשעוד לא נבחר תאריך — אפקט "placeholder"
  dateTextPlaceholder: {
    color: COLORS.textMuted,
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
    color: COLORS.brand,
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
    borderColor: COLORS.textMuted,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    flexShrink: 1,
    textAlign: "right",
  },

  // ── Recommendation card ──
  recCard: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: SPACING.md,
    width: "100%",
    flexDirection: "column",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  recCardError: {
    backgroundColor: COLORS.dangerLight,
    borderColor: COLORS.dangerBorder,
  },
  recTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
  },
  recMonthsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  recMonthBadge: {
    backgroundColor: COLORS.brand,
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
    color: COLORS.surface,
  },
  recLoadingText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.brand,
    textAlign: "right",
    marginTop: 6,
  },
  recReason: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 4,
  },
  recErrorText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.danger,
    textAlign: "right",
  },

  // ── מיכל טעינה/שגיאה + פידבק-לחיצה לשורות (בשימוש) ──
  optionsContainer: { width: "100%", alignItems: "center" },
  pressedBtn: { backgroundColor: COLORS.background },

  // ── Age range slider ──
  ageHint: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.brand,
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  ageNumberText: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.surface,
    letterSpacing: 0.5,
  },
  // קו מקשר עדין בין שני ה-pills
  ageRangeDash: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.brand,
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
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.brand,
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
    color: COLORS.textMuted,
  },

  // ── Lifestyle section (5 partner preferences) ──
  lifestyleCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
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
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  lifestyleHelp: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
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
    minHeight: 44,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundSunk,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    alignItems: "center",
  },
  triBtnWide: {
    flex: 1.4,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundSunk,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    alignItems: "center",
  },
  triBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  triBtnText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  triBtnTextActive: {
    color: COLORS.onBrand,
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
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundSunk,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDotActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  ratingNum: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  ratingNumActive: {
    color: COLORS.onBrand,
  },
  noPrefBtn: {
    alignSelf: "center",
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.backgroundSunk,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  noPrefBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  noPrefText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  noPrefTextActive: {
    color: COLORS.onBrand,
    fontFamily: FONTS.bold,
  },

  // ── Priorities (דירוג חשיבות) ──
  priorityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  priorityRowSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  priorityRowBlocked: {
    opacity: 0.45,
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.backgroundSunk,
    justifyContent: "center",
    alignItems: "center",
  },
  priorityBadgeSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  priorityBadgeText: {
    color: COLORS.surface,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  priorityLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },
  priorityLabelSelected: {
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  // ── Submit error ──
  submitErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 24,
  },

});

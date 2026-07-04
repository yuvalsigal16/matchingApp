import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { getUser } from "../src/auth/authStore";
import {
  addRecommendation,
  getAllRecommendations,
  getRecommendationsByDestination,
  uploadRecommendationImage,
} from "../src/api/recommendationService";
import { BASE_URL } from "../src/api/config";
import { getUserInterests } from "../src/api/interestService";
import { getAllUsers } from "../src/api/userService";
import { getUserTrips } from "../src/api/tripService";
import { COLORS, FONTS } from "../src/theme";
import BottomNav from "../../components/BottomNav";

// קטגוריות קבועות לבחירה ולסינון.
const CATEGORIES = ["אוכל", "לינה", "אטרקציות", "בילוי", "קניות", "כללי"];

// מצב סינון ריק (ברירת מחדל).
const DEFAULT_FILTERS = {
  category: "all",
  destination: "all",
  minRating: 0,
  imagesOnly: false,
  interestsOnly: false,
};

// אפשרויות מיון.
const SORT_OPTIONS = [
  { key: "newest", label: "החדשות ביותר", icon: "time-outline" },
  { key: "highest", label: "דירוג גבוה לנמוך", icon: "star" },
  { key: "lowest", label: "דירוג נמוך לגבוה", icon: "star-outline" },
  { key: "personalized", label: "מותאם עבורי", icon: "sparkles" },
];

// ממיר נתיב תמונה יחסי (/images/xxx) ל-URL מלא. תמונות שמועלות נשמרות כנתיב יחסי.
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

const hasImage = (r) => !!buildImageUri(r.mediaUrl);

// בדיקת "מילה שלמה" (במקום substring) — מונע false positives כמו "בר" בתוך "בריכה".
// מנקה פיסוק, מאחד רווחים, ומרפד ברווחים כדי להשוות מילה/צירוף שלם.
// עובד גם למילות מפתח מרובות-מילים ("שוק אוכל", "חיי לילה"). לא משתמש ב-\b (לא אמין בעברית).
function containsWholeWord(text, keyword) {
  const clean = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[.,!?():;"'،/\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const k = clean(keyword);
  if (!k) return false;
  return ` ${clean(text)} `.includes(` ${k} `);
}

// מיפוי תחום עניין → קטגוריות תואמות + מילות מפתח (הכל בעברית, תואם ל-seed ולקטגוריות).
// מאפשר התאמה חכמה: קטגוריה קודם, ואז מילות מפתח, ואז שם תחום העניין עצמו.
const INTEREST_MAP = {
  "קולינריה": { categories: ["אוכל"], keywords: ["מסעדה", "אוכל", "קפה", "פיצה", "סושי", "שוק אוכל"] },
  "שופינג": { categories: ["קניות"], keywords: ["קניון", "חנות", "שוק", "אאוטלט"] },
  "מסיבות": { categories: ["בילוי"], keywords: ["מסיבה", "מועדון", "בר", "פאב", "חיי לילה"] },
  "טבע": { categories: ["אטרקציות"], keywords: ["טבע", "פארק", "יער", "הר", "מפל", "שמורה", "חוף"] },
  "תרבות": { categories: ["אטרקציות"], keywords: ["מוזיאון", "גלריה", "אמנות", "היסטוריה", "תיאטרון"] },
  "מוזיקה": { categories: ["בילוי"], keywords: ["מוזיקה", "הופעה", "קונצרט", "פסטיבל"] },
  "בטן גב": { categories: ["לינה"], keywords: ["חוף", "בריכה", "ספא", "מלון", "נופש"] },
  "אקסטרים": { categories: ["אטרקציות"], keywords: ["צלילה", "טרק", "גלישה", "סנפלינג", "אתגר"] },
};

// מתייג כל המלצה כ"מותאם עבורך" לפי תחומי העניין (פעם אחת, לשימוש בכל הסינונים/המיונים).
// סדר: 1) התאמת קטגוריה  2) מילות מפתח בטקסט  3) שם תחום העניין בטקסט (לוגיקה קיימת).
function tagPersonalized(list, interests) {
  if (!interests.length) return list.map((r) => ({ ...r, personalized: false }));
  return list.map((r) => {
    const cat = (r.category || "").toLowerCase().trim();
    const hay = `${r.placeName || ""} ${r.description || ""}`.toLowerCase();

    const personalized = interests.some((interest) => {
      const map = INTEREST_MAP[interest];
      if (map) {
        // שלב 1: התאמת קטגוריה של ההמלצה לקטגוריות של תחום העניין
        if (cat && map.categories.some((c) => c.toLowerCase() === cat)) return true;
        // שלב 2: מילת מפתח של תחום העניין מופיעה בטקסט כמילה שלמה (שם/תיאור)
        if (map.keywords.some((kw) => containsWholeWord(hay, kw))) return true;
      }
      // שלב 3: לוגיקה קיימת — שם תחום העניין עצמו מופיע כמילה שלמה בטקסט
      return containsWholeWord(hay, interest);
    });

    return { ...r, personalized };
  });
}

// האם המלצה עומדת בכל הסינונים + החיפוש.
function matchesFilters(r, f, q) {
  if (f.category !== "all" && r.category !== f.category) return false;
  if (f.destination !== "all" && r.tripName !== f.destination) return false;
  if (f.minRating > 0 && (r.rating || 0) < f.minRating) return false;
  if (f.imagesOnly && !hasImage(r)) return false;
  if (f.interestsOnly && !r.personalized) return false;
  if (q) {
    const hay = `${r.placeName || ""} ${r.tripName || ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sortRecs(list, sortBy) {
  const arr = [...list];
  if (sortBy === "highest") arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sortBy === "lowest") arr.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  else if (sortBy === "personalized")
    arr.sort((a, b) => (b.personalized ? 1 : 0) - (a.personalized ? 1 : 0));
  else arr.sort((a, b) => (b.recommendationID || 0) - (a.recommendationID || 0)); // newest
  return arr;
}

// שורת כוכבים אחידה (אייקונים) — לתצוגה בלבד, תואמת לכוכבים שבטופס היצירה.
function Stars({ value = 0, size = 15 }) {
  const v = Math.max(0, Math.min(5, value || 0));
  return (
    <View style={styles.starsRowInline}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= v ? "star" : "star-outline"}
          size={size}
          color={COLORS.amber}
        />
      ))}
    </View>
  );
}

// תמונת המלצה — מציגה רק קישור http תקין, ומסתירה את עצמה אם הטעינה נכשלת (fallback נקי).
function RecImage({ uri, onPress }) {
  const [failed, setFailed] = useState(false);
  const full = buildImageUri(uri);
  if (!full || failed) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel="הגדלת תמונה"
    >
      <Image
        source={{ uri: full }}
        style={styles.cardImage}
        onError={() => setFailed(true)}
      />
    </Pressable>
  );
}

export default function RecommendationsScreen() {
  const router = useRouter();
  // כשמגיעים מההאב של הטיול — מקבלים tripId ומצמצמים לטיול הזה בלבד.
  // בלי הפרמטר (מ"גילוי") — פיד גלובלי של כל הטיולים שלי.
  const { tripId, tripName } = useLocalSearchParams();
  const isTripScoped = !!tripId;

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false); // כשל בטעינה — להבדיל מ"ריק"
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [zoomUri, setZoomUri] = useState(null); // תמונה פתוחה במסך מלא (לייטבוקס)

  // סינון (צד לקוח בלבד — על הנתונים שכבר נטענו)
  const [query, setQuery] = useState(""); // חיפוש חופשי בשם מקום/טיול
  const [filters, setFilters] = useState(DEFAULT_FILTERS); // הסינונים שהוחלו
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS); // עריכה בתוך הגיליון עד "החל"
  const [sortBy, setSortBy] = useState("newest");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  // התאמה בסיסית למשתמש — תחומי העניין שלו (לצורך הדגשת "מותאם עבורך")
  const [myInterests, setMyInterests] = useState([]); // מחרוזות lowercase

  // מפת userID → שם מלא, להצגת מי פרסם כל המלצה (השרת מחזיר רק userID).
  const [nameMap, setNameMap] = useState({});

  // טופס יצירת המלצה
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(""); // קטגוריה נבחרת בטופס
  const [pickedImageUri, setPickedImageUri] = useState(""); // תמונה מקומית לפני העלאה
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  // טעינה חד-פעמית של תחומי העניין של המשתמש (לשימוש בהתאמה הבסיסית).
  useEffect(() => {
    const uid = getUser()?.userID;
    if (!uid) return;
    getUserInterests(uid)
      .then((list) =>
        setMyInterests(
          (list || [])
            .map((i) => String(i?.interestName || "").toLowerCase().trim())
            .filter(Boolean),
        ),
      )
      .catch(() => {});
  }, []);

  // טעינה חד-פעמית של שמות המשתמשים (קריאה אחת) → מפת userID→שם מלא.
  // getAllUsers מסנן את עצמי, ולכן מוסיפים ידנית את שם המשתמש המחובר.
  useEffect(() => {
    const me = getUser();
    if (!me?.userID) return;
    const base = {};
    const myName = [me.firstName, me.lastName].filter(Boolean).join(" ").trim();
    if (myName) base[me.userID] = myName;
    getAllUsers(me.userID)
      .then((list) => {
        (list || []).forEach((u) => {
          const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
          if (full) base[u.userID] = full;
        });
        setNameMap({ ...base });
      })
      .catch(() => setNameMap({ ...base }));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations(true);
    setRefreshing(false);
  };

  const loadRecommendations = async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(false); // ניסיון טעינה חדש — מאפסים שגיאה קודמת
    try {
      // מצב טיול → כל ההמלצות על היעד הזה מכל המשתמשים; אחרת → פיד גלובלי מלא.
      const recs = isTripScoped
        ? await getRecommendationsByDestination(tripName || "")
        : await getAllRecommendations();
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch (err) {
      console.error("loadRecommendations:", err);
      setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // שמות הטיולים הקיימים ברשימה — לבניית צ'יפים לסינון (מחושב פעם אחת לכל שינוי).
  const tripNames = useMemo(() => {
    const set = new Set();
    recommendations.forEach((r) => {
      if (r.tripName) set.add(r.tripName);
    });
    return [...set];
  }, [recommendations]);

  // הקטגוריות שקיימות בפועל ברשימה — לצ'יפים של סינון קטגוריה.
  const categoriesInData = useMemo(() => {
    const set = new Set();
    recommendations.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return [...set];
  }, [recommendations]);

  // תיוג "מותאם עבורך" פעם אחת — משמש לסינון, למיון ולתצוגה.
  const taggedRecommendations = useMemo(
    () => tagPersonalized(recommendations, myInterests),
    [recommendations, myInterests],
  );

  // הרשימה המוצגת: סינון (חיפוש + מסננים) → מיון. useMemo מונע חישוב חוזר.
  const visibleRecommendations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = taggedRecommendations.filter((r) => matchesFilters(r, filters, q));
    return sortRecs(filtered, sortBy);
  }, [taggedRecommendations, filters, query, sortBy]);

  // ספירה חיה לפי הטיוטה בגיליון הסינון — לכפתור "הצג X תוצאות".
  const draftCount = useMemo(() => {
    const q = query.trim().toLowerCase();
    return taggedRecommendations.filter((r) => matchesFilters(r, draftFilters, q)).length;
  }, [taggedRecommendations, draftFilters, query]);

  // צ'יפים של מסננים פעילים (להסרה מהירה).
  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.category !== "all") chips.push({ key: "category", label: filters.category });
    if (filters.destination !== "all") chips.push({ key: "destination", label: filters.destination });
    if (filters.minRating > 0) chips.push({ key: "minRating", label: `${filters.minRating}+ כוכבים` });
    if (filters.imagesOnly) chips.push({ key: "imagesOnly", label: "עם תמונה" });
    if (filters.interestsOnly) chips.push({ key: "interestsOnly", label: "מתאים לי" });
    return chips;
  }, [filters]);

  const openFilterSheet = () => {
    setDraftFilters(filters);
    setFilterSheetVisible(true);
  };
  const applyDraftFilters = () => {
    setFilters(draftFilters);
    setFilterSheetVisible(false);
  };
  const removeFilter = (key) => {
    setFilters((prev) => ({
      ...prev,
      [key]:
        key === "minRating" ? 0 : key === "imagesOnly" || key === "interestsOnly" ? false : "all",
    }));
  };
  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.key === sortBy)?.label || "מיון";

  const openModal = async () => {
    if (isTripScoped) {
      // במצב טיול — נעולים על הטיול הנוכחי, אין צורך לבחור.
      setSelectedTripId(Number(tripId));
    } else {
      try {
        const userId = getUser()?.userID;
        const userTrips = await getUserTrips(userId);
        setTrips(userTrips || []);
        setSelectedTripId(null); // ברירת מחדל: "ללא טיול" — לא מצרפים לטיול אלא אם בוחרים
      } catch {
        setTrips([]);
      }
    }
    setPlaceName("");
    setDescription("");
    setCategory("");
    setPickedImageUri("");
    setRating(0);
    setModalVisible(true);
  };

  // בחירת תמונה מהגלריה או מהמצלמה (כמו תמונת פרופיל).
  const pickImage = (fromCamera) => {
    const run = async () => {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("אין הרשאה", "יש לאשר גישה לתמונות/מצלמה כדי להוסיף תמונה.");
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPickedImageUri(result.assets[0].uri);
      }
    };
    run();
  };

  const chooseImage = () => {
    Alert.alert("הוספת תמונה", "מאיפה להוסיף?", [
      { text: "גלריה", onPress: () => pickImage(false) },
      { text: "מצלמה", onPress: () => pickImage(true) },
      { text: "ביטול", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    if (!placeName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם מקום");
      return;
    }
    // טיול הוא אופציונלי — אפשר המלצה כללית ללא טיול (selectedTripId = null)

    setSubmitting(true);
    try {
      const userId = getUser()?.userID;

      // אם נבחרה תמונה — מעלים אותה קודם ומקבלים נתיב לשמירה ב-MediaUrl.
      let mediaPath = null;
      if (pickedImageUri) {
        mediaPath = await uploadRecommendationImage(pickedImageUri);
      }

      await addRecommendation({
        userID: userId,
        tripID: selectedTripId,
        placeName: placeName.trim(),
        description: description.trim() || null,
        mediaUrl: mediaPath,
        category: category || null,
        rating: rating || null,
        isAnonymous: false,
      });
      setModalVisible(false);
      await loadRecommendations();
      // משוב ברור שההמלצה נשמרה — קודם המשתמשת לא ידעה אם זה עבד.
      if (Platform.OS === "web") window.alert("ההמלצה נוספה בהצלחה");
      else Alert.alert("נוסף בהצלחה", "ההמלצה שלך נוספה ומופיעה ברשימה");
    } catch (err) {
      Alert.alert("שגיאה", err.message || "לא ניתן להוסיף המלצה");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
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
        <View style={styles.headerCenter}>
          <Text style={styles.header} numberOfLines={1}>
            {isTripScoped ? tripName || "המלצות ליעד" : "כל ההמלצות"}
          </Text>
          <Text style={styles.headerSub}>
            {isTripScoped ? "מה שכולם ממליצים על היעד" : "גלו מקומות מטיולים שונים"}
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {/* ── סרגל סינון (צד לקוח בלבד) — מוצג רק כשיש המלצות ── */}
      {recommendations.length > 0 && (
        <View style={styles.filterBar}>
          {/* חיפוש חופשי */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="חיפוש שם מקום או יעד"
                placeholderTextColor={COLORS.textMuted}
                value={query}
                onChangeText={setQuery}
                textAlign="right"
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* כפתורי סינון + מיון */}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={openFilterSheet} activeOpacity={0.85}>
              <Ionicons name="options-outline" size={18} color={COLORS.brand} />
              <Text style={styles.controlText}>סינון</Text>
              {activeChips.length > 0 ? (
                <View style={styles.controlBadge}>
                  <Text style={styles.controlBadgeText}>{activeChips.length}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setSortSheetVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="swap-vertical-outline" size={18} color={COLORS.brand} />
              <Text style={styles.controlText} numberOfLines={1}>
                {currentSortLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* צ'יפים של מסננים פעילים — להסרה מהירה */}
          {activeChips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activeChipsRow}
            >
              {activeChips.map((c) => (
                <Pressable key={c.key} style={styles.activeChip} onPress={() => removeFilter(c.key)}>
                  <Text style={styles.activeChipText}>{c.label}</Text>
                  <Ionicons name="close" size={13} color={COLORS.brand} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* מספר תוצאות */}
          <Text style={styles.resultCount}>{visibleRecommendations.length} המלצות</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
      >
        {loadError && recommendations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>לא ניתן לטעון המלצות כרגע</Text>
            <Text style={styles.emptyText}>בדקו את החיבור ונסו שוב</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadRecommendations()}
              accessibilityRole="button"
              accessibilityLabel="ניסיון טעינה מחדש"
            >
              <Ionicons name="refresh" size={16} color={COLORS.onBrand} />
              <Text style={styles.retryBtnText}>נסו שוב</Text>
            </TouchableOpacity>
          </View>
        ) : recommendations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="star-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>
              {isTripScoped ? "עדיין אין המלצות על היעד הזה" : "עדיין אין המלצות"}
            </Text>
            <Text style={styles.emptyText}>
              שתפו מקום שאהבתם — לחצו על ה־＋ למטה כדי להוסיף את ההמלצה הראשונה
            </Text>
          </View>
        ) : visibleRecommendations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>אין תוצאות מתאימות</Text>
            <Text style={styles.emptyText}>נסו לשנות את החיפוש או הסינון</Text>
          </View>
        ) : (
          visibleRecommendations.map((rec) => {
            const author = rec.isAnonymous
              ? "אנונימי"
              : nameMap[rec.userID] || "";
            return (
              <View key={rec.recommendationID} style={styles.card}>
                <RecImage uri={rec.mediaUrl} onPress={() => setZoomUri(rec.mediaUrl)} />
                <View style={styles.cardBody}>
                  <View style={styles.iconBox}>
                    <Ionicons name="location-outline" size={22} color={COLORS.brand} />
                  </View>
                  <View style={styles.cardText}>
                    {rec.personalized ? (
                      <View style={styles.personalBadge}>
                        <Ionicons name="sparkles" size={11} color={COLORS.brand} />
                        <Text style={styles.personalBadgeText}>מותאם עבורך</Text>
                      </View>
                    ) : null}
                    <Text style={styles.title}>{rec.placeName}</Text>
                    {rec.category ? (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{rec.category}</Text>
                      </View>
                    ) : null}
                    {author ? (
                      <Text style={styles.author}>מאת: {author}</Text>
                    ) : null}
                    {!isTripScoped && rec.tripName && (
                      <Text style={styles.tripName}>בטיול: {rec.tripName}</Text>
                    )}
                    {rec.description ? (
                      <Text style={styles.subtitle} numberOfLines={2}>
                        {rec.description}
                      </Text>
                    ) : null}
                    <Stars value={rec.rating} />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── גיליון סינון (Bottom Sheet) ── */}
      <Modal
        visible={filterSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>סינון</Text>
              <Pressable onPress={() => setFilterSheetVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
              {/* קטגוריה */}
              {categoriesInData.length > 0 && (
                <>
                  <Text style={styles.sheetLabel}>קטגוריה</Text>
                  <View style={styles.chipWrap}>
                    {["all", ...categoriesInData].map((c) => (
                      <Pressable
                        key={c}
                        style={[styles.filterChip, draftFilters.category === c && styles.filterChipActive]}
                        onPress={() => setDraftFilters((p) => ({ ...p, category: c }))}
                      >
                        <Text style={[styles.filterChipText, draftFilters.category === c && styles.filterChipTextActive]}>
                          {c === "all" ? "הכל" : c}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* יעד — רק בפיד הגלובלי */}
              {!isTripScoped && tripNames.length > 0 && (
                <>
                  <Text style={styles.sheetLabel}>יעד</Text>
                  <View style={styles.chipWrap}>
                    {["all", ...tripNames].map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.filterChip, draftFilters.destination === t && styles.filterChipActive]}
                        onPress={() => setDraftFilters((p) => ({ ...p, destination: t }))}
                      >
                        <Text style={[styles.filterChipText, draftFilters.destination === t && styles.filterChipTextActive]}>
                          {t === "all" ? "הכל" : t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* דירוג מינימלי */}
              <Text style={styles.sheetLabel}>דירוג מינימלי</Text>
              <View style={styles.minRatingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setDraftFilters((p) => ({ ...p, minRating: p.minRating === s ? 0 : s }))}
                  >
                    <Ionicons
                      name={draftFilters.minRating >= s ? "star" : "star-outline"}
                      size={30}
                      color={COLORS.amber}
                    />
                  </Pressable>
                ))}
                {draftFilters.minRating > 0 ? (
                  <Text style={styles.minRatingHint}>{draftFilters.minRating}+ כוכבים</Text>
                ) : null}
              </View>

              {/* טוגלים */}
              <Pressable
                style={styles.toggleRow}
                onPress={() => setDraftFilters((p) => ({ ...p, imagesOnly: !p.imagesOnly }))}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.brand} />
                <Text style={styles.toggleLabel}>עם תמונה בלבד</Text>
                <View style={[styles.toggleBox, draftFilters.imagesOnly && styles.toggleBoxOn]}>
                  {draftFilters.imagesOnly ? <Ionicons name="checkmark" size={15} color={COLORS.onBrand} /> : null}
                </View>
              </Pressable>

              <Pressable
                style={styles.toggleRow}
                onPress={() => setDraftFilters((p) => ({ ...p, interestsOnly: !p.interestsOnly }))}
              >
                <Ionicons name="sparkles-outline" size={20} color={COLORS.brand} />
                <Text style={styles.toggleLabel}>מתאים לתחומי העניין שלי</Text>
                <View style={[styles.toggleBox, draftFilters.interestsOnly && styles.toggleBoxOn]}>
                  {draftFilters.interestsOnly ? <Ionicons name="checkmark" size={15} color={COLORS.onBrand} /> : null}
                </View>
              </Pressable>
            </ScrollView>

            {/* פוטר: ניקוי + החלה */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => setDraftFilters(DEFAULT_FILTERS)}>
                <Text style={styles.clearBtnText}>נקה הכל</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyDraftFilters} activeOpacity={0.85}>
                <Text style={styles.applyBtnText}>הצג {draftCount} תוצאות</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── גיליון מיון ── */}
      <Modal
        visible={sortSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { marginBottom: 8 }]}>מיון לפי</Text>
            {SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.key}
                style={styles.sortRow}
                onPress={() => {
                  setSortBy(o.key);
                  setSortSheetVisible(false);
                }}
              >
                <Ionicons name={o.icon} size={20} color={sortBy === o.key ? COLORS.brand : COLORS.textSecondary} />
                <Text style={[styles.sortRowText, sortBy === o.key && styles.sortRowTextActive]}>
                  {o.label}
                </Text>
                {sortBy === o.key ? (
                  <Ionicons name="checkmark" size={20} color={COLORS.brand} />
                ) : (
                  <View style={{ width: 20 }} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* כפתור פלוס */}
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={COLORS.onBrand} />
      </TouchableOpacity>

      {/* Modal יצירת המלצה */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            {/* כותרת */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>המלצה חדשה</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.brand} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* בחירת טיול — נעול לטיול הנוכחי במצב טיול; אחרת אפשר לבחור טיול או "ללא טיול" */}
              <Text style={styles.label}>שייכות לטיול (אופציונלי)</Text>
              {isTripScoped ? (
                <View style={styles.lockedTrip}>
                  <Ionicons name="airplane" size={14} color={COLORS.brand} />
                  <Text style={styles.lockedTripText}>{tripName || "הטיול הנוכחי"}</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripPicker}>
                  {/* אפשרות "ללא טיול" — המלצה כללית */}
                  <Pressable
                    style={[styles.tripChip, selectedTripId === null && styles.tripChipActive]}
                    onPress={() => setSelectedTripId(null)}
                  >
                    <Text style={[styles.tripChipText, selectedTripId === null && styles.tripChipTextActive]}>
                      ללא טיול
                    </Text>
                  </Pressable>
                  {trips.map((t) => (
                    <Pressable
                      key={t.tripID}
                      style={[styles.tripChip, selectedTripId === t.tripID && styles.tripChipActive]}
                      onPress={() => setSelectedTripId(t.tripID)}
                    >
                      <Text style={[styles.tripChipText, selectedTripId === t.tripID && styles.tripChipTextActive]}>
                        {t.destination}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* שם המקום */}
              <Text style={styles.label}>שם המקום *</Text>
              <TextInput
                style={styles.input}
                placeholder="למשל: מסעדת פייר בפריז"
                placeholderTextColor={COLORS.textMuted}
                value={placeName}
                onChangeText={setPlaceName}
                textAlign="right"
              />

              {/* תיאור */}
              <Text style={styles.label}>תיאור (אופציונלי)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="למה כדאי ללכת..."
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlign="right"
                textAlignVertical="top"
              />

              {/* קטגוריה */}
              <Text style={styles.label}>קטגוריה</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripPicker}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.tripChip, category === c && styles.tripChipActive]}
                    onPress={() => setCategory(category === c ? "" : c)}
                  >
                    <Text style={[styles.tripChipText, category === c && styles.tripChipTextActive]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* תמונה (גלריה / מצלמה) */}
              <Text style={styles.label}>תמונה (אופציונלי)</Text>
              {pickedImageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: pickedImageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.imageRemoveBtn}
                    onPress={() => setPickedImageUri("")}
                    accessibilityRole="button"
                    accessibilityLabel="הסרת תמונה"
                  >
                    <Ionicons name="close" size={18} color={COLORS.onBrand} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickBtn} onPress={chooseImage} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={20} color={COLORS.brand} />
                  <Text style={styles.imagePickText}>הוספת תמונה</Text>
                </TouchableOpacity>
              )}

              {/* דירוג */}
              <Text style={styles.label}>דירוג</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => setRating(s)}>
                    <Ionicons
                      name={s <= rating ? "star" : "star-outline"}
                      size={32}
                      color={COLORS.amber}
                    />
                  </Pressable>
                ))}
              </View>

              {/* כפתור שמירה */}
              <Pressable
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.onBrand} />
                ) : (
                  <Text style={styles.submitBtnText}>הוסיפי המלצה</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* תצוגת תמונה במסך מלא — לחיצה על התמונה בכרטיס פותחת אותה כאן */}
      <Modal
        visible={!!zoomUri}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomUri(null)}
      >
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomUri(null)}>
          <TouchableOpacity
            style={styles.zoomClose}
            onPress={() => setZoomUri(null)}
            accessibilityRole="button"
            accessibilityLabel="סגירה"
          >
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          {zoomUri ? (
            <Image
              source={{ uri: buildImageUri(zoomUri) }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>

      {!isTripScoped && <BottomNav active="discovery" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  header: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.brand },
  headerSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  content: { paddingHorizontal: 20, paddingBottom: 120 },

  card: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBody: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },

  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomImage: {
    width: "100%",
    height: "80%",
  },
  zoomClose: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  personalBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  personalBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  // ── סרגל סינון ──
  filterBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  searchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  controlsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 8,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  controlText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.brand },
  controlBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  controlBadgeText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.onBrand },

  activeChipsRow: { marginTop: 8 },
  activeChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  activeChipText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.brand },
  resultCount: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 8,
  },

  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center", alignItems: "center",
  },
  cardText: { flex: 1, marginHorizontal: 12, alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.brand },
  categoryBadge: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.coralLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  categoryBadgeText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.coral },
  author: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  tripName: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.primary, marginTop: 2 },
  subtitle: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4, textAlign: "right" },
  starsRowInline: { flexDirection: "row-reverse", gap: 2, marginTop: 6, alignSelf: "flex-end" },

  emptyBox: { marginTop: 80, alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { marginTop: 12, fontSize: 17, color: COLORS.brand, fontFamily: FONTS.bold },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: COLORS.onBrand,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  fab: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: COLORS.brand,
    width: 60, height: 60, borderRadius: 30,
    justifyContent: "center", alignItems: "center",
    elevation: 5,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.brand },

  label: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 8,
    marginTop: 14,
  },
  noTrips: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: "right" },

  lockedTrip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  lockedTripText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.brand },

  tripPicker: { marginBottom: 4 },
  tripChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tripChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tripChipText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  tripChipTextActive: { color: COLORS.onBrand },

  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMulti: { height: 80 },

  imagePickBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
  },
  imagePickText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.brand },
  imagePreviewWrap: { position: "relative" },
  imagePreview: { width: "100%", height: 160, borderRadius: 12, backgroundColor: COLORS.background },
  imageRemoveBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  starsRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 4,
  },

  submitBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.onBrand, fontSize: 16, fontFamily: FONTS.bold },

  // ── Bottom sheets (סינון / מיון) ──
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "82%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.brand, textAlign: "right" },
  sheetBody: { maxHeight: 420 },
  sheetLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
    marginTop: 16,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterChipText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.onBrand, fontFamily: FONTS.bold },
  minRatingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  minRatingHint: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.textSecondary, marginRight: 8 },
  toggleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  toggleLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text, textAlign: "right" },
  toggleBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleBoxOn: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  sheetFooter: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 16,
  },
  clearBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.textSecondary },
  applyBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.onBrand },
  sortRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  sortRowText: { flex: 1, fontSize: 15, fontFamily: FONTS.regular, color: COLORS.text, textAlign: "right" },
  sortRowTextActive: { fontFamily: FONTS.bold, color: COLORS.brand },
});

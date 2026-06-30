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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { addRecommendation, getRecommendationsByTrip } from "../src/api/recommendationService";
import { getUserInterests } from "../src/api/interestService";
import { getAllUsers } from "../src/api/userService";
import { getUserTrips } from "../src/api/tripService";
import { COLORS, FONTS } from "../src/theme";
import BottomNav from "../../components/BottomNav";

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
function RecImage({ uri }) {
  const [failed, setFailed] = useState(false);
  const clean = (uri || "").trim();
  const ok = /^https?:\/\//i.test(clean) && !failed;
  if (!ok) return null;
  return (
    <Image
      source={{ uri: clean }}
      style={styles.cardImage}
      onError={() => setFailed(true)}
    />
  );
}

export default function RecommendationsScreen() {
  const router = useRouter();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false); // כשל בטעינה — להבדיל מ"ריק"
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // סינון (צד לקוח בלבד — על הנתונים שכבר נטענו)
  const [query, setQuery] = useState(""); // חיפוש חופשי בשם מקום/טיול
  const [tripFilter, setTripFilter] = useState("all"); // סינון לפי שם טיול
  const [sortByRating, setSortByRating] = useState(false); // מיון לפי דירוג גבוה→נמוך

  // התאמה בסיסית למשתמש — תחומי העניין שלו (לצורך הדגשת "מותאם עבורך")
  const [myInterests, setMyInterests] = useState([]); // מחרוזות lowercase

  // מפת userID → שם מלא, להצגת מי פרסם כל המלצה (השרת מחזיר רק userID).
  const [nameMap, setNameMap] = useState({});

  // טופס יצירת המלצה
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState(""); // קישור תמונה אופציונלי
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
      const userId = getUser()?.userID;
      const token = getToken();
      if (!userId || !token) {
        setLoadError(true);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // ה-route בשרת הוא /Trip/user (יחיד). שימוש ב-/Trips גרם ל-404 וההמלצות לא נטענו.
      const tripsRes = await fetch(`${BASE_URL}/Trip/user/${userId}`, { headers });
      if (!tripsRes.ok) {
        setLoadError(true);
        return;
      }
      const userTrips = await tripsRes.json();

      const allRecs = await Promise.all(
        userTrips.map(async (trip) => {
          const recs = await getRecommendationsByTrip(trip.tripID).catch(() => []);
          return recs.map((r) => ({ ...r, tripName: trip.destination }));
        })
      );

      setRecommendations(allRecs.flat());
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

  // הרשימה המוצגת: סינון (טקסט + טיול) → תיוג "מותאם עבורך" → מיון.
  // useMemo מונע חישוב חוזר של filter/sort בכל render.
  const visibleRecommendations = useMemo(() => {
    const q = query.trim().toLowerCase();

    const tagged = recommendations
      .filter((r) => {
        const okTrip = tripFilter === "all" || r.tripName === tripFilter;
        const okQuery =
          !q ||
          (r.placeName || "").toLowerCase().includes(q) ||
          (r.tripName || "").toLowerCase().includes(q);
        return okTrip && okQuery;
      })
      .map((r) => {
        // מותאם עבורך: שם המקום/התיאור מכיל אחד מתחומי העניין של המשתמש.
        const hay = `${r.placeName || ""} ${r.description || ""}`.toLowerCase();
        const personalized =
          myInterests.length > 0 && myInterests.some((w) => hay.includes(w));
        return { ...r, personalized };
      });

    tagged.sort((a, b) => {
      if (sortByRating) return (b.rating || 0) - (a.rating || 0);
      // ברירת מחדל: המלצות "מותאם עבורך" קודם
      if (a.personalized === b.personalized) return 0;
      return a.personalized ? -1 : 1;
    });

    return tagged;
  }, [recommendations, query, tripFilter, sortByRating, myInterests]);

  const openModal = async () => {
    try {
      const userId = getUser()?.userID;
      const userTrips = await getUserTrips(userId);
      setTrips(userTrips || []);
      setSelectedTripId(userTrips?.[0]?.tripID ?? null);
    } catch {
      setTrips([]);
    }
    setPlaceName("");
    setDescription("");
    setMediaUrl("");
    setRating(0);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!placeName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם מקום");
      return;
    }
    if (!selectedTripId) {
      Alert.alert("שגיאה", "יש לבחור טיול");
      return;
    }

    setSubmitting(true);
    try {
      const userId = getUser()?.userID;
      await addRecommendation({
        userID: userId,
        tripID: selectedTripId,
        placeName: placeName.trim(),
        description: description.trim() || null,
        mediaUrl: mediaUrl.trim() || null,
        rating: rating || null,
        isAnonymous: false,
      });
      setModalVisible(false);
      await loadRecommendations();
      // משוב ברור שההמלצה נשמרה — קודם המשתמשת לא ידעה אם זה עבד.
      if (Platform.OS === "web") window.alert("ההמלצה נוספה בהצלחה");
      else Alert.alert("נוסף בהצלחה ✨", "ההמלצה שלך נוספה ומופיעה ברשימה");
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
        <Text style={styles.header}>המלצות</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* ── סרגל סינון (צד לקוח בלבד) — מוצג רק כשיש המלצות ── */}
      {recommendations.length > 0 && (
        <View style={styles.filterBar}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="חיפוש שם מקום או טיול"
                placeholderTextColor={COLORS.textMuted}
                value={query}
                onChangeText={setQuery}
                textAlign="right"
              />
            </View>
            <TouchableOpacity
              style={[styles.sortBtn, sortByRating && styles.sortBtnActive]}
              onPress={() => setSortByRating((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="מיון לפי דירוג"
            >
              <Ionicons
                name="star"
                size={16}
                color={sortByRating ? COLORS.onBrand : COLORS.brand}
              />
            </TouchableOpacity>
          </View>

          {tripNames.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChips}
            >
              {["all", ...tripNames].map((t) => (
                <Pressable
                  key={t}
                  style={[styles.tripChip, tripFilter === t && styles.tripChipActive]}
                  onPress={() => setTripFilter(t)}
                >
                  <Text
                    style={[
                      styles.tripChipText,
                      tripFilter === t && styles.tripChipTextActive,
                    ]}
                  >
                    {t === "all" ? "הכל" : t}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
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
            <Text style={styles.emptyTitle}>עדיין אין המלצות</Text>
            <Text style={styles.emptyText}>
              שתפו מקום שאהבתם בטיול — לחצו על ה־＋ למטה כדי להוסיף את ההמלצה הראשונה
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
                <RecImage uri={rec.mediaUrl} />
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
                    {author ? (
                      <Text style={styles.author}>מאת: {author}</Text>
                    ) : null}
                    {rec.tripName && (
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
              {/* בחירת טיול */}
              <Text style={styles.label}>טיול</Text>
              {trips.length === 0 ? (
                <Text style={styles.noTrips}>אין טיולים פעילים</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripPicker}>
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

              {/* קישור תמונה (אופציונלי) */}
              <Text style={styles.label}>קישור לתמונה (אופציונלי)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor={COLORS.textMuted}
                value={mediaUrl}
                onChangeText={setMediaUrl}
                textAlign="right"
                autoCapitalize="none"
                keyboardType="url"
              />

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

      <BottomNav active="discovery" />
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
  header: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.brand },

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
  sortBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  sortBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterChips: {
    marginTop: 2,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center", alignItems: "center",
  },
  cardText: { flex: 1, marginHorizontal: 12, alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.brand },
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
});

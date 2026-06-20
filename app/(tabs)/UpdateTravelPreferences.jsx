import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import { useRouter } from "expo-router";
import {
  Cigarette,
  Gem,
  MoonStar,
  UtensilsCrossed,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAllInterests } from "../src/api/interestService";
import {
  addTripPreferenceInterest,
  createTripPreferences,
  getTripPreferenceInterests,
  getTripPreferences,
  getUserTrips,
  removeTripPreferenceInterest,
  updateTripPreferences,
} from "../src/api/tripService";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

// "הכל" = אין העדפה → נשלח כ-NULL. ה-CHECK constraint ב-DB מתיר רק Male/Female/Other/NULL.
const GENDER_OPTIONS = [
  { label: "גבר", value: "Male" },
  { label: "אישה", value: "Female" },
  { label: "הכל", value: null },
];

const AGE_MIN = 18;
const AGE_MAX = 60;

export default function UpdateTravelPreferencesScreen() {
  const router = useRouter();
  const userId = getUser()?.userID;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);

  const [allInterests, setAllInterests] = useState([]);

  // העדפות עבור הטיול הנבחר
  const [preferredGender, setPreferredGender] = useState(null); // "Male" | "Female" | null (אין העדפה)
  const [ageRange, setAgeRange] = useState({ min: 24, max: 38 });
  const [selectedInterestIds, setSelectedInterestIds] = useState([]);
  const [originalInterestIds, setOriginalInterestIds] = useState([]);
  // העדפות אורח חיים לפרטנר/ית (null = אין העדפה)
  const [partnerIsSmoker, setPartnerIsSmoker] = useState(null);
  const [partnerKeepsKosher, setPartnerKeepsKosher] = useState(null);
  const [partnerKeepsShabbat, setPartnerKeepsShabbat] = useState(null);
  const [partnerSpontaneity, setPartnerSpontaneity] = useState(null);
  const [partnerLifestyle, setPartnerLifestyle] = useState(null);
  const [tripPreferenceId, setTripPreferenceId] = useState(null);

  // טעינה ראשונית — הטיולים של המשתמש + כל תחומי העניין
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [userTrips, ints] = await Promise.all([
          getUserTrips(userId),
          getAllInterests(),
        ]);
        const tripsList = Array.isArray(userTrips) ? userTrips : [];
        setTrips(tripsList);
        setAllInterests(ints || []);
        if (tripsList.length > 0) {
          setSelectedTripId(tripsList[0].tripID);
        } else {
          setLoading(false);
        }
      } catch (err) {
        Alert.alert("שגיאה", err.message || "טעינת הטיולים נכשלה");
        setLoading(false);
      }
    })();
  }, [userId]);

  // בכל החלפת טיול — טוען את ההעדפות וה-interests שלו
  useEffect(() => {
    if (!selectedTripId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const pref = await getTripPreferences(selectedTripId);
        if (cancelled) return;
        if (pref) {
          const tripPrefId = pref.tripPreferenceID ?? pref.TripPreferenceID;
          setTripPreferenceId(tripPrefId);
          setPreferredGender(pref.preferredGender ?? pref.PreferredGender ?? null);
          setAgeRange({
            min: Number(pref.preferredAgeMin ?? pref.PreferredAgeMin ?? AGE_MIN),
            max: Number(pref.preferredAgeMax ?? pref.PreferredAgeMax ?? AGE_MAX),
          });
          // קריאת ?? כאן חיונית — false ל-IsSmoker זה ערך חוקי ולא ברירת מחדל
          const smk = pref.isSmoker ?? pref.IsSmoker;
          const ksh = pref.keepsKosher ?? pref.KeepsKosher;
          const shb = pref.keepsShabbat ?? pref.KeepsShabbat;
          const spn = pref.spontaneityLevel ?? pref.SpontaneityLevel;
          const lfs = pref.lifestyleLevel ?? pref.LifestyleLevel;
          setPartnerIsSmoker(smk == null ? null : Boolean(smk));
          setPartnerKeepsKosher(ksh == null ? null : Boolean(ksh));
          setPartnerKeepsShabbat(shb == null ? null : Boolean(shb));
          setPartnerSpontaneity(spn == null ? null : Number(spn));
          setPartnerLifestyle(lfs == null ? null : Number(lfs));

          if (tripPrefId) {
            const tripInts = await getTripPreferenceInterests(tripPrefId);
            if (cancelled) return;
            const ids = (tripInts || []).map((i) => i.interestID ?? i.InterestID);
            setSelectedInterestIds(ids);
            setOriginalInterestIds(ids);
          } else {
            setSelectedInterestIds([]);
            setOriginalInterestIds([]);
          }
        } else {
          // אין העדפות לטיול הזה — איפוס לערכי ברירת מחדל
          setTripPreferenceId(null);
          setPreferredGender(null);
          setAgeRange({ min: 24, max: 38 });
          setSelectedInterestIds([]);
          setOriginalInterestIds([]);
          setPartnerIsSmoker(null);
          setPartnerKeepsKosher(null);
          setPartnerKeepsShabbat(null);
          setPartnerSpontaneity(null);
          setPartnerLifestyle(null);
        }
      } catch (err) {
        if (!cancelled) Alert.alert("שגיאה", err.message || "טעינת ההעדפות נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTripId]);

  const handleSave = async () => {
    if (!selectedTripId) {
      Alert.alert("שגיאה", "לא נבחר טיול לעדכון");
      return;
    }

    setSaving(true);
    try {
      // השדות המשותפים ל-CREATE ול-UPDATE.
      const prefPayload = {
        TripID: selectedTripId,
        PreferredGender: preferredGender,
        PreferredAgeMin: ageRange.min,
        PreferredAgeMax: ageRange.max,
        IsSmoker: partnerIsSmoker,
        KeepsKosher: partnerKeepsKosher,
        KeepsShabbat: partnerKeepsShabbat,
        SpontaneityLevel: partnerSpontaneity,
        LifestyleLevel: partnerLifestyle,
      };

      // 1) אם כבר קיימת רשומת העדפות — מעדכנים. אחרת — יוצרים חדשה (upsert).
      //    טיולים שנוצרו דרך גלגל המזל מגיעים בלי רשומת העדפות, ולכן חייבים ליצור.
      let prefId = tripPreferenceId;
      if (prefId) {
        await updateTripPreferences({ TripPreferenceID: prefId, ...prefPayload });
      } else {
        prefId = await createTripPreferences(prefPayload);
        setTripPreferenceId(prefId);
      }

      // 2) diff על תחומי עניין. ביצירה חדשה originalInterestIds ריק → כל הנבחרים יתווספו.
      const toAdd = selectedInterestIds.filter((id) => !originalInterestIds.includes(id));
      const toRemove = originalInterestIds.filter((id) => !selectedInterestIds.includes(id));
      await Promise.all([
        ...toAdd.map((id) => addTripPreferenceInterest(prefId, id)),
        ...toRemove.map((id) => removeTripPreferenceInterest(prefId, id)),
      ]);

      setOriginalInterestIds(selectedInterestIds);
      Alert.alert("נשמר", "העדפות הטיול עודכנו בהצלחה", [
        { text: "אישור", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("שגיאה בשמירה", err.message || "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  // ── פונקציות עזר לרינדור lifestyle (זהות במבנה למה שב-PreferencesQuiz) ──
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
        <Icon size={20} color={COLORS.brand} strokeWidth={2} />
        <Text style={styles.lifestyleCardLabel}>{label}</Text>
      </View>
      {content}
    </View>
  );

  // מסך ריק כשאין טיולים
  if (!loading && trips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>עדכון העדפות טיול</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={[styles.center, { flex: 1, paddingHorizontal: 30 }]}>
          <Ionicons name="airplane-outline" size={72} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>אין לך עדיין טיולים</Text>
          <Text style={styles.emptyText}>
            צרי טיול חדש כדי שתוכלי להגדיר ולעדכן עבורו את העדפות הפרטנר/ית.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>עדכון העדפות טיול</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── בחירת טיול ── */}
        {trips.length > 1 && (
          <>
            <Text style={styles.section}>בחרי טיול לעדכון</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tripPickerRow}
            >
              {trips.map((trip) => {
                const isSelected = trip.tripID === selectedTripId;
                return (
                  <Pressable
                    key={trip.tripID}
                    style={[styles.tripChip, isSelected && styles.tripChipActive]}
                    onPress={() => setSelectedTripId(trip.tripID)}
                  >
                    <Text style={[styles.tripChipText, isSelected && styles.tripChipTextActive]}>
                      {trip.destination || `טיול #${trip.tripID}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {loading ? (
          <View style={[styles.center, { paddingVertical: 60 }]}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : (
          <>
            {/* ── העדפת מגדר ── */}
            <Text style={styles.section}>העדפת מגדר לפרטנר/ית</Text>
            <View style={styles.segmented}>
              {GENDER_OPTIONS.map((opt) => {
                const isSelected = preferredGender === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.segment, isSelected && styles.segmentActive]}
                    onPress={() => setPreferredGender(opt.value)}
                  >
                    <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── טווח גילאים ── */}
            <Text style={styles.section}>טווח גילאים</Text>
            <View style={styles.ageRangeDisplay}>
              <View style={styles.ageNumberPill}>
                <Text style={styles.ageNumberText}>{ageRange.min}</Text>
              </View>
              <View style={styles.ageRangeDash} />
              <View style={styles.ageNumberPill}>
                <Text style={styles.ageNumberText}>
                  {ageRange.max}
                  {ageRange.max >= AGE_MAX ? "+" : ""}
                </Text>
              </View>
            </View>
            <Slider
              value={[ageRange.min, ageRange.max]}
              minimumValue={AGE_MIN}
              maximumValue={AGE_MAX}
              step={1}
              minimumTrackTintColor={COLORS.brand}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.onBrand}
              thumbStyle={styles.ageThumb}
              trackStyle={styles.ageTrack}
              containerStyle={styles.ageSliderContainer}
              onValueChange={(values) =>
                setAgeRange({ min: values[0], max: values[1] })
              }
            />
            <View style={styles.ageBoundsRow}>
              <Text style={styles.ageBound}>{AGE_MIN}</Text>
              <Text style={styles.ageBound}>+{AGE_MAX}</Text>
            </View>

            {/* ── אורח חיים מועדף לפרטנר/ית ── */}
            <Text style={styles.section}>אורח החיים שאני מחפש/ת</Text>
            <Text style={styles.lifestyleIntro}>
              הכל אופציונלי — בחרי "אין העדפה" אם זה לא חשוב לך
            </Text>

            {renderLifestyleCard(
              Cigarette,
              "פרטנר/ית מעשן/ת?",
              renderTriToggle(partnerIsSmoker, setPartnerIsSmoker),
            )}

            {renderLifestyleCard(
              MoonStar,
              "פרטנר/ית שומר/ת שבת?",
              renderTriToggle(partnerKeepsShabbat, setPartnerKeepsShabbat),
            )}

            {renderLifestyleCard(
              UtensilsCrossed,
              "פרטנר/ית שומר/ת כשרות?",
              renderTriToggle(partnerKeepsKosher, setPartnerKeepsKosher),
            )}

            {renderLifestyleCard(
              Zap,
              "רמת ספונטניות מועדפת",
              <View>
                <Text style={styles.lifestyleHelp}>1 = שקול/ה · 5 = הרפתקנ/ית</Text>
                {renderRatingWithNone(partnerSpontaneity, setPartnerSpontaneity)}
              </View>,
            )}

            {renderLifestyleCard(
              Gem,
              "אורח חיים בטיול",
              <View>
                <Text style={styles.lifestyleHelp}>1 = פשוט וחסכוני · 5 = יוקרתי</Text>
                {renderRatingWithNone(partnerLifestyle, setPartnerLifestyle)}
              </View>,
            )}

            {/* ── תחומי עניין ── */}
            <Text style={styles.section}>תחומי עניין לטיול</Text>
            <View style={styles.tagsGrid}>
              {allInterests.map((it) => {
                const selected = selectedInterestIds.includes(it.interestID);
                return (
                  <Pressable
                    key={it.interestID}
                    style={[styles.tag, selected && styles.tagActive]}
                    onPress={() =>
                      setSelectedInterestIds((prev) =>
                        selected
                          ? prev.filter((id) => id !== it.interestID)
                          : [...prev, it.interestID],
                      )
                    }
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextActive]}>
                      {it.interestName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* כפתור שמירה — sticky בתחתית */}
      {!loading && (
        <View style={styles.saveBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.onBrand} />
            ) : (
              <Text style={styles.saveBtnText}>שמירת השינויים</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  section: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginTop: 16,
    marginBottom: 12,
  },

  // ── בחירת טיול ──
  tripPickerRow: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingVertical: 4,
  },
  tripChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tripChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tripChipText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.brand },
  tripChipTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── העדפת מגדר ──
  segmented: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: COLORS.brand },
  segmentText: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.brand },
  segmentTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── טווח גילאים ──
  ageRangeDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  ageNumberPill: {
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    alignItems: "center",
  },
  ageNumberText: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.surface,
    letterSpacing: 0.5,
  },
  ageRangeDash: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.brand,
    opacity: 0.45,
  },
  ageSliderContainer: { height: 40, width: "100%" },
  ageTrack: { height: 6, borderRadius: 3 },
  ageThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.brand,
  },
  ageBoundsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 2,
  },
  ageBound: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted },

  // ── תחומי עניין ──
  tagsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tagActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tagText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.brand },
  tagTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── Lifestyle section (5 partner preferences) ──
  lifestyleIntro: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 12,
    lineHeight: 18,
  },
  lifestyleCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
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
    color: COLORS.brand,
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
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  triBtnWide: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  triBtnActive: { backgroundColor: COLORS.brand },
  triBtnText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.brand,
  },
  triBtnTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

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
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDotActive: { backgroundColor: COLORS.brand },
  ratingNum: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },
  ratingNumActive: { color: COLORS.surface },
  noPrefBtn: {
    alignSelf: "center",
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  noPrefBtnActive: { backgroundColor: COLORS.brand },
  noPrefText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.brand,
  },
  noPrefTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── מסך ריק ──
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    marginTop: 16,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  // ── שמירה ──
  saveBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.surface, fontSize: 16, fontFamily: FONTS.bold },
});

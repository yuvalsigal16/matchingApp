import { Slider } from "@miblanchard/react-native-slider";
import { useRouter } from "expo-router";
import {
  Cigarette,
  Gem,
  MoonStar,
  Plane,
  UtensilsCrossed,
  Zap,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

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
      <Screen>
        <ScreenHeader title="עדכון העדפות טיול" onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <EmptyState
            Icon={Plane}
            title="אין לך עדיין טיולים"
            subtitle="צרי טיול חדש כדי שתוכלי להגדיר ולעדכן עבורו את העדפות הפרטנר/ית."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="עדכון העדפות טיול" onBack={() => router.back()} />

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
          <View style={styles.loadingBox}>
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
              maximumTrackTintColor={COLORS.divider}
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
              {'הכל אופציונלי — בחרי "אין העדפה" אם זה לא חשוב לך'}
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
          <Button
            label="שמירת השינויים"
            onPress={handleSave}
            loading={saving}
            size="lg"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, justifyContent: "center" },
  loadingBox: { justifyContent: "center", alignItems: "center", paddingVertical: SPACING.xxxl },

  scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },

  section: {
    ...TYPOGRAPHY.h3,
    color: COLORS.brand,
    textAlign: "right",
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },

  // ── בחירת טיול ──
  tripPickerRow: {
    flexDirection: "row-reverse",
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  tripChip: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  tripChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tripChipText: { ...TYPOGRAPHY.caption, color: COLORS.brand },
  tripChipTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── העדפת מגדר ──
  segmented: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
    borderRadius: RADIUS.sm,
  },
  segmentActive: { backgroundColor: COLORS.brand },
  segmentText: { ...TYPOGRAPHY.body, color: COLORS.brand },
  segmentTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── טווח גילאים ──
  ageRangeDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  ageNumberPill: {
    minWidth: 64,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg - 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand,
    alignItems: "center",
  },
  ageNumberText: {
    ...TYPOGRAPHY.h3,
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
    paddingHorizontal: SPACING.xs,
    marginTop: 2,
  },
  ageBound: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },

  // ── תחומי עניין ──
  tagsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  tag: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  tagActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tagText: { ...TYPOGRAPHY.caption, color: COLORS.brand },
  tagTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── Lifestyle section (5 partner preferences) ──
  lifestyleIntro: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: SPACING.md,
  },
  lifestyleCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm + 2,
  },
  lifestyleCardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  lifestyleCardLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.brand,
    flex: 1,
    textAlign: "right",
  },
  lifestyleHelp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: SPACING.sm + 2,
  },

  // ── Tri-state toggle (yes / no / no-preference) ──
  triToggleRow: {
    flexDirection: "row-reverse",
    gap: SPACING.sm,
  },
  triBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  triBtnWide: {
    flex: 1.4,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  triBtnActive: { backgroundColor: COLORS.brand },
  triBtnText: { ...TYPOGRAPHY.caption, color: COLORS.brand },
  triBtnTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── Rating 1-5 with "no preference" option ──
  ratingRow: {
    flexDirection: "row-reverse",
    gap: SPACING.xs + 2,
    marginBottom: SPACING.sm + 2,
  },
  ratingDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDotActive: { backgroundColor: COLORS.brand },
  ratingNum: { ...TYPOGRAPHY.bodyBold, color: COLORS.brand },
  ratingNumActive: { color: COLORS.surface },
  noPrefBtn: {
    alignSelf: "center",
    paddingVertical: SPACING.sm - 1,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  noPrefBtnActive: { backgroundColor: COLORS.brand },
  noPrefText: { ...TYPOGRAPHY.caption, color: COLORS.brand },
  noPrefTextActive: { color: COLORS.surface, fontFamily: FONTS.bold },

  // ── שמירה ──
  saveBar: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md + 2,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
});

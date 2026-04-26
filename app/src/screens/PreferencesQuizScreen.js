import { Ionicons } from "@expo/vector-icons";
import { Globe2, Plane, Home, Calendar } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllInterests } from "../api/interestService";
import {
  addTripPreferenceInterest,
  createTrip,
  createTripPreferences,
} from "../api/tripService";
import { getUser } from "../auth/authStore";
import { FONTS } from "../theme/fonts";

// "DD/MM/YY" או "DD/MM/YYYY" → Date או null אם לא תקין
function parseDDMMYY(str) {
  if (!str) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(str.trim());
  if (!m) return null;
  let d = parseInt(m[1], 10);
  let mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function toIsoDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

const GENDER_HE_TO_DB = {
  גבר: "Male",
  אישה: "Female",
  // "הכל" → null
};

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "intro",
    type: "intro",
    title: "שאלון העדפות טיול",
    subtitle: "בואי נתכנן יחד את הטיול המושלם שלך",
    progress: 0,
  },
  {
    id: "tripName",
    type: "field",
    title: "איך נקרא לטיול שלך?",
    placeholder: "למשל: טיול שחרור לתאילנד",
    progress: 15,
  },
  {
    id: "destination",
    type: "field",
    title: "מה היעד?",
    placeholder: "יעד הטיול (לא חובה)",
    optional: true,
    progress: 30,
  },
  {
    id: "dates",
    type: "dates",
    title: "מתי יוצאים?",
    progress: 50,
  },
  {
    id: "gender",
    type: "single-select",
    title: "איזה סוג של פרטנר/ית תרצי?",
    options: ["גבר", "אישה", "הכל"],
    progress: 65,
  },
  {
    id: "age",
    type: "age",
    title: "איזה גיל מתאים לי?",
    progress: 80,
  },
  {
    id: "interests",
    type: "multi-select",
    title: "תחומי עניין לטיול",
    progress: 100,
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function getIsAnswered(question, data) {
  switch (question.type) {
    case "intro":
      return true;
    case "field": {
      if (question.optional) return true;
      return !!(data[question.id] || "").trim();
    }
    case "dates": {
      const start = parseDDMMYY(data.startDate);
      const end = parseDDMMYY(data.endDate);
      if (!start || !end) return false;
      if (end < start) return false;
      return true;
    }
    case "single-select":
      return !!data[question.id];
    case "age": {
      const n = parseInt(data.ageRange, 10);
      return !isNaN(n) && n >= 18 && n <= 99;
    }
    case "multi-select":
      return Array.isArray(data.interests) && data.interests.length > 0;
    default:
      return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PreferencesQuizScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    tripName: "",
    destination: "",
    startDate: "",
    endDate: "",
    recommendPeriod: false,
    gender: "",
    ageRange: "",
    interests: [],
  });

  const [interestOptions, setInterestOptions] = useState([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [interestsLoadError, setInterestsLoadError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const progressAnim = useRef(
    new Animated.Value(QUESTIONS[0].progress),
  ).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const nextBtnScale = useRef(new Animated.Value(1)).current;

  const currentQ = QUESTIONS[step];
  const answered = getIsAnswered(currentQ, data);

  // ── טעינת תחומי עניין מהשרת ──
  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, []);

  // ── אנימציית פס התקדמות ──
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentQ.progress,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const animateTransition = useCallback(
    (nextStep) => {
      const exitDir = nextStep > step ? -24 : 24;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: exitDir,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(-exitDir);
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

  const updateField = useCallback((key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleInterest = useCallback((interestId) => {
    setData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((i) => i !== interestId)
        : [...prev.interests, interestId],
    }));
  }, []);

  // ── שליחה ל-DB ──
  const submitFullTrip = useCallback(async () => {
    const u = getUser();
    if (!u?.userID) {
      throw new Error("לא נמצא משתמש מחובר. נא להתחבר מחדש.");
    }

    const dest = (data.destination || "").trim();
    const start = parseDDMMYY(data.startDate);
    const end = parseDDMMYY(data.endDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) throw new Error("תאריך יציאה חייב להיות בעתיד");

    // 1. Trip
    const tripId = await createTrip({
      CreatedByUserID: u.userID,
      Destination: dest,
      StartDate: toIsoDateOnly(start),
      EndDate: toIsoDateOnly(end),
    });

    // 2. TripPreferences
    const ageNum = parseInt(data.ageRange, 10);
    const ageValid = !isNaN(ageNum) && ageNum > 0;
    const prefId = await createTripPreferences({
      TripID: tripId,
      PreferredGender: GENDER_HE_TO_DB[data.gender] || null,
      PreferredAgeMin: ageValid ? ageNum : null,
      PreferredAgeMax: ageValid ? ageNum : null,
      IsSmoker: null,
      KeepsKosher: null,
      KeepsShabbat: null,
      SpontaneityLevel: null,
      LifestyleLevel: null,
    });

    // 3. TripPreferenceInterests
    if (Array.isArray(data.interests) && data.interests.length > 0) {
      await Promise.all(
        data.interests.map((interestId) =>
          addTripPreferenceInterest(prefId, interestId),
        ),
      );
    }
  }, [data]);

  const handleNext = async () => {
    if (!answered || submitting) return;

    // שלב אחרון
    if (step === QUESTIONS.length - 1) {
      // אם אין יעד — גלגל מזל
      if (!(data.destination || "").trim()) {
        navigation.navigate("Wheel");
        return;
      }

      setSubmitError("");
      setSubmitting(true);
      try {
        await submitFullTrip();
        navigation.replace("Home");
      } catch (err) {
        setSubmitError(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    animateTransition(step + 1);
  };

  const handleBack = () => {
    if (step > 0) animateTransition(step - 1);
    else navigation.goBack();
  };

  const onNextPressIn = () => {
    if (!answered) return;
    Animated.spring(nextBtnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };
  const onNextPressOut = () => {
    Animated.spring(nextBtnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  // ─── Sub-renderers ────────────────────────────────────────────────────────

  const renderIntro = () => (
    <View style={styles.introWrapper}>
      <View style={styles.introIconCircle}>
        <Globe2 size={76} color="#1A3C40" strokeWidth={1.6} />
      </View>
      <Text style={styles.introSubtitle}>{currentQ.subtitle}</Text>
    </View>
  );

  const renderField = () => (
    <View style={styles.fieldsWrapper}>
      <TextInput
        style={styles.input}
        placeholder={currentQ.placeholder}
        placeholderTextColor="#aaa"
        textAlign="right"
        value={data[currentQ.id] || ""}
        onChangeText={(v) => updateField(currentQ.id, v)}
      />
      {currentQ.optional ? (
        <Text style={styles.hintText}>
          ניתן לדלג — נציע לך יעד אקראי בגלגל המזל
        </Text>
      ) : null}
    </View>
  );

  const renderDates = () => (
    <View style={styles.fieldsWrapper}>
      <View style={styles.dateLabelRow}>
        <Plane size={18} color="#1A3C40" strokeWidth={1.8} />
        <Text style={styles.dateLabel}>תאריך יציאה</Text>
      </View>
      <View style={styles.dateInputCard}>
        <Calendar size={18} color="#9AABAD" strokeWidth={1.8} />
        <TextInput
          style={styles.dateTextInput}
          placeholder="DD/MM/YY"
          placeholderTextColor="#aaa"
          textAlign="right"
          value={data.startDate}
          onChangeText={(v) => updateField("startDate", v)}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.dateLabelRow}>
        <Home size={18} color="#1A3C40" strokeWidth={1.8} />
        <Text style={styles.dateLabel}>תאריך חזרה</Text>
      </View>
      <View style={styles.dateInputCard}>
        <Calendar size={18} color="#9AABAD" strokeWidth={1.8} />
        <TextInput
          style={styles.dateTextInput}
          placeholder="DD/MM/YY"
          placeholderTextColor="#aaa"
          textAlign="right"
          value={data.endDate}
          onChangeText={(v) => updateField("endDate", v)}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <Pressable
        style={styles.checkboxRow}
        onPress={() =>
          updateField("recommendPeriod", !data.recommendPeriod)
        }
      >
        <View
          style={[
            styles.checkbox,
            data.recommendPeriod && styles.checkboxChecked,
          ]}
        >
          {data.recommendPeriod && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
        <Text style={styles.checkboxLabel}>תמליצי לי על תקופה טובה לטיסה</Text>
      </Pressable>
    </View>
  );

  const renderSingleSelect = () => (
    <View style={styles.optionsContainer}>
      {currentQ.options.map((opt) => {
        const isSelected = data[currentQ.id] === opt;
        return (
          <Pressable
            key={opt}
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
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );

  const renderAge = () => (
    <View style={styles.fieldsWrapper}>
      <Text style={styles.ageHint}>גיל מועדף לפרטנר/ית</Text>
      <TextInput
        style={[styles.input, styles.ageInput]}
        placeholder="הקלידי גיל (18-99)"
        placeholderTextColor="#aaa"
        textAlign="center"
        keyboardType="numeric"
        maxLength={2}
        value={String(data.ageRange || "")}
        onChangeText={(v) => {
          const clean = v.replace(/[^0-9]/g, "");
          updateField("ageRange", clean);
        }}
      />
    </View>
  );

  const renderMultiSelect = () => {
    if (interestsLoading) {
      return (
        <View style={styles.optionsContainer}>
          <ActivityIndicator color="#1A3C40" />
        </View>
      );
    }

    if (interestsLoadError) {
      return (
        <View style={styles.optionsContainer}>
          <Text style={styles.submitErrorText}>
            כשל בטעינת תחומי העניין: {interestsLoadError}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tagsGrid}>
        {interestOptions.map((opt) => {
          const isSelected = data.interests.includes(opt.interestID);
          return (
            <Pressable
              key={opt.interestID}
              style={({ pressed }) => [
                styles.tag,
                isSelected && styles.tagSelected,
                pressed && !isSelected && styles.pressedBtn,
              ]}
              onPress={() => toggleInterest(opt.interestID)}
            >
              <Text
                style={[
                  styles.tagText,
                  isSelected && styles.tagTextSelected,
                ]}
              >
                {opt.interestName}
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
      case "field":
        return renderField();
      case "dates":
        return renderDates();
      case "single-select":
        return renderSingleSelect();
      case "age":
        return renderAge();
      case "multi-select":
        return renderMultiSelect();
      default:
        return null;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

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
        {/* Progress bar */}
        {showProgress ? (
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth }]}
              />
            </View>
            <Text style={styles.progressLabel}>{`${currentQ.progress}%`}</Text>
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
                    ? "בואי נתחיל"
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
  container: { flex: 1, backgroundColor: "#E8EDEF" },
  flex: { flex: 1, alignItems: "center" },

  // ── Progress ──
  progressBarWrapper: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  progressSpacer: {
    width: "100%",
    paddingTop: 18,
    paddingBottom: 6,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#D0D8DA",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1A3C40",
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: "#1A3C40",
    minWidth: 36,
    textAlign: "right",
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

  // ── Age input ──
  ageHint: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#666",
    textAlign: "center",
    marginBottom: 14,
  },
  ageInput: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    textAlign: "center",
    color: "#1A3C40",
    letterSpacing: 2,
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
    backgroundColor: "#E8EDEF",
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

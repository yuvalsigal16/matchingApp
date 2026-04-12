import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { FONTS } from "../theme/fonts";

// ─── Local city data (offline fallback) ──────────────────────────────────────

const ISRAELI_CITIES = [
  "אבו גוש", "אור יהודה", "אור עקיבא", "אילת", "אריאל",
  "אשדוד", "אשקלון", "באר שבע", "בית שאן", "בית שמש",
  "בני ברק", "בת ים", "גבעת שמואל", "גבעתיים", "דימונה",
  "הוד השרון", "הרצליה", "חדרה", "חולון", "חיפה",
  "טבריה", "טירת כרמל", "יבנה", "יהוד", "ירושלים",
  "כפר סבא", "כרמיאל", "לוד", "מגדל העמק", "מודיעין",
  "מודיעין עילית", "מעלה אדומים", "נהריה", "נס ציונה", "נצרת",
  "נצרת עילית", "נתניה", "עכו", "עפולה", "פתח תקווה",
  "צפת", "קריית אתא", "קריית ביאליק", "קריית גת", "קריית מוצקין",
  "קריית שמונה", "קריית ים", "ראש העין", "ראשון לציון", "רהט",
  "רחובות", "רמלה", "רמת גן", "רמת השרון", "רעננה",
  "שדרות", "שפרעם", "תל אביב",
];

const GENDER_OPTIONS = ["זכר", "נקבה", "אחר"];

// ─── Geoapify city search service ────────────────────────────────────────────
//
// Uses Geoapify Autocomplete API. Swap GEOAPIFY_API_KEY or replace the fetch
// block with your own backend: `fetch(\`https://your-api.com/cities?q=...\`)`

const GEOAPIFY_API_KEY = "b7fddb151bdd4eae8f4afe871bff1da1";
const GEOAPIFY_URL     = "https://api.geoapify.com/v1/geocode/autocomplete";

// Module-level LRU-style cache — avoids redundant API calls for the same query
const cityCache = new Map();

/**
 * Fetches city suggestions from Geoapify.
 * Returns an array of { label, city, country, lat, lon } objects.
 * Falls back to the local ISRAELI_CITIES array on any network/API failure.
 */
async function fetchCitySuggestions(query, signal) {
  const cacheKey = query.toLowerCase().trim();
  if (cityCache.has(cacheKey)) return cityCache.get(cacheKey);

  try {
    const params = new URLSearchParams({
      text:   query,
      type:   "city",
      limit:  "6",
      lang:   "he",
      bias:   "proximity:34.8516,31.0461", // rank Israeli cities higher
      apiKey: GEOAPIFY_API_KEY,
    });

    const res = await fetch(`${GEOAPIFY_URL}?${params}`, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const results = (data.features ?? [])
      .filter((f) => f.properties?.city)
      .map((f) => ({
        label:   f.properties.formatted ?? f.properties.city,
        city:    f.properties.city,
        country: f.properties.country ?? "",
        lat:     f.properties.lat ?? f.geometry?.coordinates[1] ?? 0,
        lon:     f.properties.lon ?? f.geometry?.coordinates[0] ?? 0,
      }))
      .slice(0, 5);

    // Keep cache bounded
    if (cityCache.size >= 60) cityCache.clear();
    cityCache.set(cacheKey, results);

    return results;
  } catch (e) {
    if (e.name === "AbortError") throw e;
    // Network / API failure → local fallback so the field always works
    return ISRAELI_CITIES
      .filter((c) => c.includes(query))
      .slice(0, 5)
      .map((name) => ({ label: name, city: name, country: "ישראל", lat: 0, lon: 0 }));
  }
}

// ─── useCitySearch hook ───────────────────────────────────────────────────────
//
// Sets status → "loading" IMMEDIATELY on input change (before the 350 ms
// debounce fires) so the dropdown never flickers to an empty-results state
// while the user is still typing.

function useCitySearch(query) {
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus]           = useState("idle"); // "idle"|"loading"|"done"
  const controllerRef                 = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }

    setStatus("loading"); // show spinner before debounce fires

    const timer = setTimeout(async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const results = await fetchCitySuggestions(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
          setStatus("done");
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setSuggestions([]);
          setStatus("done");
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => () => controllerRef.current?.abort(), []); // abort on unmount

  return { suggestions, loading: status === "loading" };
}

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "bio",
    title: "קצת על עצמי",
    type: "fields",
    fields: [
      { key: "name", label: "שם מלא" },
      { key: "age",  label: "גיל" },
      { key: "city", label: "מקום מגורים" },
    ],
    hasGender: true,
    progress: 5,
  },
  {
    id: "interests",
    title: "תחומי עניין של טיול מושלם",
    type: "multi-select",
    options: ["אקסטרים", "טבע", "תרבות", "קולינריה", "שופינג", "בטן גב", "מוזיקה", "מסיבות"],
    progress: 15,
  },
  {
    id: "smoking",
    title: "מעשן?",
    type: "single-select",
    options: ["מעשן/ת 🚬", "לא מעשן/ת 🚭"],
    progress: 25,
  },
  {
    id: "religion",
    title: "מסורת ואורח חיים",
    type: "yes-no-list",
    options: [
      { key: "shabbat", label: "שומר/ת שבת? 🕯️" },
      { key: "kosher",  label: "שומר/ת כשרות? ✡️" },
    ],
    progress: 40,
  },
  {
    id: "spontaneous",
    title: "כמה אני ספונטני?",
    type: "rating",
    labels: ["אולי בפעם אחרת", "מי טס מחר?"],
    progress: 60,
  },
  {
    id: "lifestyle",
    title: "אורח החיים שלי בטיול",
    type: "rating",
    labels: ["פשוט", "יוקרתי"],
    progress: 80,
  },
  {
    id: "social",
    title: "אפשר למצוא אותי ב:",
    type: "social-links",
    progress: 100,
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function getIsAnswered(question, answers) {
  switch (question.type) {
    case "fields": {
      const fieldsOk = question.fields.every((f) => {
        if (f.key === "city") {
          // Must be a selected suggestion object, not just free-typed text
          return answers.city != null
            && typeof answers.city === "object"
            && !!answers.city.city;
        }
        const val = (answers[f.key] || "").trim();
        if (!val) return false;
        if (f.key === "age") {
          const n = parseInt(val, 10);
          return !isNaN(n) && n >= 1 && n <= 120;
        }
        return true;
      });
      const genderOk = !question.hasGender || !!answers.gender;
      return fieldsOk && genderOk;
    }
    case "multi-select":
    case "single-select":
      return (answers[question.id] || []).length > 0;
    case "yes-no-list":
      return question.options.every((item) => answers[item.key] != null);
    case "rating":
      return answers[question.id] != null;
    case "social-links":
      return true;
    default:
      return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  // cityInputText tracks what the user is typing; answers.city stores the
  // fully resolved { label, city, country, lat, lon } object on selection.
  const [cityInputText, setCityInputText] = useState("");

  const scrollViewRef  = useRef(null);
  const progressAnim   = useRef(new Animated.Value(QUESTIONS[0].progress)).current;
  const fadeAnim       = useRef(new Animated.Value(1)).current;
  const slideAnim      = useRef(new Animated.Value(0)).current;
  const nextBtnScale   = useRef(new Animated.Value(1)).current;

  const currentQ = QUESTIONS[step];
  const answered = getIsAnswered(currentQ, answers);

  const { suggestions: citySuggestions, loading: cityLoading } =
    useCitySearch(cityInputText);

  // Hide suggestions when navigating between steps.
  // Restore input text from the stored answer if the user returns to step 0.
  useEffect(() => {
    setShowCitySuggestions(false);
    if (answers.city && typeof answers.city === "object") {
      setCityInputText(answers.city.city);
    }
  }, [step]);

  // Animate progress bar
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
        Animated.timing(fadeAnim,  { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: exitDir, duration: 140, useNativeDriver: true }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(-exitDir);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start();
      });
    },
    [step]
  );

  const handleNext = () => {
    if (!answered) return;
    if (step < QUESTIONS.length - 1) {
      animateTransition(step + 1);
    } else {
      navigation.navigate("PreferencesQuiz");
    }
  };

  const handleBack = () => {
    if (step > 0) animateTransition(step - 1);
    else navigation.goBack();
  };

  const updateAnswer = useCallback((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onNextPressIn = () => {
    if (!answered) return;
    Animated.spring(nextBtnScale, { toValue: 0.96, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  };
  const onNextPressOut = () => {
    Animated.spring(nextBtnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  };

  // Scroll city input into view after keyboard animation completes
  const handleCityFocus = useCallback(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 400);
  }, []);

  // ─── Field sub-renderers ──────────────────────────────────────────────────

  const renderGenderSelector = () => (
    <View key="gender" style={styles.genderCard}>
      <Text style={styles.genderLabel}>מגדר</Text>
      <View style={styles.segmentedControl}>
        {GENDER_OPTIONS.map((opt) => {
          const isSelected = answers.gender === opt;
          return (
            <Pressable
              key={opt}
              style={[styles.segment, isSelected && styles.segmentActive]}
              onPress={() => updateAnswer("gender", opt)}
            >
              <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderCityInput = () => {
    const showDropdown = showCitySuggestions && cityInputText.trim().length >= 2;

    return (
      <View key="city" style={styles.cityWrapper}>
        {/* Input row with inline spinner */}
        <View style={styles.cityInputCard}>
          <TextInput
            style={styles.cityTextInput}
            placeholder="מקום מגורים"
            placeholderTextColor="#aaa"
            textAlign="right"
            value={cityInputText}
            onChangeText={(val) => {
              setCityInputText(val);
              // Clear the resolved city object when user edits manually
              if (answers.city) updateAnswer("city", null);
              setShowCitySuggestions(val.trim().length >= 2);
            }}
            onFocus={() => {
              if (cityInputText.trim().length >= 2) setShowCitySuggestions(true);
              handleCityFocus();
            }}
            onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
          />
          {cityLoading && (
            <ActivityIndicator size="small" color="#aaa" style={styles.citySpinner} />
          )}
        </View>

        {/* Dropdown */}
        {showDropdown && (
          <View style={styles.suggestionsDropdown}>
            {cityLoading ? (
              <View style={styles.dropdownStateRow}>
                <ActivityIndicator size="small" color="#1A3C40" />
              </View>
            ) : citySuggestions.length > 0 ? (
              citySuggestions.map((suggestion, idx) => (
                <Pressable
                  key={`${suggestion.city}-${suggestion.country}-${idx}`}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && styles.pressedBtn,
                    idx === citySuggestions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    setCityInputText(suggestion.city);
                    updateAnswer("city", suggestion); // store full object
                    setShowCitySuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion.city}</Text>
                  {suggestion.country ? (
                    <Text style={styles.suggestionSubText}>{suggestion.country}</Text>
                  ) : null}
                </Pressable>
              ))
            ) : (
              <View style={styles.dropdownStateRow}>
                <Text style={styles.emptyStateText}>לא נמצאו תוצאות</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderFields = () => {
    const rows = [];
    for (const f of currentQ.fields) {
      if (f.key === "city") {
        rows.push(renderCityInput());
      } else {
        rows.push(
          <TextInput
            key={f.key}
            style={styles.input}
            placeholder={f.label}
            placeholderTextColor="#aaa"
            textAlign="right"
            keyboardType={f.key === "age" ? "numeric" : "default"}
            onChangeText={(val) => {
              if (f.key === "age") {
                // Strip non-digits and clamp to 1–120
                const clean = val.replace(/[^0-9]/g, "");
                const num = parseInt(clean, 10);
                if (clean === "" || (num >= 1 && num <= 120)) {
                  updateAnswer(f.key, clean);
                }
              } else {
                updateAnswer(f.key, val);
              }
            }}
            value={answers[f.key] || ""}
          />
        );
      }
      // Inject gender segmented control after the age row
      if (f.key === "age" && currentQ.hasGender) {
        rows.push(renderGenderSelector());
      }
    }
    return rows;
  };

  // ─── Question renderers ───────────────────────────────────────────────────

  const renderSelectOptions = () => {
    const currentVal = answers[currentQ.id] || [];
    return (
      <View style={styles.optionsContainer}>
        {currentQ.options.map((opt) => {
          const isSelected = currentVal.includes(opt);
          return (
            <Pressable
              key={opt}
              style={({ pressed }) => [
                styles.optionBtn,
                isSelected && styles.selectedBtn,
                pressed && !isSelected && styles.pressedBtn,
              ]}
              onPress={() => {
                if (currentQ.type === "single-select") {
                  updateAnswer(currentQ.id, [opt]);
                } else {
                  const next = isSelected
                    ? currentVal.filter((i) => i !== opt)
                    : [...currentVal, opt];
                  updateAnswer(currentQ.id, next);
                }
              }}
            >
              <Text style={[styles.optionText, isSelected && styles.selectedText]}>{opt}</Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderYesNoList = () =>
    currentQ.options.map((item) => (
      <View key={item.key} style={styles.yesNoContainer}>
        <Text style={styles.yesNoLabel}>{item.label}</Text>
        <View style={styles.yesNoButtonsRow}>
          {["כן", "לא"].map((val) => {
            const isSelected = answers[item.key] === val;
            return (
              <Pressable
                key={val}
                style={({ pressed }) => [
                  styles.smallOptionBtn,
                  isSelected && styles.selectedBtn,
                  pressed && !isSelected && styles.pressedBtn,
                ]}
                onPress={() => updateAnswer(item.key, val)}
              >
                <Text style={[styles.smallOptionText, isSelected && styles.selectedText]}>
                  {val}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ));

  const renderRating = () => (
    <View style={styles.ratingWrapper}>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((num) => {
          const isSelected = answers[currentQ.id] === num;
          return (
            <Pressable
              key={num}
              style={({ pressed }) => [
                styles.rateCircle,
                isSelected && styles.selectedRate,
                pressed && !isSelected && styles.pressedBtn,
              ]}
              onPress={() => updateAnswer(currentQ.id, num)}
            >
              <Text style={[styles.rateText, isSelected && styles.selectedRateText]}>{num}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        <Text style={styles.subText}>{currentQ.labels[0]}</Text>
        <Text style={styles.subText}>{currentQ.labels[1]}</Text>
      </View>
    </View>
  );

  const renderSocialLinks = () => (
    <View style={styles.socialContainer}>
      {[
        { key: "instagram", icon: "📸", placeholder: "@username (Instagram)" },
        { key: "facebook",  icon: "👤", placeholder: "/username (Facebook)" },
      ].map(({ key, icon, placeholder }) => (
        <View key={key} style={styles.socialInputRow}>
          <Text style={styles.socialIcon}>{icon}</Text>
          <TextInput
            style={styles.socialInput}
            placeholder={placeholder}
            placeholderTextColor="#aaa"
            onChangeText={(val) => updateAnswer(key, val)}
            value={answers[key] || ""}
          />
        </View>
      ))}
      <Text style={styles.disclaimerText}>
        הפרטים יוצגו למשתמשים מתאימים בלבד ובהתאם למדיניות הפרטיות
      </Text>
    </View>
  );

  const renderQuestionContent = () => {
    switch (currentQ.type) {
      case "fields":        return renderFields();
      case "multi-select":
      case "single-select": return renderSelectOptions();
      case "yes-no-list":   return renderYesNoList();
      case "rating":        return renderRating();
      case "social-links":  return renderSocialLinks();
      default:              return null;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Progress bar — lives outside animated area so it's always visible */}
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressLabel}>{`${currentQ.progress}%`}</Text>
        </View>

        {/* Animated content */}
        <Animated.View
          style={[
            styles.contentWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>{currentQ.title}</Text>

          <ScrollView
            ref={scrollViewRef}
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
          <Animated.View style={[styles.nextBtnWrapper, { transform: [{ scale: nextBtnScale }] }]}>
            <Pressable
              style={[styles.nextBtn, !answered && styles.nextBtnDisabled]}
              onPress={handleNext}
              onPressIn={onNextPressIn}
              onPressOut={onNextPressOut}
              disabled={!answered}
            >
              <Text style={[styles.nextBtnText, !answered && styles.nextBtnTextDisabled]}>
                {step === QUESTIONS.length - 1 ? "סיום" : "נמשיך הלאה?"}
              </Text>
            </Pressable>
          </Animated.View>

          {/* <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.backLink}>חזרה לאחור</Text>
          </Pressable> */}
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
  flex:      { flex: 1, alignItems: "center" },

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

  // ── Standard text input ──
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

  // ── Gender segmented control ──
  genderCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    ...SHADOW,
  },
  genderLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: "#bbb",
    textAlign: "right",
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#E8EDEF",
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#999",
  },
  segmentTextActive: {
    color: "#1A3C40",
    fontFamily: FONTS.bold,
  },

  // ── City autocomplete ──
  cityWrapper: {
    width: "100%",
    marginBottom: 14,
    zIndex: 10,
  },
  cityInputCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 18,
    ...SHADOW,
  },
  cityTextInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#222",
  },
  citySpinner: {
    marginLeft: 8,
  },
  suggestionsDropdown: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 5,
    overflow: "hidden",
    ...SHADOW,
    shadowOpacity: 0.12,
    elevation: 5,
  },
  dropdownStateRow: {
    paddingVertical: 16,
    alignItems: "center",
  },
  suggestionItem: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F3",
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#333",
    textAlign: "right",
  },
  suggestionSubText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#aaa",
    textAlign: "right",
    marginTop: 2,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#bbb",
    textAlign: "center",
  },

  // ── Select options ──
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
  checkmark: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold, marginLeft: 6 },

  // ── Yes / No list ──
  yesNoContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    ...SHADOW,
  },
  yesNoLabel: {
    fontSize: 17,
    fontFamily: FONTS.regular,
    color: "#333",
    flexShrink: 1,
    textAlign: "right",
  },
  yesNoButtonsRow: { flexDirection: "row", gap: 10, marginLeft: 10 },
  smallOptionBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#F4F6F7",
  },
  smallOptionText: { fontSize: 16, fontFamily: FONTS.regular, color: "#333" },

  // ── Rating ──
  ratingWrapper: { alignItems: "center", width: "100%", marginTop: 24 },
  ratingRow:     { flexDirection: "row", justifyContent: "center", gap: 14 },
  rateCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW,
  },
  selectedRate:     { backgroundColor: "#1A3C40", shadowOpacity: 0.2 },
  rateText:         { fontSize: 18, fontFamily: FONTS.regular, color: "#333" },
  selectedRateText: { color: "#fff", fontFamily: FONTS.bold },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 16,
  },
  subText: { fontSize: 13, color: "#777", fontFamily: FONTS.bold },

  // ── Social links ──
  socialContainer: { width: "100%", alignItems: "center" },
  socialInputRow: {
    flexDirection: "row-reverse",
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    alignItems: "center",
    paddingHorizontal: 14,
    ...SHADOW,
  },
  socialIcon:  { fontSize: 24, padding: 10 },
  socialInput: {
    flex: 1,
    paddingVertical: 17,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#333",
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 18,
  },

  // ── Footer ──
  footer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#E8EDEF",
  },
  nextBtnWrapper: { width: "72%", marginBottom: 12 },
  nextBtn: {
    backgroundColor: "#1A3C40",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    ...SHADOW,
    shadowOpacity: 0.2,
  },
  nextBtnDisabled:     { backgroundColor: "#C8D0D2", shadowOpacity: 0, elevation: 0 },
  nextBtnText:         { fontFamily: FONTS.bold, fontSize: 18, color: "#fff" },
  nextBtnTextDisabled: { color: "#9AABAD" },
  backBtn:  { paddingVertical: 6, paddingHorizontal: 10 },
  backLink: {
    textDecorationLine: "underline",
    color: "#888",
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
});

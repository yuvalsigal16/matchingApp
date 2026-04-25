import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  // ולידציה שה-Date באמת תקף (לא 31/02 וכד')
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

// המרת תאריך ל-ISO string ללא שעה (השרת מצפה ל-DATE)
function toIsoDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

const GENDER_HE_TO_DB = {
  גבר: "Male",
  אישה: "Female",
  // "הכל" → null (מותר ב-CHECK constraint)
};

export default function PreferencesQuizScreen({ navigation }) {
  const [prefStep, setPrefStep] = useState(1);
  const [tripData, setTripData] = useState({
    tripName: "",
    destination: "",
    startDate: "",
    endDate: "",
    recommendPeriod: false,
    preferredGender: "",
    ageRange: 25,
    interests: [], // עכשיו: מערך של interestID (מספרים) במקום שמות
  });

  // ── תחומי עניין מהשרת ──
  const [interestOptions, setInterestOptions] = useState([]);
  const [interestsLoading, setInterestsLoading] = useState(true);

  // ── מצב שליחה ──
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAllInterests();
        if (!cancelled) setInterestOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) console.warn("[PreferencesQuiz] interests load failed:", err.message);
      } finally {
        if (!cancelled) setInterestsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── שליחה ל-DB: Trip → TripPreferences → TripPreferenceInterests ──
  const submitFullTrip = async () => {
    const u = getUser();
    if (!u?.userID) {
      throw new Error("לא נמצא משתמש מחובר. נא להתחבר מחדש.");
    }

    // ולידציה: יעד + תאריכים תקינים
    const dest = (tripData.destination || "").trim();
    if (!dest) throw new Error("יש להזין יעד");

    const start = parseDDMMYY(tripData.startDate);
    const end = parseDDMMYY(tripData.endDate);
    if (!start) throw new Error("תאריך יציאה לא תקין (DD/MM/YY)");
    if (!end) throw new Error("תאריך חזרה לא תקין (DD/MM/YY)");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) throw new Error("תאריך יציאה חייב להיות בעתיד");
    if (end < start) throw new Error("תאריך חזרה לא יכול להיות לפני תאריך יציאה");

    // 1. יצירת Trip — מקבלים tripID
    const tripId = await createTrip({
      CreatedByUserID: u.userID,
      Destination: dest,
      StartDate: toIsoDateOnly(start),
      EndDate: toIsoDateOnly(end),
    });

    // 2. יצירת TripPreferences — מקבלים tripPreferenceID
    const ageNum = parseInt(tripData.ageRange, 10);
    const ageValid = !isNaN(ageNum) && ageNum > 0;
    const prefId = await createTripPreferences({
      TripID: tripId,
      PreferredGender: GENDER_HE_TO_DB[tripData.preferredGender] || null,
      PreferredAgeMin: ageValid ? ageNum : null,
      PreferredAgeMax: ageValid ? ageNum : null,
      // שאר השדות (IsSmoker/KeepsKosher/...) לא נאספים במסך הזה — null
      IsSmoker: null,
      KeepsKosher: null,
      KeepsShabbat: null,
      SpontaneityLevel: null,
      LifestyleLevel: null,
    });

    // 3. שיוך תחומי עניין ל-TripPreference
    if (Array.isArray(tripData.interests) && tripData.interests.length > 0) {
      await Promise.all(
        tripData.interests.map((interestId) =>
          addTripPreferenceInterest(prefId, interestId),
        ),
      );
    }
  };

  // פונקציית סיום - בודקת אם יש יעד ומנווטת בהתאם
  const handleFinishQuiz = async () => {
    if (submitting) return;

    if (!tripData.destination || tripData.destination.trim() === "") {
      // אם אין יעד - הולכים לגלגל המזל (Wheel ישמור את ה-Trip בסוף)
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
  };

  const nextStep = () => {
    // הוסר התנאי של חובת היעד
    setPrefStep((prev) => prev + 1);
  };

  const prevStep = () => setPrefStep((prev) => (prev > 1 ? prev - 1 : 1));

  // tripData.interests כעת מכיל interestID-ים (מספרים), לא שמות
  const toggleInterest = (interestId) => {
    const current = tripData.interests;
    const newList = current.includes(interestId)
      ? current.filter((i) => i !== interestId)
      : [...current, interestId];
    setTripData({ ...tripData, interests: newList });
  };

  const renderStepContent = () => {
    switch (prefStep) {
      case 1:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.mainTitle}>שאלון העדפות טיול</Text>
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 80 }}>🌍</Text>
            </View>
            <Text style={styles.subTitle}>בוא נתכנן את הטיול המושלם שלך!</Text>
            <TouchableOpacity style={styles.bigBtn} onPress={nextStep}>
              <Text style={styles.bigBtnText}>לתחילת השאלון</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.label}>שם הטיול שלי:</Text>
            <TextInput
              style={styles.input}
              placeholder="למשל: טיול שחרור לתאילנד"
              textAlign="right"
              onChangeText={(val) =>
                setTripData({ ...tripData, tripName: val })
              }
              value={tripData.tripName}
            />

            <Text style={styles.sectionLabel}>הקווים הכלליים של החופשה</Text>

            <TextInput
              style={styles.input}
              placeholder="יעד (אופציונלי)"
              textAlign="right"
              onChangeText={(val) =>
                setTripData({ ...tripData, destination: val })
              }
              value={tripData.destination}
            />

            <TextInput
              style={styles.input}
              placeholder="תאריך יציאה (DD/MM/YY)"
              textAlign="right"
              onChangeText={(val) =>
                setTripData({ ...tripData, startDate: val })
              }
              value={tripData.startDate}
            />

            <TextInput
              style={styles.input}
              placeholder="תאריך חזרה (DD/MM/YY)"
              textAlign="right"
              onChangeText={(val) => setTripData({ ...tripData, endDate: val })}
              value={tripData.endDate}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() =>
                setTripData({
                  ...tripData,
                  recommendPeriod: !tripData.recommendPeriod,
                })
              }
            >
              <Text style={{ marginRight: 10, fontSize: 16 }}>
                תמליץ לי על תקופה טובה לטיסה
              </Text>
              <View
                style={[
                  styles.miniSquare,
                  tripData.recommendPeriod && styles.checkedSquare,
                ]}
              >
                {tripData.recommendPeriod && (
                  <Text style={{ color: "#fff", fontSize: 14 }}>✓</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>בוא נבחר פרטנר</Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>הפרטנר המושלם עבורי</Text>

            <Text style={styles.label}>מגדר מועדף:</Text>
            <View style={styles.genderRow}>
              {["גבר", "אישה", "הכל"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.smallBtn,
                    tripData.preferredGender === g && styles.selectedBtn,
                  ]}
                  onPress={() =>
                    setTripData({ ...tripData, preferredGender: g })
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      tripData.preferredGender === g && styles.selectedText,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>גיל מועדף: {tripData.ageRange}</Text>
            <View style={styles.sliderLine}>
              <View
                style={[
                  styles.sliderDot,
                  { left: `${(tripData.ageRange - 18) * 1.5}%` },
                ]}
              />
              <TextInput
                keyboardType="numeric"
                style={styles.ageInput}
                onChangeText={(val) =>
                  setTripData({ ...tripData, ageRange: val })
                }
                placeholder="הקלד גיל"
                textAlign="center"
              />
            </View>

            <Text style={styles.label}>תחומי עניין:</Text>
            {interestsLoading ? (
              <ActivityIndicator color="#1A3C40" style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.interestsGrid}>
                {interestOptions.map((opt) => {
                  const isSelected = tripData.interests.includes(opt.interestID);
                  return (
                    <TouchableOpacity
                      key={opt.interestID}
                      style={[styles.tag, isSelected && styles.selectedBtn]}
                      onPress={() => toggleInterest(opt.interestID)}
                    >
                      <Text
                        style={[styles.tagText, isSelected && styles.selectedText]}
                      >
                        {opt.interestName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {submitError ? (
              <Text style={styles.errorText}>{submitError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
              onPress={handleFinishQuiz}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#1A3C40" />
              ) : (
                <Text style={styles.nextBtnText}>מוכנים למצוא התאמות</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>
      {prefStep > 1 && (
        <TouchableOpacity onPress={prevStep} style={styles.backPos}>
          <Text style={styles.backText}>חזרה</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// עיצובים נשארו ללא שינוי
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0E7E9" },
  scrollContent: { flexGrow: 1, padding: 20, alignItems: "center" },
  centerContent: { alignItems: "center", marginTop: 50 },
  mainTitle: { fontSize: 28, fontFamily: FONTS.extraBold, color: "#1A3C40" },
  imagePlaceholder: {
    marginVertical: 30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  subTitle: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 40,
  },
  bigBtn: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#1A3C40",
  },
  bigBtnText: { fontSize: 18, fontFamily: FONTS.bold },
  formContainer: { width: "100%", marginTop: 10 },
  sectionLabel: {
    fontSize: 18,
    textAlign: "right",
    marginBottom: 15,
    fontFamily: FONTS.bold,
  },
  label: {
    textAlign: "right",
    fontSize: 16,
    fontFamily: FONTS.regular,
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    textAlign: "right",
    fontFamily: FONTS.regular,
  },
  checkboxRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 25,
    alignSelf: "flex-end",
  },
  miniSquare: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#1A3C40",
    backgroundColor: "#fff",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkedSquare: { backgroundColor: "#1A3C40" },
  nextBtn: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#1A3C40",
    alignItems: "center",
  },
  nextBtnText: { fontFamily: FONTS.bold, fontSize: 16 },
  genderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  smallBtn: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    width: "30%",
    alignItems: "center",
  },
  selectedBtn: { backgroundColor: "#1A3C40", borderColor: "#1A3C40" },
  optionText: { fontSize: 16, fontFamily: FONTS.regular },
  selectedText: { color: "#fff", fontFamily: FONTS.extraBold },
  sliderLine: {
    width: "100%",
    height: 6,
    backgroundColor: "#ccc",
    marginVertical: 20,
    borderRadius: 3,
  },
  sliderDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1A3C40",
    position: "absolute",
    top: -9,
  },
  ageInput: { marginTop: 10, fontSize: 16, fontFamily: FONTS.bold },
  interestsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  tag: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  tagText: { fontSize: 14, fontFamily: FONTS.regular },
  backPos: { position: "absolute", bottom: 30, left: 30 },
  backText: {
    textDecorationLine: "underline",
    color: "#555",
    fontSize: 16,
    fontFamily: FONTS.regular,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginBottom: 12,
  },
});

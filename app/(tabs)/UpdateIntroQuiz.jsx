import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { Cigarette, CigaretteOff, MoonStar, UtensilsCrossed } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { addUserInterest, getAllInterests, getUserInterests, removeUserInterest } from "../src/api/interestService";
import { getQuestionnaire, updateQuestionnaire } from "../src/api/questionnaireService";
import { getUserProfile, updateUserProfile } from "../src/api/userProfileService";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

const GENDER_OPTIONS = [
  { label: "זכר", value: "Male" },
  { label: "נקבה", value: "Female" },
  { label: "אחר", value: "Other" },
];

// פורמט "DD/MM/YYYY" להצגה — תאריך הלידה במסך
function formatDate(d) {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// פורמט "YYYY-MM-DD" לשליחה לשרת — בלי המרת timezone (toISOString זז יום אחורה ב-UTC+)
function toLocalISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function UpdateIntroQuizScreen() {
  const router = useRouter();
  const userId = getUser()?.userID;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // ── State מאוחד לכל שדות השאלון ──
  // שדות פרופיל
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState(null);
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  // שאלון
  const [isSmoker, setIsSmoker] = useState(null);     // true/false/null
  const [keepsKosher, setKeepsKosher] = useState(null);
  const [keepsShabbat, setKeepsShabbat] = useState(null);
  const [spontaneity, setSpontaneity] = useState(0);    // 1..5
  const [lifestyle, setLifestyle] = useState(0);
  // שדות פנימיים שצריך לזכור כדי לשלוח חזרה ב-PUT
  const [profileMeta, setProfileMeta] = useState({});       // ProfileID + ProfileImage + LastUpdated
  const [questionnaireMeta, setQuestionnaireMeta] = useState({}); // QuestionnaireID + SocialNetworks
  // תחומי עניין
  const [allInterests, setAllInterests] = useState([]);   // [{ interestID, interestName }]
  const [selectedInterestIds, setSelectedInterestIds] = useState([]); // [interestID]
  const [originalInterestIds, setOriginalInterestIds] = useState([]); // לזיהוי הוספות/הסרות בעת השמירה

  // טעינה ראשונית של כל הנתונים מהשרת (במקביל) ──
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [profile, questionnaire, userInterests, allInts] = await Promise.all([
          getUserProfile(userId),
          getQuestionnaire(userId),
          getUserInterests(userId),
          getAllInterests(),
        ]);

        if (profile) {
          setFirstName(profile.firstName || "");
          setLastName(profile.lastName || "");
          setBirthDate(profile.birthDate ? new Date(profile.birthDate) : null);
          setCity(profile.city || "");
          setGender(profile.gender || "");
          setProfileMeta({
            ProfileID: profile.profileID,
            ProfileImage: profile.profileImage || null,
          });
        }

        if (questionnaire) {
          // log עוזר לאתר אי-התאמה בשמות שדות (camelCase מול PascalCase) אם יקרה
          console.log("[UpdateIntroQuiz] questionnaire from server:", questionnaire);
          // ננסה את שתי האפשרויות לשם השדה (camelCase של ASP.NET עם web defaults,
          // או PascalCase במקרה ש-config שונה הופעל)
          const spont = questionnaire.spontaneityLevel ?? questionnaire.SpontaneityLevel;
          const life = questionnaire.lifestyleLevel ?? questionnaire.LifestyleLevel;
          setIsSmoker(questionnaire.isSmoker ?? questionnaire.IsSmoker ?? null);
          setKeepsKosher(questionnaire.keepsKosher ?? questionnaire.KeepsKosher ?? null);
          setKeepsShabbat(questionnaire.keepsShabbat ?? questionnaire.KeepsShabbat ?? null);
          // Number() מבטיח השוואה תקינה ל-1..5 גם אם הערך מגיע כ-string
          setSpontaneity(spont != null ? Number(spont) : 0);
          setLifestyle(life != null ? Number(life) : 0);
          setQuestionnaireMeta({
            QuestionnaireID: questionnaire.questionnaireID ?? questionnaire.QuestionnaireID,
            SocialNetworks: questionnaire.socialNetworks ?? questionnaire.SocialNetworks ?? null,
          });
        }

        setAllInterests(allInts || []);
        const ids = (userInterests || []).map((i) => i.interestID);
        setSelectedInterestIds(ids);
        setOriginalInterestIds(ids);
      } catch (err) {
        Alert.alert("שגיאה", err.message || "טעינת השאלון נכשלה");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // ── שמירת השינויים — שולח בקשות PUT לשלוש הטבלאות + diff על תחומי עניין ──
  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !birthDate) {
      Alert.alert("שגיאה", "שם פרטי, שם משפחה ותאריך לידה הם שדות חובה");
      return;
    }

    setSaving(true);
    try {
      // 1) פרופיל
      await updateUserProfile({
        UserID: userId,
        FirstName: firstName.trim(),
        LastName: lastName.trim(),
        BirthDate: toLocalISODate(birthDate),
        Gender: gender || null,
        City: city.trim() || null,
        ProfileImage: profileMeta.ProfileImage,
      });

      // 2) שאלון
      await updateQuestionnaire({
        QuestionnaireID: questionnaireMeta.QuestionnaireID,
        UserID: userId,
        IsSmoker: isSmoker,
        KeepsKosher: keepsKosher,
        KeepsShabbat: keepsShabbat,
        SpontaneityLevel: spontaneity || null,
        LifestyleLevel: lifestyle || null,
        SocialNetworks: questionnaireMeta.SocialNetworks,
      });

      // 3) תחומי עניין: diff בין מה שהיה למה שיש עכשיו
      const toAdd = selectedInterestIds.filter((id) => !originalInterestIds.includes(id));
      const toRemove = originalInterestIds.filter((id) => !selectedInterestIds.includes(id));
      await Promise.all([
        ...toAdd.map((id) => addUserInterest(userId, id)),
        ...toRemove.map((id) => removeUserInterest(userId, id)),
      ]);

      Alert.alert("נשמר", "השאלון עודכן בהצלחה", [
        { text: "אישור", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("שגיאה בשמירה", err.message || "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  // ── פונקציית עזר: הצגת שורת שאלון "כן/לא" עם אייקון ──
  const renderYesNo = (label, Icon, value, onChange) => (
    <View style={styles.yesNoCard}>
      <View style={styles.yesNoLabelRow}>
        {Icon && <Icon size={20} color={COLORS.brand} strokeWidth={2} />}
        <Text style={styles.yesNoLabel}>{label}</Text>
      </View>
      <View style={styles.yesNoBtns}>
        <Pressable
          style={[styles.smallBtn, value === true && styles.smallBtnActive]}
          onPress={() => onChange(true)}
        >
          <Text style={[styles.smallBtnText, value === true && styles.smallBtnTextActive]}>כן</Text>
        </Pressable>
        <Pressable
          style={[styles.smallBtn, value === false && styles.smallBtnActive]}
          onPress={() => onChange(false)}
        >
          <Text style={[styles.smallBtnText, value === false && styles.smallBtnTextActive]}>לא</Text>
        </Pressable>
      </View>
    </View>
  );

  // ── Rating 1..5: 5 כפתורים עגולים, הנבחר נצבע כהה ──
  const renderRating = (value, onChange) => (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          style={[styles.ratingDot, value === n && styles.ratingDotActive]}
          onPress={() => onChange(n)}
        >
          <Text style={[styles.ratingNumber, value === n && styles.ratingNumberActive]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header עם חץ חזרה */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>עדכון שאלון היכרות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── פרטים אישיים ── */}
        <Text style={styles.section}>פרטים אישיים</Text>

        <Text style={styles.label}>שם פרטי</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          textAlign="right"
          placeholder="שם פרטי"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>שם משפחה</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          textAlign="right"
          placeholder="שם משפחה"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>תאריך לידה</Text>
        <Pressable style={styles.dateBtn} onPress={() => setDatePickerOpen(true)}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
          <Text style={[styles.dateText, !birthDate && styles.placeholder]}>
            {birthDate ? formatDate(birthDate) : "בחר/י תאריך"}
          </Text>
        </Pressable>
        {datePickerOpen && (
          <DateTimePicker
            value={birthDate || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={(event, date) => {
              setDatePickerOpen(Platform.OS === "ios");
              if (event.type === "set" && date) setBirthDate(date);
            }}
          />
        )}

        <Text style={styles.label}>מקום מגורים</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          textAlign="right"
          placeholder="עיר מגורים"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>מגדר</Text>
        <View style={styles.segmented}>
          {GENDER_OPTIONS.map((opt) => {
            const selected = gender === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.segment, selected && styles.segmentActive]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── אורח חיים ── */}
        <Text style={styles.section}>אורח חיים</Text>

        <View style={styles.smokingRow}>
          <Pressable
            style={[styles.smokingBtn, isSmoker === true && styles.smokingBtnActive]}
            onPress={() => setIsSmoker(true)}
          >
            <Cigarette size={22} color={isSmoker === true ? COLORS.onBrand : COLORS.brand} />
            <Text style={[styles.smokingText, isSmoker === true && styles.smokingTextActive]}>
              מעשן/ת
            </Text>
          </Pressable>
          <Pressable
            style={[styles.smokingBtn, isSmoker === false && styles.smokingBtnActive]}
            onPress={() => setIsSmoker(false)}
          >
            <CigaretteOff size={22} color={isSmoker === false ? COLORS.onBrand : COLORS.brand} />
            <Text style={[styles.smokingText, isSmoker === false && styles.smokingTextActive]}>
              לא מעשן/ת
            </Text>
          </Pressable>
        </View>

        {renderYesNo("שומר/ת שבת?", MoonStar, keepsShabbat, setKeepsShabbat)}
        {renderYesNo("שומר/ת כשרות?", UtensilsCrossed, keepsKosher, setKeepsKosher)}

        {/* ── רמות (1..5) ── */}
        <Text style={styles.section}>רמות</Text>

        <Text style={styles.label}>כמה ספונטני/ת?</Text>
        <Text style={styles.helpText}>1 = אולי בפעם אחרת   ·   5 = מי טס מחר?</Text>
        {renderRating(spontaneity, setSpontaneity)}

        <Text style={[styles.label, { marginTop: 16 }]}>אורח החיים בטיול</Text>
        <Text style={styles.helpText}>1 = פשוט   ·   5 = יוקרתי</Text>
        {renderRating(lifestyle, setLifestyle)}

        {/* ── תחומי עניין ── */}
        <Text style={styles.section}>תחומי עניין</Text>
        <View style={styles.tagsGrid}>
          {allInterests.map((it) => {
            const selected = selectedInterestIds.includes(it.interestID);
            return (
              <Pressable
                key={it.interestID}
                style={[styles.tag, selected && styles.tagActive]}
                onPress={() => {
                  setSelectedInterestIds((prev) =>
                    selected
                      ? prev.filter((id) => id !== it.interestID)
                      : [...prev, it.interestID],
                  );
                }}
              >
                <Text style={[styles.tagText, selected && styles.tagTextActive]}>
                  {it.interestName}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* כפתור שמירה — sticky בתחתית */}
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

  label: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 6,
    marginTop: 8,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginBottom: 8,
  },

  input: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: 4,
  },

  dateBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: COLORS.text,
  },
  placeholder: { color: COLORS.textMuted },

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
  segmentTextActive: { color: COLORS.onBrand, fontFamily: FONTS.bold },

  smokingRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 12 },
  smokingBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    borderRadius: 12,
  },
  smokingBtnActive: { backgroundColor: COLORS.brand },
  smokingText: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.brand },
  smokingTextActive: { color: COLORS.onBrand, fontFamily: FONTS.bold },

  yesNoCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  yesNoLabelRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  yesNoLabel: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.brand },
  yesNoBtns: { flexDirection: "row", gap: 8 },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  smallBtnActive: { backgroundColor: COLORS.brand },
  smallBtnText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.brand },
  smallBtnTextActive: { color: COLORS.onBrand, fontFamily: FONTS.bold },

  ratingRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 8 },
  ratingDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDotActive: { backgroundColor: COLORS.brand },
  ratingNumber: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.brand },
  ratingNumberActive: { color: COLORS.surface },

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
  tagTextActive: { color: COLORS.onBrand, fontFamily: FONTS.bold },

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

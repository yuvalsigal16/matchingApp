import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiLogin } from "../api/authService";
import { getUserProfile } from "../api/userProfileService";
import { setAuth } from "../auth/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../theme/fonts";

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
const isValidPassword = (val) => val.length >= 6;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = () =>
    setEmailError(
      !email ? "שדה חובה" : !isValidEmail(email) ? "כתובת אימייל לא תקינה" : "",
    );

  const validatePassword = () =>
    setPasswordError(
      !password
        ? "שדה חובה"
        : !isValidPassword(password)
          ? "סיסמה חייבת להכיל לפחות 6 תווים"
          : "",
    );

  const handleLogin = async () => {
    validateEmail();
    validatePassword();
    if (!isValidEmail(email) || !isValidPassword(password)) return;

    setApiError("");
    setIsLoading(true);
    try {
      const { token, user } = await apiLogin(email, password);
      setAuth(token, user);

      // ניתוב חכם: אם יש פרופיל — Home. אם לא — להמשיך את ההרשמה דרך השאלון.
      // replace במקום navigate כדי שהמסך הזה יוסר מהמחסנית ו-back לא יחזיר לכאן.
      // השרת מחזיר camelCase (userID ולא UserID).
      const profile = await getUserProfile(user.userID);
      if (profile) {
        navigation.replace("Home");
      } else {
        navigation.replace("QuizStart");
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => console.log("Forgot password");

  return (
    // SafeAreaView - מוודא שהתוכן לא נחסם על ידי ה-notch או סרגל הניווט
    <SafeAreaView style={styles.safe}>
      {/* KeyboardAvoidingView - מזיז את כל התוכן כלפי מעלה כשהמקלדת עולה
          ב-iOS משתמשים ב-"padding", באנדרואיד לא צריך (undefined) */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ScrollView - מאפשר גלילה אם התוכן לא נכנס למסך
        keyboardShouldPersistTaps="handled" - לחיצה על כפתור סוגרת את המקלדת */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false} // מסתיר את פס הגלילה
        >
          {/* ── כותרת ראשית ── */}
          <Text style={styles.title}>כיף שחזרת</Text>

          {/* ── טופס הכניסה ── */}
          <View style={styles.form}>
            {/* שדה אימייל:
          - style משנה את המראה לאדום אם יש שגיאה (emailError)
          - onChangeText מעדכן את הstate ומנקה שגיאה בכל הקלדה
          - onBlur מפעיל בדיקת תקינות כשהמשתמש עוזב את השדה
          - keyboardType="email-address" פותח מקלדת מתאימה לאימייל */}
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="כתובת אימייל"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError("");
              }}
              onBlur={validateEmail}
              keyboardType="email-address"
              autoCapitalize="none" // לא מגדיל אות ראשונה אוטומטית
              autoCorrect={false} // מבטל תיקון אוטומטי
              textAlign="right" // כיוון הטקסט לימין (עברית)
            />
            {/* מציג הודעת שגיאה מתחת לשדה רק אם יש שגיאה */}
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            {/* ── שדה סיסמה עם כפתור הצגה/הסתרה ── */}
            {/* View חיצוני מדמה את גבול השדה, כולל את הקלט ואת אייקון העין */}
            <View
              style={[
                styles.passwordWrapper,
                passwordError ? styles.inputError : null,
              ]}
            >
              {/* כפתור העין - לחיצה עליו מחליפה בין הצגה להסתרת הסיסמה */}
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)} // הופך את הערך הבוליאני
                activeOpacity={0.7}
                style={styles.eyeBtn}
              >
                {/* אייקון עין - משתנה בהתאם למצב הצגת הסיסמה */}
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"} // עין פתוחה או סגורה
                  size={22}
                  color="#CCCCCC" // אפור בהיר
                />
              </TouchableOpacity>

              {/* שדה הקלט של הסיסמה:
                  - secureTextEntry מסתיר את הטקסט כנקודות כשהערך הוא true */}
              <TextInput
                style={styles.passwordInput}
                placeholder="סיסמה"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setPasswordError("");
                }}
                onBlur={validatePassword}
                secureTextEntry={!showPassword} // true = מוסתר, false = גלוי
                textAlign="right"
              />
            </View>
            {/* מציג הודעת שגיאה מתחת לשדה הסיסמה רק אם יש שגיאה */}
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* ── שורת שכחת סיסמה ── */}
          {/* View עם justifyContent="center" שומר את שני הטקסטים ממורכזים */}
          <View style={styles.centeredRow}>
            {/* כפתור "לחץ כאן" - לחיצה תפעיל את handleForgotPassword */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>לחץ כאן</Text>
            </TouchableOpacity>
            {/* טקסט סטטי שמוצג לצד הכפתור */}
            <Text style={styles.mutedText}>שכחת סיסמה? </Text>
          </View>

          {apiError ? (
            <Text style={styles.apiErrorText}>{apiError}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>התחבר</Text>
            )}
          </TouchableOpacity>

          {/* ── שורת הרשמה ── */}
          {/* לחיצה על "הירשם" מנווטת למסך ההרשמה באמצעות navigation.navigate */}
          <View style={styles.centeredRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>הירשם</Text>
            </TouchableOpacity>
            <Text style={styles.mutedText}>אין לך חשבון? </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── הגדרת העיצובים (Styles) ──
// StyleSheet.create מייעל את הביצועים על ידי עיבוד הסטיילים פעם אחת
const styles = StyleSheet.create({
  // עיצוב המיכל הראשי - מלא את כל המסך, רקע לבן
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // עיצוב תוכן ה-ScrollView - מרכז אלמנטים, מרווחים פנימיים מכל הכיוונים
  scroll: {
    alignItems: "center", // מרכז אופקית
    paddingHorizontal: 28, // ריווח מימין ושמאל
    paddingBottom: 48, // ריווח מלמטה כדי שהתוכן לא ידבק לתחתית
    paddingTop: 40, // ריווח מלמעלה
  },

  // עיצוב כותרת "ברוכים הבאים"
  title: {
    fontSize: 32, // גודל טקסט גדול
    fontFamily: FONTS.extraBold,
    color: "#111", // כמעט שחור
    textAlign: "center", // ממורכז
    marginBottom: 36, // רווח מתחת לכותרת
  },

  title2: {
    color: "#666",
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center", // ממורכז
    marginBottom: 36, // רווח מתחת לכותרת
  },

  // עיצוב מיכל הטופס - רוחב מלא עם מרווח קטן מלמטה
  form: {
    width: "100%",
    marginBottom: 6,
  },

  // עיצוב שדה האימייל
  input: {
    width: "100%",
    height: 54, // גובה קבוע לנוחות לחיצה
    borderRadius: 30, // פינות מעוגלות לגמרי (כמו כדור)
    borderWidth: 1.5, // עובי המסגרת
    borderColor: "#ddd", // צבע מסגרת אפור בהיר
    paddingHorizontal: 20, // ריווח פנימי מימין ושמאל
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: "#222",
    marginBottom: 6,
    backgroundColor: "#fafafa", // רקע לבן-אפרפר עדין
  },

  // עיצוב המיכל החיצוני של שדה הסיסמה (מכיל גם את אייקון העין)
  passwordWrapper: {
    flexDirection: "row", // סידור פנימי אופקי (עין + קלט בשורה)
    alignItems: "center", // יישור אנכי למרכז
    width: "100%",
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  // עיצוב שדה הקלט של הסיסמה (ללא גבול, כי הגבול על ה-wrapper)
  passwordInput: {
    flex: 1, // תופס את כל השטח הנותר בשורה
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: "#222",
    height: "100%",
  },

  // עיצוב כפתור אייקון העין - ריווח קטן כדי שיהיה נוח ללחיצה
  eyeBtn: {
    padding: 6,
  },

  // עיצוב מסגרת אדומה - מוחלת על שדה שיש בו שגיאה
  inputError: {
    borderColor: "#e74c3c", // אדום
  },

  // עיצוב טקסט הודעת שגיאה מתחת לשדה
  errorText: {
    color: "#e74c3c", // אדום
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginBottom: 8,
    marginRight: 8,
  },

  // עיצוב שורה ממורכזת (שכחת סיסמה / אין לך חשבון)
  centeredRow: {
    flexDirection: "row", // אלמנטים בשורה אחת
    justifyContent: "center", // ממורכזים לאמצע
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },

  // עיצוב הטקסט הרגיל בשורות הממורכזות (אפור)
  mutedText: {
    color: "#666",
    fontSize: 14,
    fontFamily: FONTS.regular,
  },

  // עיצוב הטקסט הלחיץ בשורות הממורכזות (כחול, מודגש)
  linkText: {
    color: "#1E90FF", // כחול בהיר
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  // עיצוב כפתור "התחבר"
  loginButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#111", // שחור
    borderRadius: 30,
    justifyContent: "center", // טקסט ממורכז אנכית
    alignItems: "center", // טקסט ממורכז אופקית
    marginTop: 20,
    marginBottom: 4,
    // צל עדין לתחושת עומק
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4, // צל באנדרואיד
  },

  loginButtonDisabled: {
    backgroundColor: "#555",
    shadowOpacity: 0,
    elevation: 0,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },

  apiErrorText: {
    color: "#e74c3c",
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },

  socialLabel: {
    fontSize: 15,
    color: "#222",
    fontFamily: FONTS.bold,
  },
});

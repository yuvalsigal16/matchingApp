import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { apiLogin, apiRegister } from "../src/api/authService";
import { setAuth } from "../src/auth/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS } from "../src/theme";

// ── פונקציות בדיקת תקינות ──

// בודקת פורמט אימייל תקני (חייב להכיל @ ונקודה אחריה)
const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

// בודקת שהסיסמה מכילה לפחות 6 תווים
const isValidPassword = (val) => val.length >= 6;

// בודקת שאימות הסיסמה זהה לסיסמה המקורית
const isPasswordMatch = (pass, confirm) => pass === confirm;

// ── קומפוננטת שדה סיסמה עם אייקון עין ──
// מקבלת: value, onChangeText, onBlur, showPassword, toggleShow, placeholder, hasError
const PasswordField = ({
  value,
  onChangeText,
  onBlur,
  showPassword,
  toggleShow,
  placeholder,
  hasError,
}) => (
  // המיכל החיצוני מדמה את גבול השדה ומכיל גם את אייקון העין
  <View style={[styles.passwordWrapper, hasError ? styles.inputError : null]}>
    {/* כפתור העין - הופך את מצב הצגת הסיסמה */}
    <TouchableOpacity
      onPress={toggleShow}
      activeOpacity={0.7}
      style={styles.eyeBtn}
    >
      <Ionicons
        name={showPassword ? "eye-outline" : "eye-off-outline"} // עין פתוחה = גלוי, סגורה = מוסתר
        size={22}
        color={COLORS.textMuted}
      />
    </TouchableOpacity>
    {/* שדה הקלט עצמו - secureTextEntry שולט אם הטקסט מוסתר */}
    <TextInput
      style={styles.passwordInput}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      secureTextEntry={!showPassword} // true = מוסתר, false = גלוי
      textAlign="right"
    />
  </View>
);

// ── הקומפוננטה הראשית של מסך ההרשמה ──
export default function RegisterScreen() {
  const router = useRouter();
  // ── State לשדות הקלט ──
  const [email, setEmail] = useState(""); // כתובת אימייל
  const [password, setPassword] = useState(""); // סיסמה
  const [confirm, setConfirm] = useState(""); // אימות סיסמה

  // ── State להצגת/הסתרת סיסמאות ──
  const [showPassword, setShowPassword] = useState(false); // שדה סיסמה
  const [showConfirm, setShowConfirm] = useState(false); // שדה אימות סיסמה

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── פונקציות בדיקה — רצות כשהמשתמש עוזב שדה (onBlur) ──

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

  const validateConfirm = () =>
    setConfirmError(
      !confirm
        ? "שדה חובה"
        : !isPasswordMatch(password, confirm)
          ? "הסיסמאות אינן תואמות"
          : "",
    );

  const handleRegister = async () => {

    //בדיקות UI בלבד
    //להציג שגיאות למשתמש על המסך
    validateEmail();
    validatePassword();
    validateConfirm();

    //תפקיד הבדיקה היא לעצור שליחה לשרת אם הנתונים לא תקינים
    if (
      !isValidEmail(email) ||
      !isValidPassword(password) ||
      !isPasswordMatch(password, confirm)
    )
      return;

    setApiError("");
    setIsLoading(true);
    try {
      //הרשמת המשתמש
      await apiRegister(email, password);
      //התחברות אוטומטית אחרי הרשמה
      const { token, user } = await apiLogin(email, password);
      setAuth(token, user);
      router.replace("/QuizStartScreen");
    } catch (err) {
      setApiError(err.message);
    } finally {
      //לבטל/לאפס מצב טעינה
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* KeyboardAvoidingView — מזיז תוכן למעלה כשהמקלדת עולה */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ScrollView — מאפשר גלילה, שימושי כשהטופס ארוך */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          {/* ── כותרת ראשית ── */}
          <Text style={styles.title}>צור חשבון</Text>

          {/* ── טופס הרשמה ── */}
          <View style={styles.form}>
            {/* שדה אימייל */}
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="כתובת אימייל"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError("");
              }}
              onBlur={validateEmail}
              keyboardType="email-address" 
              autoCapitalize="none" 
              autoCorrect={false}
              textAlign="right"
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            {/* שדה סיסמה עם עין */}
            <PasswordField
              placeholder="סיסמה (לפחות 6 תווים)"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setPasswordError("");
              }}
              onBlur={validatePassword}
              showPassword={showPassword}
              toggleShow={() => setShowPassword((p) => !p)}
              hasError={!!passwordError}
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            {/* שדה אימות סיסמה עם עין */}
            <PasswordField
              placeholder="אימות סיסמה"
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                setConfirmError("");
              }}
              onBlur={validateConfirm}
              showPassword={showConfirm}
              toggleShow={() => setShowConfirm((p) => !p)}
              hasError={!!confirmError}
            />
            {confirmError ? (
              <Text style={styles.errorText}>{confirmError}</Text>
            ) : null}
          </View>

          {apiError ? (
            <Text style={styles.apiErrorText}>{apiError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.mainButton, isLoading && styles.mainButtonDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.onBrand} />
            ) : (
              <Text style={styles.mainButtonText}>הירשם</Text>
            )}
          </TouchableOpacity>

          {/* ── שורת ניווט ל-Login ── */}
          {/* View ממורכז עם שני אלמנטים בשורה אחת */}
          <View style={styles.centeredRow}>
            <TouchableOpacity
              onPress={() => router.replace("/Login")}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>התחבר</Text>
            </TouchableOpacity>
            <Text style={styles.mutedText}>כבר יש לך חשבון? </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── עיצובים — זהים ל-Login לשמירה על עקביות ──
const styles = StyleSheet.create({
  // מיכל ראשי — מלא את כל המסך, רקע לבן
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // תוכן ה-ScrollView — ממורכז אנכית במסך
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

  // כותרת "צור חשבון"
  title: {
    fontSize: 32,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 36,
  },

  // מיכל הטופס — רוחב מלא
  form: {
    width: "100%",
    marginBottom: 6,
  },

  // שדות קלט רגילים (שם, אימייל)
  input: {
    width: "100%",
    height: 54,
    borderRadius: 30, // פינות מעוגלות לגמרי
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: 6,
    backgroundColor: COLORS.surface,
  },

  // מיכל שדה סיסמה (כולל אייקון עין)
  passwordWrapper: {
    flexDirection: "row", // אייקון + קלט בשורה אחת
    alignItems: "center",
    width: "100%",
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  // שדה הקלט בתוך passwordWrapper
  passwordInput: {
    flex: 1, // תופס את כל השטח הפנוי
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    height: "100%",
  },

  // כפתור אייקון העין
  eyeBtn: {
    padding: 6,
  },

  // מסגרת אדומה — מוחלת כשיש שגיאה בשדה
  inputError: {
    borderColor: COLORS.danger,
  },

  // טקסט הודעת שגיאה
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginBottom: 8,
    marginRight: 8,
  },

  // כפתור "הירשם" הראשי — זהה ל-loginButton
  mainButton: {
    width: "100%",
    height: 54,
    backgroundColor: COLORS.brand,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  // טקסט בתוך כפתור "הירשם"
  mainButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },

  mainButtonText: {
    color: COLORS.onBrand,
    fontSize: 17,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },

  apiErrorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },

  // שורה ממורכזת (ניווט ל-Login)
  centeredRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },

  // טקסט אפור ("כבר יש לך חשבון?")
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },

  // טקסט לחיץ ("התחבר")
  linkText: {
    color: COLORS.brand,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

});

// ייבוא אייקונים מספריית vector-icons של Expo
import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";

// ייבוא React ו-useState לניהול מצב הקומפוננטה
import React, { useState } from "react";

// ייבוא רכיבי UI בסיסיים מ-React Native
import {
  KeyboardAvoidingView, // מזיז תוכן כלפי מעלה כשהמקלדת נפתחת
  Platform, // מזהה iOS / Android
  ScrollView, // מאפשר גלילה אם התוכן ארוך
  StyleSheet, // הגדרת עיצובים
  Text, // הצגת טקסט
  TextInput, // שדה קלט
  TouchableOpacity, // כפתור עם אפקט לחיצה
  View, // מיכל/קופסה
} from "react-native";

// מוודא שהתוכן לא נחסם על ידי notch או סרגל ניווט
import { SafeAreaView } from "react-native-safe-area-context";

// ── פונקציות בדיקת תקינות ──

// בודקת שהשם לא ריק ומכיל לפחות 2 תווים
const isValidName = (val) => val.trim().length >= 2;

// בודקת פורמט אימייל תקני (חייב להכיל @ ונקודה אחריה)
const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

// בודקת שהסיסמה מכילה לפחות 6 תווים
const isValidPassword = (val) => val.length >= 6;

// בודקת שאימות הסיסמה זהה לסיסמה המקורית
const isPasswordMatch = (pass, confirm) => pass === confirm;

// ── קומפוננטת כפתור סושיאל (זהה ל-Login) ──
// מקבלת label (טקסט) ו-iconComponent (אייקון מוכן)
const SocialButton = ({ label, iconComponent }) => (
  <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
    {/* שורה פנימית עם אייקון וטקסט ממורכזים */}
    <View style={styles.socialInner}>
      {iconComponent}
      <Text style={styles.socialLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

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
        color="#CCCCCC" // אפור בהיר
      />
    </TouchableOpacity>
    {/* שדה הקלט עצמו - secureTextEntry שולט אם הטקסט מוסתר */}
    <TextInput
      style={styles.passwordInput}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      secureTextEntry={!showPassword} // true = מוסתר, false = גלוי
      textAlign="right"
    />
  </View>
);

// ── הקומפוננטה הראשית של מסך ההרשמה ──
export default function RegisterScreen({ navigation }) {
  // ── State לשדות הקלט ──
  const [name, setName] = useState(""); // שם מלא
  const [email, setEmail] = useState(""); // כתובת אימייל
  const [password, setPassword] = useState(""); // סיסמה
  const [confirm, setConfirm] = useState(""); // אימות סיסמה

  // ── State להצגת/הסתרת סיסמאות ──
  const [showPassword, setShowPassword] = useState(false); // שדה סיסמה
  const [showConfirm, setShowConfirm] = useState(false); // שדה אימות סיסמה

  // ── State להודעות שגיאה (ריק = אין שגיאה) ──
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // ── פונקציות בדיקה — רצות כשהמשתמש עוזב שדה (onBlur) ──

  const validateName = () =>
    setNameError(
      !name
        ? "שדה חובה"
        : !isValidName(name)
          ? "שם חייב להכיל לפחות 2 תווים"
          : "",
    );

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

  // ── פונקציית הרשמה — רצה בלחיצה על "הירשם" ──
  const handleRegister = () => {
    // מפעיל את כל הבדיקות
    validateName();
    validateEmail();
    validatePassword();
    validateConfirm();

    // אם אחד מהשדות לא תקין — עוצר ולא ממשיך
    if (
      !isValidName(name) ||
      !isValidEmail(email) ||
      !isValidPassword(password) ||
      !isPasswordMatch(password, confirm)
    )
      return;

    // אם הכל תקין — מדפיס לקונסול (כאן תוסיפי קריאה לשרת בעתיד)
    console.log("Register:", { name, email, password });
    navigation.navigate("QuizStart");
  };

  return (
    // SafeAreaView — שומר שהתוכן לא ייחסם על ידי ה-notch
    <SafeAreaView style={styles.safe}>
      {/* KeyboardAvoidingView — מזיז תוכן למעלה כשהמקלדת עולה */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ScrollView — מאפשר גלילה, שימושי כשהטופס ארוך */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled" // לחיצה על כפתור סוגרת מקלדת
          showsVerticalScrollIndicator={false}
        >
          {/* ── כותרת ראשית ── */}
          <Text style={styles.title}>צור חשבון</Text>

          {/* ── טופס הרשמה ── */}
          <View style={styles.form}>
            {/* שדה שם מלא */}
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="שם מלא"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameError("");
              }}
              onBlur={validateName}
              autoCorrect={false}
              textAlign="right"
            />
            {/* הודעת שגיאה — מוצגת רק אם יש שגיאה */}
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}

            {/* שדה אימייל */}
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
              keyboardType="email-address" // מקלדת מותאמת לאימייל
              autoCapitalize="none" // ללא הגדלת אות ראשונה
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

          {/* ── כפתור הרשמה ראשי ── */}
          <TouchableOpacity
            style={styles.mainButton}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.mainButtonText}>הירשם</Text>
          </TouchableOpacity>

          {/* ── שורת ניווט ל-Login ── */}
          {/* View ממורכז עם שני אלמנטים בשורה אחת */}
          <View style={styles.centeredRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>התחבר</Text>
            </TouchableOpacity>
            <Text style={styles.mutedText}>כבר יש לך חשבון? </Text>
          </View>

          {/* ── מפריד "או" ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>או</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── כפתורי כניסה חברתית ── */}
          <SocialButton
            label="הירשם עם Google"
            iconComponent={
              <AntDesign name="google" size={20} color="#DB4437" />
            }
          />
          <SocialButton
            label="הירשם עם Facebook"
            iconComponent={
              <FontAwesome name="facebook" size={20} color="#1877F2" />
            }
          />
          <SocialButton
            label="הירשם עם Apple"
            iconComponent={<AntDesign name="apple" size={20} color="#000" />}
          />
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
    backgroundColor: "#fff",
  },

  // תוכן ה-ScrollView — ממורכז עם ריווחים
  scroll: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 40,
  },

  // כותרת "צור חשבון"
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
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
    borderColor: "#ddd",
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#222",
    marginBottom: 6,
    backgroundColor: "#fafafa",
  },

  // מיכל שדה סיסמה (כולל אייקון עין)
  passwordWrapper: {
    flexDirection: "row", // אייקון + קלט בשורה אחת
    alignItems: "center",
    width: "100%",
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  // שדה הקלט בתוך passwordWrapper
  passwordInput: {
    flex: 1, // תופס את כל השטח הפנוי
    fontSize: 16,
    color: "#222",
    height: "100%",
  },

  // כפתור אייקון העין
  eyeBtn: {
    padding: 6,
  },

  // מסגרת אדומה — מוחלת כשיש שגיאה בשדה
  inputError: {
    borderColor: "#e74c3c",
  },

  // טקסט הודעת שגיאה
  errorText: {
    color: "#e74c3c",
    fontSize: 12,
    textAlign: "right",
    marginBottom: 8,
    marginRight: 8,
  },

  // כפתור "הירשם" הראשי — זהה ל-loginButton
  mainButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#111", // שחור
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  // טקסט בתוך כפתור "הירשם"
  mainButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
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
    color: "#666",
    fontSize: 14,
  },

  // טקסט לחיץ כחול ("התחבר")
  linkText: {
    color: "#1E90FF",
    fontSize: 14,
    fontWeight: "700",
  },

  // שורת מפריד "או"
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 22,
  },

  // קו אופקי משני צדי ה"או"
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e8e8e8",
  },

  // טקסט "או"
  dividerText: {
    marginHorizontal: 14,
    color: "#aaa",
    fontSize: 13,
    fontWeight: "500",
  },

  // כפתורי סושיאל — זהים ל-Login
  socialButton: {
    width: "100%",
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  // שורה פנימית של כפתור סושיאל (אייקון + טקסט)
  socialInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10, // רווח אחיד בין האייקון לטקסט
  },

  // טקסט בתוך כפתורי סושיאל
  socialLabel: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
  },
});

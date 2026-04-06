// ייבוא אייקונים מספריית vector-icons של Expo:
// AntDesign - לאייקוני Google ו-Apple
// FontAwesome - לאייקון Facebook
// Ionicons - לאייקון העין (הצגה/הסתרת סיסמה)
import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";

// ייבוא React ו-useState - useState מאפשר לנו לשמור ולעדכן מידע בתוך הקומפוננטה
import React, { useState } from "react";

// ייבוא רכיבי UI בסיסיים מ-React Native:
import {
  KeyboardAvoidingView, // מזיז את התוכן למעלה כשהמקלדת נפתחת, כדי שהשדות לא יוסתרו
  Platform, // מאפשר לזהות אם המכשיר הוא iOS או Android
  ScrollView, // מאפשר גלילה אם התוכן ארוך מהמסך
  StyleSheet, // מאפשר להגדיר עיצובים (styles) בצורה מסודרת
  Text, // מציג טקסט על המסך
  TextInput, // שדה קלט שבו המשתמש יכול להקליד
  TouchableOpacity, // כפתור שמגיב ללחיצה עם אפקט עמעום
  View, // קופסה/מיכל בסיסית לעיצוב ומיקום אלמנטים
} from "react-native";

// SafeAreaView - מוודא שהתוכן לא נכנס לאזורים חסומים כמו ה-notch או סרגל הניווט
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../theme/fonts";

// ── פונקציות בדיקת תקינות ──

// בודקת אם כתובת האימייל בפורמט תקין (חייבת להכיל @ ונקודה אחרי)
const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

// בודקת שהסיסמה מכילה לפחות 6 תווים
const isValidPassword = (val) => val.length >= 6;

// ── קומפוננטת כפתור סושיאל ──
// מקבלת: label (טקסט הכפתור) ו-iconComponent (אייקון מוכן)
// מציגה כפתור עם אייקון וטקסט ממורכזים זה לצד זה
const SocialButton = ({ label, iconComponent }) => (
  <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
    {/* מיכל פנימי שמסדר את האייקון והטקסט בשורה אחת ממורכזת */}
    <View style={styles.socialInner}>
      {iconComponent} {/* האייקון של הרשת החברתית */}
      <Text style={styles.socialLabel}>{label}</Text> {/* שם הרשת החברתית */}
    </View>
  </TouchableOpacity>
);

// ── הקומפוננטה הראשית של מסך ההתחברות ──
// מקבלת navigation - אובייקט שמאפשר מעבר בין מסכים
export default function LoginScreen({ navigation }) {
  // שמירת הטקסט שהמשתמש הקליד בשדה האימייל
  const [email, setEmail] = useState("");

  // שמירת הטקסט שהמשתמש הקליד בשדה הסיסמה
  const [password, setPassword] = useState("");

  // האם להציג את הסיסמה כטקסט רגיל (true) או כנקודות (false)
  const [showPassword, setShowPassword] = useState(false);

  // הודעת שגיאה לשדה האימייל - ריקה אם אין שגיאה
  const [emailError, setEmailError] = useState("");

  // הודעת שגיאה לשדה הסיסמה - ריקה אם אין שגיאה
  const [passwordError, setPasswordError] = useState("");

  // בדיקת תקינות לאימייל - רץ כשהמשתמש עוזב את השדה (onBlur)
  // אם ריק → "שדה חובה", אם פורמט לא תקין → הודעת שגיאה, אחרת מנקה את השגיאה
  const validateEmail = () =>
    setEmailError(
      !email ? "שדה חובה" : !isValidEmail(email) ? "כתובת אימייל לא תקינה" : "",
    );

  // בדיקת תקינות לסיסמה - רץ כשהמשתמש עוזב את השדה (onBlur)
  // אם ריקה → "שדה חובה", אם קצרה מדי → הודעת שגיאה, אחרת מנקה את השגיאה
  const validatePassword = () =>
    setPasswordError(
      !password
        ? "שדה חובה"
        : !isValidPassword(password)
          ? "סיסמה חייבת להכיל לפחות 6 תווים"
          : "",
    );

  // פונקציה שרצה כשלוחצים על "התחבר"
  const handleLogin = () => {
    validateEmail(); // מפעיל בדיקת תקינות לאימייל
    validatePassword(); // מפעיל בדיקת תקינות לסיסמה
    // אם אחד השדות לא תקין - עוצר ולא ממשיך
    if (!isValidEmail(email) || !isValidPassword(password)) return;
    // אם הכל תקין - מדפיס לקונסול ועובר למסך הבית
    console.log("Login:", { email, password });
    navigation.navigate("Home");
  };

  // פונקציה ריקה שרצה כשלוחצים על "לחץ כאן" בשכחת סיסמה
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
          <Text style={styles.title}>ברוכים הבאים</Text>

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

          {/* ── כפתור התחברות ── */}
          {/* לחיצה מפעילה את handleLogin שבודק תקינות ושולח */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>התחבר</Text>
          </TouchableOpacity>

          {/* ── מפריד "או" ── */}
          {/* שתי קווים אופקיים עם טקסט "או" ביניהם */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} /> {/* קו שמאלי */}
            <Text style={styles.dividerText}>או</Text>
            <View style={styles.dividerLine} /> {/* קו ימני */}
          </View>

          {/* ── כפתורי כניסה חברתית ── */}
          {/* כל SocialButton מקבל שם ואייקון מוכן מספריית vector-icons */}
          <SocialButton
            label="המשך עם Google"
            iconComponent={
              <AntDesign name="google" size={20} color="#DB4437" />
            }
          />
          <SocialButton
            label="המשך עם Facebook"
            iconComponent={
              <FontAwesome name="facebook" size={20} color="#1877F2" />
            }
          />
          <SocialButton
            label="המשך עם Apple"
            iconComponent={<AntDesign name="apple" size={20} color="#000" />}
          />

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

  // עיצוב הטקסט בתוך כפתור "התחבר"
  loginButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5, // מרווח קל בין האותיות
  },

  // עיצוב שורת המפריד "או"
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 22, // ריווח מעל ומתחת
  },

  // הקו האופקי משני צדי ה"או"
  dividerLine: {
    flex: 1, // מתפשט למלא את השטח הנותר
    height: 1,
    backgroundColor: "#e8e8e8",
  },

  // עיצוב הטקסט "או" שבין הקווים
  dividerText: {
    marginHorizontal: 14,
    color: "#aaa",
    fontSize: 13,
    fontFamily: FONTS.bold,
  },

  // עיצוב כפתורי הסושיאל (Google / Facebook / Apple)
  socialButton: {
    width: "100%",
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    backgroundColor: "#fff",
    justifyContent: "center", // ממרכז את ה-socialInner בתוך הכפתור
    alignItems: "center",
    marginBottom: 12, // ריווח בין הכפתורים
    // צל עדין
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  // מיכל פנימי שמסדר אייקון + טקסט בשורה ממורכזת
  socialInner: {
    flexDirection: "row", // אייקון וטקסט זה לצד זה
    alignItems: "center",
    gap: 10, // רווח אחיד בין האייקון לטקסט
  },

  // עיצוב הטקסט בתוך כפתורי הסושיאל
  socialLabel: {
    fontSize: 15,
    color: "#222",
    fontFamily: FONTS.bold,
  },
});

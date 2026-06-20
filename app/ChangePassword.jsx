import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiChangePassword } from "./src/api/authService";
import { getUser } from "./src/auth/authStore";
import { COLORS, FONTS } from "./src/theme";

// אורך מינימלי של סיסמה - תואם לבדיקה במסך הרשמה.
const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // הצגת/הסתרת סיסמאות - כל שדה עם state נפרד.
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // בדיקות ולידציה לפני שליחה לשרת.
  // מחזיר מחרוזת שגיאה אם יש בעיה, או null אם הכל תקין.
  const validate = () => {
    if (!oldPassword) return "יש להזין את הסיסמה הנוכחית";
    if (!newPassword) return "יש להזין סיסמה חדשה";
    if (!confirmPassword) return "יש לאשר את הסיסמה החדשה";
    if (newPassword.length < MIN_PASSWORD_LENGTH)
      return `הסיסמה החדשה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`;
    if (newPassword === oldPassword)
      return "הסיסמה החדשה חייבת להיות שונה מהקיימת";
    if (newPassword !== confirmPassword)
      return "הסיסמאות החדשות אינן זהות";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    const user = getUser();
    if (!user?.userID) {
      setError("שגיאה - המשתמש לא מחובר");
      return;
    }

    setSubmitting(true);
    try {
      await apiChangePassword(user.userID, oldPassword, newPassword);
      Alert.alert("הסיסמה עודכנה", "הסיסמה שלך שונתה בהצלחה", [
        { text: "אישור", onPress: () => router.back() },
      ]);
    } catch (err) {
      // המרת הודעת השגיאה הגנרית מהשרת לטקסט שמובן למשתמש.
      const msg = err.message || "שינוי הסיסמה נכשל";
      if (msg.toLowerCase().includes("old password is incorrect")) {
        setError("הסיסמה הנוכחית שגויה");
      } else if (msg.toLowerCase().includes("different")) {
        setError("הסיסמה החדשה חייבת להיות שונה מהקיימת");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // רנדור שדה סיסמה אחיד עם כפתור עין להצגה/הסתרה.
  const renderPasswordField = (label, value, setValue, show, setShow, placeholder) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          onPress={() => setShow((s) => !s)}
          style={styles.eyeBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={show ? "eye-outline" : "eye-off-outline"}
            size={22}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(v) => {
            setValue(v);
            setError("");
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!show}
          textAlign="right"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.header}>שינוי סיסמה</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            כדי לשמור על אבטחת החשבון, יש להזין את הסיסמה הנוכחית ולבחור סיסמה חדשה
            של לפחות {MIN_PASSWORD_LENGTH} תווים.
          </Text>

          {renderPasswordField(
            "סיסמה נוכחית",
            oldPassword,
            setOldPassword,
            showOld,
            setShowOld,
            "הסיסמה הנוכחית שלך",
          )}

          {renderPasswordField(
            "סיסמה חדשה",
            newPassword,
            setNewPassword,
            showNew,
            setShowNew,
            "לפחות 6 תווים",
          )}

          {renderPasswordField(
            "אישור סיסמה חדשה",
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            setShowConfirm,
            "הזנת הסיסמה החדשה שוב",
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.onBrand} />
            ) : (
              <Text style={styles.submitText}>עדכן סיסמה</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  header: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },

  intro: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginBottom: 22,
    lineHeight: 22,
  },

  fieldGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 6,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },

  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },

  eyeBtn: {
    paddingHorizontal: 4,
  },

  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 4,
  },

  submitBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
  },

  submitText: {
    color: COLORS.surface,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});

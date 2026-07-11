import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { apiResetPassword } from "./src/api/authService";
import { COLORS, FONTS } from "./src/theme";

// אורך מינימלי — עקבי עם מסך שינוי הסיסמה הקיים.
const MIN_PASSWORD_LENGTH = 6;

// שדה סיסמה עם כפתור עין (מקומי למסך זה, בסגנון שדות ההתחברות).
function PasswordInput({ value, onChangeText, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.passwordWrapper}>
      <TouchableOpacity
        onPress={() => setShow((s) => !s)}
        activeOpacity={0.7}
        style={styles.eyeBtn}
        accessibilityRole="button"
        accessibilityLabel={show ? "הסתר סיסמה" : "הצג סיסמה"}
      >
        <Ionicons
          name={show ? "eye-outline" : "eye-off-outline"}
          size={22}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>
      <TextInput
        style={styles.passwordInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        textAlign="right"
      />
    </View>
  );
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams(); // מגיע אוטומטית מה-deep link

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    if (!newPassword) return "יש להזין סיסמה חדשה";
    if (newPassword.length < MIN_PASSWORD_LENGTH)
      return `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`;
    if (!confirmPassword) return "יש לאשר את הסיסמה החדשה";
    if (newPassword !== confirmPassword) return "הסיסמאות אינן זהות";
    return null;
  };

  const handleSubmit = async () => {
    if (!token) {
      setError("קישור איפוס לא תקין");
      return;
    }
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await apiResetPassword(String(token), newPassword);
      setDone(true);
    } catch (err) {
      // הודעת השרת ספציפית (פג תוקף / נוצל / לא תקף); נפילה להודעה גנרית.
      setError(err.message || "קישור איפוס לא תקף או שפג תוקפו.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {done ? (
            // ── הצלחה ── //
            <View style={styles.center}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark" size={44} color={COLORS.onBrand} />
              </View>
              <Text style={styles.title}>הסיסמה עודכנה</Text>
              <Text style={styles.subtitle}>
                אפשר להתחבר עכשיו עם הסיסמה החדשה שלכם.
              </Text>
              <TouchableOpacity
                style={styles.mainButton}
                onPress={() => router.replace("/Login")}
                activeOpacity={0.85}
              >
                <Text style={styles.mainButtonText}>התחברות</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── טופס סיסמה חדשה ── //
            <>
              <Text style={styles.title}>איפוס סיסמה</Text>
              <Text style={styles.subtitle}>
                בחרו סיסמה חדשה של לפחות {MIN_PASSWORD_LENGTH} תווים.
              </Text>

              <View style={styles.form}>
                <PasswordInput
                  value={newPassword}
                  onChangeText={(v) => {
                    setNewPassword(v);
                    setError("");
                  }}
                  placeholder="סיסמה חדשה"
                />
                <PasswordInput
                  value={confirmPassword}
                  onChangeText={(v) => {
                    setConfirmPassword(v);
                    setError("");
                  }}
                  placeholder="אימות סיסמה חדשה"
                />
              </View>

              {error ? <Text style={styles.apiErrorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.mainButton, submitting && styles.mainButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.onBrand} />
                ) : (
                  <Text style={styles.mainButtonText}>עדכון סיסמה</Text>
                )}
              </TouchableOpacity>

              <View style={styles.centeredRow}>
                <TouchableOpacity
                  onPress={() => router.replace("/Login")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>חזרה להתחברות</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

  center: { width: "100%", alignItems: "center" },

  title: {
    fontSize: 30,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 6,
  },

  form: { width: "100%", marginBottom: 6 },

  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    height: "100%",
  },
  eyeBtn: { padding: 6 },

  apiErrorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginTop: 8,
  },

  mainButton: {
    width: "100%",
    height: 54,
    backgroundColor: COLORS.brand,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
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

  centeredRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  linkText: {
    color: COLORS.brand,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
});

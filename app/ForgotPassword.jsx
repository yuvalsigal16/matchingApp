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
import { SafeAreaView } from "react-native-safe-area-context";

import { apiForgotPassword } from "./src/api/authService";
import { COLORS, FONTS } from "./src/theme";

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

// הודעה גנרית קבועה — אין לחשוף אם המייל קיים במערכת (anti-enumeration).
const GENERIC_MESSAGE =
  "אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const value = email.trim();
    if (!value) {
      setEmailError("שדה חובה");
      return;
    }
    if (!isValidEmail(value)) {
      setEmailError("כתובת אימייל לא תקינה");
      return;
    }

    setEmailError("");
    setApiError("");
    setLoading(true);
    try {
      await apiForgotPassword(value);
      setSent(true); // תמיד — בלי קשר אם המייל קיים
    } catch (err) {
      setApiError(err.message || "אירעה שגיאה. נסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* כפתור חזרה */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="חזרה"
      >
        <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            // ── מצב אחרי שליחה — הודעה גנרית ── //
            <View style={styles.sentBox}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={40} color={COLORS.brand} />
              </View>
              <Text style={styles.title}>בדקו את המייל</Text>
              <Text style={styles.sentText}>{GENERIC_MESSAGE}</Text>
              <TouchableOpacity
                style={styles.mainButton}
                onPress={() => router.replace("/Login")}
                activeOpacity={0.85}
              >
                <Text style={styles.mainButtonText}>חזרה להתחברות</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── טופס בקשת איפוס ── //
            <>
              <Text style={styles.title}>שחזור סיסמה</Text>
              <Text style={styles.subtitle}>
                הזינו את כתובת המייל שלכם ונשלח אליכם קישור לאיפוס הסיסמה.
              </Text>

              <View style={styles.form}>
                <TextInput
                  style={[styles.input, emailError ? styles.inputError : null]}
                  placeholder="כתובת אימייל"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setEmailError("");
                    setApiError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign="right"
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {apiError ? (
                <Text style={styles.apiErrorText}>{apiError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.mainButton, loading && styles.mainButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.onBrand} />
                ) : (
                  <Text style={styles.mainButtonText}>שליחת קישור איפוס</Text>
                )}
              </TouchableOpacity>

              <View style={styles.centeredRow}>
                <TouchableOpacity
                  onPress={() => router.replace("/Login")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>חזרה להתחברות</Text>
                </TouchableOpacity>
                <Text style={styles.mutedText}>נזכרתם בסיסמה? </Text>
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

  backBtn: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

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

  input: {
    width: "100%",
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: 6,
    backgroundColor: COLORS.surface,
  },

  inputError: { borderColor: COLORS.danger },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginBottom: 8,
    marginRight: 8,
  },

  apiErrorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginTop: 12,
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
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  linkText: {
    color: COLORS.brand,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  // ── מצב "נשלח" ── //
  sentBox: { width: "100%", alignItems: "center" },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  sentText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
});

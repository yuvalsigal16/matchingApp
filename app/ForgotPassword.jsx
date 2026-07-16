import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MailCheck } from "lucide-react-native";

import { apiForgotPassword } from "./src/api/authService";
import { COLORS, FONTS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";

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
    <Screen>
      <ScreenHeader title="" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            // ── מצב אחרי שליחה — הודעה גנרית (anti-enumeration) ── //
            <EmptyState
              Icon={MailCheck}
              title="בדקו את המייל"
              subtitle={GENERIC_MESSAGE}
              actionLabel="חזרה להתחברות"
              onAction={() => router.replace("/Login")}
            />
          ) : (
            // ── טופס בקשת איפוס ── //
            <>
              <Text style={styles.title}>שחזור סיסמה</Text>
              <Text style={styles.subtitle}>
                הזינו את כתובת המייל שלכם ונשלח אליכם קישור לאיפוס הסיסמה.
              </Text>

              <View style={styles.form}>
                <Input
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setEmailError("");
                    setApiError("");
                  }}
                  placeholder="כתובת אימייל"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={emailError}
                  accessibilityLabel="כתובת אימייל"
                />

                {apiError ? <Text style={styles.apiErrorText}>{apiError}</Text> : null}

                <Button
                  label="שליחת קישור איפוס"
                  onPress={handleSubmit}
                  loading={loading}
                  size="lg"
                  style={styles.submitBtn}
                />

                <View style={styles.linkRow}>
                  <TouchableOpacity
                    onPress={() => router.replace("/Login")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.linkText}>חזרה להתחברות</Text>
                  </TouchableOpacity>
                  <Text style={styles.mutedText}>נזכרתם בסיסמה? </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },

  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xs,
  },

  form: { width: "100%" },

  apiErrorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    textAlign: "center",
    marginTop: SPACING.md,
  },

  submitBtn: { marginTop: SPACING.lg },

  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  mutedText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  linkText: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bold, color: COLORS.brand },
});

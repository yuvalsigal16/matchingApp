import { useLocalSearchParams, useRouter } from "expo-router";
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
import { Check } from "lucide-react-native";

import { apiResetPassword } from "./src/api/authService";
import { COLORS, FONTS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";

// אורך מינימלי — עקבי עם מסך שינוי הסיסמה הקיים.
const MIN_PASSWORD_LENGTH = 6;

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
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {done ? (
            // ── הצלחה ── //
            <EmptyState
              Icon={Check}
              title="הסיסמה עודכנה"
              subtitle="אפשר להתחבר עכשיו עם הסיסמה החדשה שלכם."
              actionLabel="התחברות"
              onAction={() => router.replace("/Login")}
            />
          ) : (
            // ── טופס סיסמה חדשה ── //
            <>
              <Text style={styles.title}>איפוס סיסמה</Text>
              <Text style={styles.subtitle}>
                בחרו סיסמה חדשה של לפחות {MIN_PASSWORD_LENGTH} תווים.
              </Text>

              <View style={styles.form}>
                <Input
                  value={newPassword}
                  onChangeText={(v) => {
                    setNewPassword(v);
                    setError("");
                  }}
                  placeholder="סיסמה חדשה"
                  secure
                  accessibilityLabel="סיסמה חדשה"
                  style={styles.field}
                />
                <Input
                  value={confirmPassword}
                  onChangeText={(v) => {
                    setConfirmPassword(v);
                    setError("");
                  }}
                  placeholder="אימות סיסמה חדשה"
                  secure
                  accessibilityLabel="אימות סיסמה חדשה"
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                  label="עדכון סיסמה"
                  onPress={handleSubmit}
                  loading={submitting}
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
  field: { marginBottom: SPACING.md },

  errorText: {
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
  linkText: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bold, color: COLORS.brand },
});

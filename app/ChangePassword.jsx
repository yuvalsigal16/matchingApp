import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { apiChangePassword } from "./src/api/authService";
import { getUser } from "./src/auth/authStore";
import { COLORS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

// אורך מינימלי של סיסמה - תואם לבדיקה במסך הרשמה.
const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  // שדה סיסמה — Input עם secure (כפתור-עין מובנה); החלפת רכיב בלבד, אותה התנהגות.
  const renderPasswordField = (label, value, setValue, placeholder) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Input
        value={value}
        onChangeText={(v) => {
          setValue(v);
          setError("");
        }}
        placeholder={placeholder}
        secure
        autoCapitalize="none"
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="שינוי סיסמה" onBack={() => router.back()} />

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

          {renderPasswordField("סיסמה נוכחית", oldPassword, setOldPassword, "הסיסמה הנוכחית שלך")}
          {renderPasswordField("סיסמה חדשה", newPassword, setNewPassword, "לפחות 6 תווים")}
          {renderPasswordField(
            "אישור סיסמה חדשה",
            confirmPassword,
            setConfirmPassword,
            "הזנת הסיסמה החדשה שוב",
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label="עדכון סיסמה"
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },
  intro: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginBottom: SPACING.xl,
  },
  fieldGroup: { marginBottom: SPACING.lg },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginBottom: SPACING.xs + 2,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    textAlign: "right",
    marginTop: SPACING.xs,
  },
  submitBtn: { marginTop: SPACING.lg },
});

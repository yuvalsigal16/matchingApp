import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AuthShell from "../../components/ui/AuthShell";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { apiLogin, apiRegister } from "../src/api/authService";
import { setAuth } from "../src/auth/authStore";
import { registerForPushNotifications } from "../src/push/pushNotifications";
import { COLORS, FONTS, SPACING } from "../src/theme";

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
const isValidPassword = (val) => val.length >= 6;
const isPasswordMatch = (pass, confirm) => pass === confirm;

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
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

  const validateConfirm = () =>
    setConfirmError(
      !confirm
        ? "שדה חובה"
        : !isPasswordMatch(password, confirm)
          ? "הסיסמאות אינן תואמות"
          : "",
    );

  const handleRegister = async () => {
    validateEmail();
    validatePassword();
    validateConfirm();
    if (
      !isValidEmail(email) ||
      !isValidPassword(password) ||
      !isPasswordMatch(password, confirm)
    )
      return;

    setApiError("");
    setIsLoading(true);
    try {
      await apiRegister(email, password);
      const { token, user } = await apiLogin(email, password);
      setAuth(token, user);
      registerForPushNotifications(user.userID); // רישום ל-Push למשתמש חדש (כמו ב-Login)
      router.replace("/QuizStartScreen");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="מתחילים מסע חדש"
      subtitle="כמה פרטים ואתם בפנים — ונמצא לכם שותפים לדרך."
    >
      <Input
        placeholder="כתובת אימייל"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setEmailError("");
        }}
        onBlur={validateEmail}
        error={emailError}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <Input
        placeholder="סיסמה (לפחות 6 תווים)"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setPasswordError("");
        }}
        onBlur={validatePassword}
        error={passwordError}
        secure
        autoComplete="password-new"
        textContentType="newPassword"
      />

      <Input
        placeholder="אימות סיסמה"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          setConfirmError("");
        }}
        onBlur={validateConfirm}
        error={confirmError}
        secure
        autoComplete="password-new"
        textContentType="newPassword"
      />

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <Button
        label="הירשם"
        onPress={handleRegister}
        loading={isLoading}
        style={styles.submit}
      />

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.replace("/Login")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="מעבר להתחברות"
        >
          <Text style={styles.footerLink}>התחבר</Text>
        </Pressable>
        <Text style={styles.footerText}>כבר יש לכם חשבון? </Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  apiError: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.danger,
    textAlign: "center",
  },
  submit: { marginTop: SPACING.xs },
  // flexDirection row (לא reverse): DOM = [קישור, טקסט] → "כבר יש לכם חשבון? התחבר".
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  footerText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  footerLink: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.brand },
});

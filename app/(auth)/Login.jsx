import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AuthShell from "../../components/ui/AuthShell";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { apiLogin } from "../src/api/authService";
import { getUserProfile } from "../src/api/userProfileService";
import { setAuth } from "../src/auth/authStore";
import { registerForPushNotifications } from "../src/push/pushNotifications";
import { COLORS, FONTS, SPACING } from "../src/theme";

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
const isValidPassword = (val) => val.length >= 6;

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // טוענים רק את האימייל השמור לנוחות (לא שומרים סיסמה במכשיר).
  useEffect(() => {
    AsyncStorage.getItem("saved_email").then((se) => se && setEmail(se));
  }, []);

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

  const handleLogin = async () => {
    validateEmail();
    validatePassword();
    if (!isValidEmail(email) || !isValidPassword(password)) return;

    setApiError("");
    setIsLoading(true);
    try {
      const { token, user } = await apiLogin(email, password);
      setAuth(token, user);
      registerForPushNotifications(user.userID);

      const profile = await getUserProfile(user.userID);
      await AsyncStorage.setItem("saved_email", email.trim()).catch(() => {});

      router.replace(profile ? "/Home" : "/QuizStartScreen");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      compact
      title="טוב לראות אתכם שוב"
      subtitle="התחברו כדי להמשיך מאיפה שהפסקתם."
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
        placeholder="סיסמה"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setPasswordError("");
        }}
        onBlur={validatePassword}
        error={passwordError}
        secure
        autoComplete="password"
        textContentType="password"
      />

      <Pressable
        onPress={() => router.push("/ForgotPassword")}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.forgotWrap}
        accessibilityRole="button"
        accessibilityLabel="שכחתם סיסמה"
      >
        <Text style={styles.forgotText}>שכחתם סיסמה?</Text>
      </Pressable>

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <Button
        label="התחברות"
        onPress={handleLogin}
        loading={isLoading}
        style={styles.submit}
      />

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push("/Register")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="מעבר להרשמה"
        >
          <Text style={styles.footerLink}>להרשמה</Text>
        </Pressable>
        <Text style={styles.footerText}>אין לכם חשבון? </Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgotWrap: { alignSelf: "flex-end", marginTop: -SPACING.xs },
  forgotText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.brand },
  apiError: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.danger,
    textAlign: "center",
  },
  submit: { marginTop: SPACING.xs },
  // flexDirection row (לא reverse): DOM = [קישור, טקסט] → הטקסט מימין והקישור
  // משמאלו, כך שהקריאה בעברית יוצאת "אין לכם חשבון? הירשם".
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  footerText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  footerLink: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.brand },
});

import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check } from "lucide-react-native";

import { createCommunity } from "./src/api/communityService";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const MIN_NAME = 3;

export default function CommunityCreateScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false); // הצלחה — להצגת באנר קצר לפני המעבר
  const [error, setError] = useState("");

  const navTimerRef = useRef(null);
  // ניקוי: ביטול טיימר הניווט אם המשתמש יוצא לפני המעבר
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const trimmedName = name.trim();
  const valid = trimmedName.length >= MIN_NAME;
  const disabled = submitting || created;

  const handleSubmit = useCallback(async () => {
    if (submitting || created) return; // מניעת שליחה כפולה / קליקים מהירים
    const communityName = name.trim();
    if (communityName.length < MIN_NAME) {
      setError(`שם הקהילה חייב להכיל לפחות ${MIN_NAME} תווים`);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const communityID = await createCommunity({
        communityName,
        description: description.trim(),
      });

      if (!communityID) {
        // תשובה לא צפויה (communityID חסר) — לא קורסים, מציגים שגיאה ידידותית
        throw new Error("missing communityID");
      }

      // משוב הצלחה קצר ואז מעבר ישיר לצ'אט הקהילה (חוויית WhatsApp)
      setCreated(true);
      navTimerRef.current = setTimeout(() => {
        router.replace({
          pathname: "/community-chat/[communityID]",
          params: { communityID: String(communityID), name: communityName },
        });
      }, 600);
    } catch {
      setError("לא ניתן ליצור קהילה כרגע, נסה שוב מאוחר יותר");
      setSubmitting(false); // הפעלה מחדש של הכפתור
    }
  }, [name, description, submitting, created, router]);

  return (
    <Screen>
      <ScreenHeader
        title="קהילה חדשה"
        onBack={() => {
          if (!disabled) router.back();
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {created ? (
            <View style={styles.successBanner}>
              <Check size={18} color={COLORS.onBrand} strokeWidth={2.4} />
              <Text style={styles.successText}>הקהילה נוצרה בהצלחה</Text>
            </View>
          ) : null}

          <Text style={styles.label}>שם הקהילה *</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="לדוגמה: טיולים בדרום אמריקה"
            maxLength={60}
            editable={!disabled}
            returnKeyType="next"
            accessibilityLabel="שם הקהילה"
          />

          <Text style={[styles.label, styles.labelSpaced]}>תיאור (לא חובה)</Text>
          {/* שדה רב-שורתי מקומי בסגנון Input (primitive ה-Input הוא חד-שורתי). */}
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="ספרו על הקהילה..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.multiInput}
            textAlign="right"
            multiline
            maxLength={200}
            editable={!disabled}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label="יצירת קהילה"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!valid || disabled}
            size="lg"
            style={styles.submitBtn}
            accessibilityLabel="יצירת קהילה"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  body: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xxxl },

  successBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  successText: { ...TYPOGRAPHY.bodyBold, color: COLORS.onBrand },

  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginBottom: SPACING.xs + 2,
  },
  labelSpaced: { marginTop: SPACING.lg },

  // שדה רב-שורתי — מראה תואם ל-Input: surface, מסגרת-שיער, פינות RADIUS.lg.
  multiInput: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: "top",
  },

  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    textAlign: "right",
    marginTop: SPACING.md,
  },

  submitBtn: { marginTop: SPACING.xl },
});

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { createCommunity } from "./src/api/communityService";
import { COLORS, FONTS } from "./src/theme";

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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          disabled={disabled}
        >
          <Ionicons name="arrow-forward" size={24} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>קהילה חדשה</Text>
        <View style={{ width: 24 }} />
      </View>

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
              <Ionicons name="checkmark-circle" size={20} color={COLORS.onBrand} />
              <Text style={styles.successText}>הקהילה נוצרה בהצלחה</Text>
            </View>
          ) : null}

          <Text style={styles.label}>שם הקהילה *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="לדוגמה: טיולים בדרום אמריקה"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            textAlign="right"
            maxLength={60}
            editable={!disabled}
            returnKeyType="next"
          />

          <Text style={styles.label}>תיאור (לא חובה)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="ספרו על הקהילה..."
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, styles.inputMulti]}
            textAlign="right"
            multiline
            maxLength={200}
            editable={!disabled}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, (!valid || disabled) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!valid || disabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="יצירת קהילה"
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.onBrand} size="small" />
            ) : (
              <Text style={styles.submitText}>יצירת קהילה</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text },

  body: { padding: 20, gap: 4 },

  successBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  successText: { color: COLORS.onBrand, fontFamily: FONTS.bold, fontSize: 14 },

  label: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },
  inputMulti: { minHeight: 100, textAlignVertical: "top" },

  errorText: {
    color: COLORS.danger || "#DC2626",
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: "right",
    marginTop: 10,
  },

  submitBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: COLORS.textMuted },
  submitText: { color: COLORS.onBrand, fontSize: 16, fontFamily: FONTS.bold },
});

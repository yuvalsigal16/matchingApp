// QuizShell — המעטפת המשותפת לכל מסכי האונבורדינג (Quiz / PreferencesQuiz / Wheel).
// מבנה אחיד: מד-התקדמות (בר דק + "שלב X מתוך Y" + חזרה) → כותרת ותת-כותרת
// מיושרות לימין → תוכן גליל → פוטר עם רמז-ולידציה ו-CTA במלוא הרוחב.
// המסך שומר את ה-state/הלוגיקה/האנימציה שלו ומעביר אותם כ-props — אין כאן לוגיקה.
import { ArrowRight } from "lucide-react-native";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS, SPACING } from "../../app/src/theme";
import Button from "./Button";

export default function QuizShell({
  showProgress = true,
  step = 1,
  total = 1,
  onBack,
  title,
  subtitle,
  children,
  fade,
  slide,
  scrollRef,
  ctaLabel,
  onNext,
  loading = false,
  disabled = false,
  hint,
  error,
}) {
  const animatedStyle =
    fade != null
      ? { opacity: fade, transform: [{ translateY: slide ?? 0 }] }
      : null;

  const backControl = onBack ? (
    <Pressable
      onPress={onBack}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="חזרה"
    >
      <ArrowRight size={22} color={COLORS.brand} strokeWidth={2.2} />
    </Pressable>
  ) : (
    <View style={styles.backSpacer} />
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {showProgress ? (
          <View style={styles.progressHeader}>
            <View style={styles.progressTopRow}>
              {backControl}
              <Text style={styles.progressStepText}>
                שלב {step} מתוך {total}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${(step / total) * 100}%` }]}
              />
            </View>
          </View>
        ) : onBack ? (
          <View style={styles.introHeader}>{backControl}</View>
        ) : null}

        <Animated.View style={[styles.contentWrapper, animatedStyle]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>

        <View style={styles.footer}>
          {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {ctaLabel ? (
            <Button
              label={ctaLabel}
              onPress={onNext}
              loading={loading}
              disabled={disabled}
              style={styles.cta}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },

  progressHeader: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  progressTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  backSpacer: { width: 22 },
  progressStepText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandLight,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: COLORS.brand },

  introHeader: {
    flexDirection: "row-reverse",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },

  contentWrapper: { flex: 1, width: "100%" },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    marginTop: SPACING.lg,
    marginBottom: 6,
    textAlign: "right",
    paddingHorizontal: SPACING.xl,
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  scrollView: { width: "100%" },
  scrollArea: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },

  footer: {
    width: "100%",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  hintText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: 13,
    textAlign: "center",
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: "center",
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  cta: { width: "100%" },
});

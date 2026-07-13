// AuthShell — המעטפת המשותפת ל-Login/Register (וכל מסך אימות).
// "סף הכניסה הטורקיז": כותרת-מותג טורקיז מעוגלת למטה (לוגו + שם + סלוגן),
// ומעליה טופס על רקע הנייר החם. שני מסכי האימות חולקים בדיוק את אותה מעטפת.
//
// compact: מקטין עוד את הכותרת ומעלה את הטופס — ל-Login, שבו הטופס הוא העיקר.
import { Image } from "expo-image";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONTS, SPACING, TYPOGRAPHY } from "../../app/src/theme";

const LOGO = require("../../assets/images/onlyLogo-removebg-preview.png");

// חפיפת יריעת-הנייר מעל הטורקיז (וגם רדיוס העיגול העליון של הגוף).
const OVERLAP = 28;

export default function AuthShell({ title, subtitle, compact = false, children }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* כותרת-מותג טורקיז — המשך ישיר ממסך הפתיחה (נמוכה יותר ב-Login) */}
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + (compact ? SPACING.md : SPACING.lg),
                // +OVERLAP: הטופס (נייר) יעלה מעל התחתית הזו בפינות מעוגלות,
                // כך שגובה הטורקיז הנראה נשאר כשהיה.
                paddingBottom: (compact ? SPACING.lg : SPACING.xl) + OVERLAP,
              },
            ]}
          >
            <Image
              source={LOGO}
              style={[styles.logo, compact && styles.logoCompact]}
              contentFit="contain"
            />
            <Text style={styles.wordmark}>צמד חמד</Text>
            <Text style={styles.tagline}>החצי השני שלך לטיול הבא</Text>
          </View>

          {/* גוף — על רקע הנייר החם */}
          <View style={[styles.body, { paddingTop: compact ? SPACING.lg : SPACING.xl }]}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: SPACING.xxl },

  // הטורקיז מלא-רוחב וישר בתחתית; העיגול שייך לנייר שמעליו (למטה).
  header: {
    backgroundColor: COLORS.brand,
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  logo: { width: 108, height: 108, marginBottom: 8 },
  logoCompact: { width: 118, height: 118 },
  wordmark: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    color: COLORS.onBrand,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },

  // "יריעת" הנייר עולה מעל הטורקיז עם פינות מעוגלות בצבע הרקע הראשי —
  // הטורקיז מציץ מבעד לפינות. marginTop שלילי = החפיפה.
  body: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -OVERLAP,
    paddingHorizontal: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 6,
  },
  form: { marginTop: SPACING.xl, gap: SPACING.md },
});

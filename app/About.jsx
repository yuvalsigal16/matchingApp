import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { User } from "lucide-react-native";

import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Card from "../components/ui/Card";

// שליפת מספר גרסה אוטומטית מ-app.json. אם לא קיים - נציג "1.0.0".
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

// פרטי הצוות המפתח. ניתן לערוך כאן בקלות בעתיד.
const TEAM = [
  "ליאל רובינוב",
  "בר מיכאלי",
  "יובל סיגל",
  "טלי מקוביצקי",
];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScreenHeader title="אודות" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero - לוגו + שם + סלוגן */}
        <View style={styles.hero}>
          <Image
            source={require("../assets/images/onlyLogo-removebg-preview.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>צמד חמד</Text>
          <Text style={styles.tagline}>החצי השני שלך לטיול הבא</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>גרסה {APP_VERSION}</Text>
          </View>
        </View>

        {/* תיאור האפליקציה */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>על האפליקציה</Text>
          <Text style={styles.bodyText}>
            צמד חמד היא אפליקציה לחיבור בין אנשים המחפשים פרטנר לטיול הבא. האפליקציה
            מתאימה בין משתמשים על בסיס תחומי עניין משותפים, אורח חיים והעדפות אישיות,
            ומאפשרת תקשורת ישירה לתכנון הטיול יחד.
          </Text>
        </Card>

        {/* צוות הפיתוח */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>צוות הפיתוח</Text>
          {TEAM.map((name, index) => (
            <View key={index} style={styles.teamRow}>
              <User size={18} color={COLORS.brand} strokeWidth={2} />
              <Text style={styles.teamName}>{name}</Text>
            </View>
          ))}
        </Card>

        {/* פרטי הפרויקט */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>פרויקט גמר</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>מסלול</Text>
            <Text style={styles.metaValue}>מערכות מידע</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>שנה</Text>
            <Text style={styles.metaValue}>2026</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>טכנולוגיות</Text>
            <Text style={styles.metaValue}>
              React Native, ASP.NET Core, SQL Server
            </Text>
          </View>
        </Card>

        {/* Footer */}
        <Text style={styles.footer}>© 2026 צמד חמד</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },

  // ── Hero ──
  hero: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    marginBottom: SPACING.lg,
  },
  logo: { width: 110, height: 110, marginBottom: SPACING.sm },
  // שם המותג בהירו — שימוש brand מכוון (wordmark), לא טקסט רגיל.
  appName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.brand,
    marginTop: SPACING.xs,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs + 2,
  },
  versionBadge: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.md,
  },
  versionText: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  // ── Cards ──
  card: { marginBottom: SPACING.md },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: SPACING.sm,
  },
  bodyText: { ...TYPOGRAPHY.body, color: COLORS.text, textAlign: "right" },

  // ── Team ──
  teamRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  teamName: { ...TYPOGRAPHY.body, color: COLORS.text },

  // ── Project meta ──
  metaRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs + 2,
  },
  metaLabel: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  metaValue: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.semibold,
    color: COLORS.text,
    maxWidth: "70%",
    textAlign: "left",
  },

  // ── Footer ──
  footer: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
});

import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Card from "../components/ui/Card";

// מסך תנאי שימוש - טקסט סטטי מקורי בעברית.
// תאריך עדכון אחרון מוצג בראש המסך לידיעת המשתמש.
const LAST_UPDATED = "יוני 2026";

const SECTIONS = [
  {
    title: "1. הסכמה לתנאים",
    body:
      "השימוש באפליקציית צמד חמד מהווה הסכמה מלאה לתנאי שימוש אלה. " +
      "מי שאינו מסכים לתנאים, מתבקש שלא להשתמש באפליקציה.",
  },
  {
    title: "2. רישום לחשבון",
    body:
      "הרישום לאפליקציה מחייב הזנת כתובת דוא\"ל וסיסמה. כל משתמש אחראי " +
      "לשמור על סודיות פרטי הכניסה לחשבון שלו, ועל פעולות שמבוצעות בחשבון. " +
      "אין למסור את פרטי החשבון לאף גורם אחר.",
  },
  {
    title: "3. גיל המשתמש",
    body:
      "השימוש באפליקציה מותר לבני 18 ומעלה בלבד. הרישום מהווה הצהרה כי " +
      "המשתמש עומד בדרישת הגיל המינימלי.",
  },
  {
    title: "4. שימוש מותר",
    body:
      "האפליקציה נועדה לסייע למשתמשים למצוא פרטנרים לטיולים על בסיס תחומי " +
      "עניין משותפים. אין להשתמש באפליקציה למטרות מסחריות, פרסומיות, או " +
      "כל מטרה שאינה תואמת את ייעוד האפליקציה.",
  },
  {
    title: "5. תוכן משתמש",
    body:
      "תוכן שנשלח על ידי המשתמש (תמונת פרופיל, הודעות, פרטים אישיים) הוא " +
      "באחריות מלאה של המשתמש. אסור לפרסם תוכן פוגעני, מטעה, או המפר חוק. " +
      "אנו שומרים את הזכות להסיר תוכן שמפר כללים אלה ולחסום משתמשים.",
  },
  {
    title: "6. תקשורת בין משתמשים",
    body:
      "האפליקציה מאפשרת תקשורת ישירה בין משתמשים. המשתמשים אחראים על " +
      "הטון ועל התוכן של ההודעות שלהם. ניתן לחסום משתמש בכל עת דרך מסך " +
      "ההגדרות.",
  },
  {
    title: "7. סיום שימוש",
    body:
      "המשתמש רשאי למחוק את חשבונו בכל עת דרך מסך ההגדרות. מחיקת חשבון " +
      "תגרום למחיקת כל הנתונים הקשורים לחשבון לצמיתות, ולא ניתן יהיה לשחזרם.",
  },
  {
    title: "8. הגבלת אחריות",
    body:
      "האפליקציה מסופקת \"AS IS\". אנו לא אחראים לתוכן שמשתמשים אחרים מעלים, " +
      "לפגישות שנוצרות באמצעות האפליקציה, או לכל נזק שייגרם כתוצאה מהשימוש " +
      "באפליקציה.",
  },
  {
    title: "9. שינויים בתנאים",
    body:
      "אנו רשאים לעדכן את תנאי השימוש מעת לעת. עדכונים מהותיים יוצגו " +
      "למשתמש בכניסה הבאה לאפליקציה. המשך השימוש לאחר העדכון מהווה הסכמה " +
      "לתנאים החדשים.",
  },
  {
    title: "10. יצירת קשר",
    body:
      "לכל שאלה או פנייה בנוגע לתנאי השימוש, ניתן לפנות אלינו בכתובת " +
      "support@tzemedchemed.app",
  },
];

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScreenHeader title="תנאי שימוש" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>עדכון אחרון: {LAST_UPDATED}</Text>

        <Card style={styles.introCard}>
          <Text style={styles.intro}>
            ברוכים הבאים לאפליקציית צמד חמד. תנאי שימוש אלה מסדירים את היחסים בין
            המשתמש לבין מפעילי האפליקציה. אנא קראו בעיון לפני השימוש.
          </Text>
        </Card>

        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxxl,
  },
  lastUpdated: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  introCard: { marginBottom: SPACING.lg },
  intro: { ...TYPOGRAPHY.body, color: COLORS.text, textAlign: "right" },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: SPACING.xs + 2,
  },
  sectionBody: { ...TYPOGRAPHY.body, color: COLORS.text, textAlign: "right" },
});

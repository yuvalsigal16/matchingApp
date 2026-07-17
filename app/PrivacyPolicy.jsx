import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Card from "../components/ui/Card";

// מסך מדיניות פרטיות - טקסט סטטי מקורי בעברית.
const LAST_UPDATED = "יוני 2026";

const SECTIONS = [
  {
    title: "1. מבוא",
    body:
      "אנו מכבדים את פרטיות המשתמשים שלנו ומחויבים להגן על המידע האישי שלהם. " +
      "מדיניות זו מסבירה אילו פרטים נאספים, כיצד נעשה בהם שימוש ואילו זכויות " +
      "יש למשתמש בנוגע למידע שלו.",
  },
  {
    title: "2. אילו פרטים נאספים",
    body:
      "במסגרת השימוש באפליקציה אנו אוספים את הפרטים הבאים: כתובת דוא\"ל, " +
      "סיסמה (מוצפנת), שם פרטי ומשפחה, תאריך לידה, מגדר, עיר מגורים, " +
      "תמונת פרופיל, תחומי עניין, תשובות לשאלון אורח חיים, היסטוריית " +
      "אינטראקציות בתוך האפליקציה, ותוכן הודעות צ'אט.",
  },
  {
    title: "3. למה משמשים הפרטים",
    body:
      "הפרטים שנאספים משמשים את האפליקציה לטובת המשתמש בלבד: התאמה בין " +
      "משתמשים על בסיס דמיון בתחומי עניין ובאורח חיים, הצגת פרופיל בפני " +
      "משתמשים אחרים שיעניינו אותו, ותקשורת בין משתמשים שאישרו זה את זה.",
  },
  {
    title: "4. אבטחת מידע",
    body:
      "סיסמאות המשתמשים נשמרות בצורה מוצפנת (BCrypt) ולעולם אינן זמינות לקריאה. " +
      "כל התקשורת עם השרת מתבצעת מעל HTTPS. המידע נשמר בשרתי Microsoft Azure " +
      "המאובטחים על פי תקני התעשייה.",
  },
  {
    title: "5. שיתוף עם צדדים שלישיים",
    body:
      "אנו לא מוכרים ולא משתפים את המידע האישי שלך עם צדדים שלישיים למטרות " +
      "פרסום. שירותים חיצוניים שאנו משתמשים בהם לתפקוד האפליקציה: שרתי Azure " +
      "לאחסון, ושירות Firebase Cloud Messaging של גוגל לשליחת התראות לטלפון. " +
      "שירותים אלה כפופים למדיניות הפרטיות שלהם.",
  },
  {
    title: "6. זכויות המשתמש",
    body:
      "כל משתמש זכאי לעיין במידע האישי שלו, לעדכן אותו, ולמחוק את חשבונו לצמיתות " +
      "בכל עת דרך מסך ההגדרות. מחיקת חשבון תגרום להסרת כל המידע המשויך אליו " +
      "מהמערכת.",
  },
  {
    title: "7. שמירת המידע",
    body:
      "המידע נשמר כל עוד החשבון פעיל. עם מחיקת החשבון, כל הנתונים נמחקים " +
      "באופן מיידי ובלתי הפיך. אין אפשרות לשחזר חשבון שנמחק.",
  },
  {
    title: "8. עוגיות ומידע טכני",
    body:
      "האפליקציה שומרת בזיכרון המכשיר את ה-token לאימות וכן את מזהה ה-Push " +
      "של המכשיר (אם המשתמש אישר התראות). מידע זה משמש לזיהוי המכשיר לטובת " +
      "השליחה של התראות בלבד.",
  },
  {
    title: "9. פרטיות קטינים",
    body:
      "האפליקציה לא מיועדת לקטינים מתחת לגיל 18. אם נגלה כי משתמש קטין נרשם " +
      "למערכת, חשבונו יוסר באופן מיידי.",
  },
  {
    title: "10. עדכוני מדיניות",
    body:
      "אנו רשאים לעדכן את מדיניות הפרטיות מעת לעת. עדכונים מהותיים יוצגו " +
      "למשתמש בכניסה הבאה לאפליקציה.",
  },
  {
    title: "11. יצירת קשר",
    body:
      "לכל שאלה, בקשה לקבלת מידע, או בקשה להפעלת זכות, ניתן לפנות אלינו " +
      "בכתובת privacy@tzemedchemed.app.",
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScreenHeader title="מדיניות פרטיות" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>עדכון אחרון: {LAST_UPDATED}</Text>

        <Card style={styles.introCard}>
          <Text style={styles.intro}>
            הפרטיות שלך חשובה לנו. מדיניות זו מתארת כיצד צמד חמד אוסף, משתמש,
            ומגן על המידע האישי של המשתמשים באפליקציה.
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

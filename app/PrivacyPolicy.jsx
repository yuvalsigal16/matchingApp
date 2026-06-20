import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONTS } from "./src/theme";

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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.header}>מדיניות פרטיות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>עדכון אחרון: {LAST_UPDATED}</Text>

        <Text style={styles.intro}>
          הפרטיות שלך חשובה לנו. מדיניות זו מתארת כיצד צמד חמד אוסף, משתמש,
          ומגן על המידע האישי של המשתמשים באפליקציה.
        </Text>

        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  header: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  lastUpdated: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 12,
  },

  intro: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.regular,
    textAlign: "right",
    lineHeight: 22,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },

  section: {
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 6,
  },

  sectionBody: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.regular,
    textAlign: "right",
    lineHeight: 22,
  },
});

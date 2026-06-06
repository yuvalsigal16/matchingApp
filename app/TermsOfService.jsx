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

import { FONTS } from "./src/theme/fonts";

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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>תנאי שימוש</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>עדכון אחרון: {LAST_UPDATED}</Text>

        <Text style={styles.intro}>
          ברוכים הבאים לאפליקציית צמד חמד. תנאי שימוש אלה מסדירים את היחסים בין
          המשתמש לבין מפעילי האפליקציה. אנא קראו בעיון לפני השימוש.
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
  container: { flex: 1, backgroundColor: "#F0F2F5" },

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
    color: "#1A3C40",
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  lastUpdated: {
    fontSize: 12,
    color: "#888",
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 12,
  },

  intro: {
    fontSize: 14,
    color: "#444",
    fontFamily: FONTS.regular,
    textAlign: "right",
    lineHeight: 22,
    backgroundColor: "#fff",
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
    color: "#1A3C40",
    textAlign: "right",
    marginBottom: 6,
  },

  sectionBody: {
    fontSize: 14,
    color: "#444",
    fontFamily: FONTS.regular,
    textAlign: "right",
    lineHeight: 22,
  },
});

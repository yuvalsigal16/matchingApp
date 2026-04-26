// ייבוא רכיבי UI מ-React Native
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// SafeAreaView — מבטיח שהתוכן לא ייחסם על ידי ה-notch או סרגל הניווט
import { SafeAreaView } from 'react-native-safe-area-context';
// פונטים מותאמים של האפליקציה
import { FONTS } from "../theme/fonts";

// אייקונים מהספרייה lucide-react-native — אייקונים בקווים מודרניים
import {
  MessageCircle, // אייקון בועת הודעה — לתצוגת התאמות
  MapPin,        // אייקון סיכת מפה — לטיולים שלי
  Bell,          // אייקון פעמון — להתראות
  Users,         // אייקון קבוצת אנשים — לקהילה
  ChevronLeft,   // אייקון חץ שמאלה — מיובא לשימוש עתידי
} from "lucide-react-native";

// ── הקומפוננטה הראשית של מסך הבית ──
// זהו המסך שמוצג למשתמש אחרי שהוא התחבר וסיים את שאלון ההיכרות
export default function HomeScreen() {
  // ── רשימת הפריטים בתפריט הראשי ──
  // כל פריט מכיל: כותרת, אייקון, צבע רקע, גוון, וצבע מסגרת
  // הגדרה כמערך מאפשרת לרנדר את כל הפריטים בלולאה אחת (DRY)
  const MENU_ITEMS = [
    {
      title: "התאמות עבורך",      // טקסט הכפתור
      Icon: MessageCircle,         // קומפוננטת האייקון
      color: "#E6F2F2",            // צבע רקע — turquoise בהיר
      tint: '#e0f0f1',
      ring: '#7bbdbf',
    },
    {
      title: "הטיולים שלי",
      Icon: MapPin,
      color: "#EAF3EA",            // ירוק בהיר
      tint: '#e0f0f1',
      ring: '#7bbdbf',
    },
    {
      title: "התראות ופעילויות",
      Icon: Bell,
      color: "#F6E6E6",            // ורוד בהיר
      tint: '#e0f0f1',
      ring: '#7bbdbf',
    },
    {
      title: "גילוי וקהילה",
      Icon: Users,
      color: "#EEE8F6",            // סגול בהיר
      tint: '#e0f0f1',
      ring: '#7bbdbf',
    },
  ];

  return (
    // SafeAreaView — מיכל ראשי של המסך
    <SafeAreaView style={styles.container}>
      {/* ── אזור עליון: ברכת שלום ותמונת פרופיל ── */}
      <View style={styles.header}>
      <View style={styles.headerTextContainer}>
          {/* טקסטים בעברית — מיושרים לימין */}
          <Text style={styles.greetingText}>שלום, דנה</Text>
          <Text style={styles.mainTitle}>ברוך הבא לצמד חמד</Text>
        </View>
        {/* תמונת פרופיל זמנית — בעתיד תוחלף בתמונה האמיתית של המשתמש */}
        <Image
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
          style={styles.profileImg}
        />
      </View>

      {/* ── אזור הלוגו והכותרת המרכזית ── */}
      {/* צמצמנו מרווחים כדי שהתוכן יעלה למעלה ויישאר מקום לתפריט */}
      <View style={styles.logoSection}>
        {/* עיגול עם אייקון סיכת מיקום (אימוג'י) — מסמל את עולם הטיולים */}
        <View style={styles.logoCircle}>
            <Text style={{fontSize: 60}}>📍</Text>
        </View>
        {/* כותרת ברכת קבלה — \n גורם לירידת שורה */}
        <Text style={styles.welcomeTxt}>ברוך הבא{"\n"}לצמד חמד</Text>
      </View>

      {/* ── תפריט הכפתורים הראשי ── */}
      {/* רנדור דינמי של כל פריט מהמערך MENU_ITEMS */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item, index) => (
          // TouchableOpacity — כפתור עם אפקט עמעום בלחיצה
          // key={index} — מזהה ייחודי לכל פריט (חובה ב-React)
          <TouchableOpacity key={index} style={[styles.menuItem, { backgroundColor: item.color }]}>
            {/* האייקון של הפריט — נטען דינמית מהמערך */}
            <item.Icon size={24} color="#1A3C40" />
            {/* טקסט הכפתור */}
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>


    </SafeAreaView>
  );
}

// ── הגדרת העיצובים (Styles) ──
// StyleSheet.create מייעל ביצועים — מעבד את הסגנונות פעם אחת בלבד
const styles = StyleSheet.create({
  // המיכל הראשי של המסך — רקע אפור-ירקרק בהיר
  container: {
    flex: 1,
    backgroundColor: '#E0E7E9',
    justifyContent: 'flex-start', // מבטיח שהתוכן יתחיל מההתחלה (למעלה)
  },
  // אזור הכותרת העליונה (שלום + תמונת פרופיל)
  header: {
    paddingHorizontal: 20,
    paddingTop: 10, // ריווח מינימלי מלמעלה
    alignItems: 'flex-end' // יישור תוכן לימין (RTL)
  },
  // תמונת פרופיל עגולה
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20  // חצי מהרוחב = עיגול מושלם
  },
  // אזור הלוגו המרכזי
  logoSection: {
    alignItems: 'center', // ממורכז אופקית
    marginTop: 10, // צמצום משמעותי מ-20 — חוסך מקום לתפריט
    marginBottom: 20
  },
  // עיגול הלוגו — רקע אפור-ירקרק עם אימוג'י במרכז
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50, // עיגול מושלם
    backgroundColor: '#B8CBD0',
    justifyContent: 'center', // מרכוז אנכי של האימוג'י
    alignItems: 'center',     // מרכוז אופקי של האימוג'י
    marginBottom: 10
  },
  // טקסט הברכה הגדול ("ברוך הבא לצמד חמד")
  welcomeTxt: {
    fontSize: 28, // הקטנה קלה כדי לחסוך מקום
    fontFamily: FONTS.extraBold, // פונט מודגש מאוד
    textAlign: 'center',
    color: '#333',
    lineHeight: 34 // גובה שורה — נותן נשימה לטקסט
  },
  // מיכל התפריט הראשי
  menuContainer: {
    paddingHorizontal: 25,
    marginTop: 10 // צמצום המרווח בין הכותרת לכפתורים
  },
  // עיצוב כל כפתור בתפריט
  menuItem: {
    flexDirection: 'row-reverse', // RTL — אייקון מימין, טקסט משמאל
    alignItems: 'center',
    padding: 18, // הקטנה קלה של עובי הכפתור
    borderRadius: 15, // פינות מעוגלות
    marginBottom: 12, // צמצום המרווח בין הכפתורים
    justifyContent: 'space-between' // אייקון בקצה אחד, טקסט בקצה השני
  },
  // טקסט הכפתור
  menuText: {
    color: '#333',
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  // עיצוב אייקון בודד (לא בשימוש כרגע — עדיין שימושי לעתיד)
  icon: {
    fontSize: 22
  }
});

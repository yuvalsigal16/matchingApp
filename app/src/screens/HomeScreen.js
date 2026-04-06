import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONTS } from "../theme/fonts";

export default function HomeScreen() {
  const MENU_ITEMS = [
    { title: 'התאמות עבורך', icon: '✉️', color: '#7FB3B3' },
    { title: 'הטיולים שלי', icon: '💬', color: '#A5C99E' },
    { title: 'התראות ופעילויות', icon: '👥', color: '#E5A9A9' },
    { title: 'גילוי וקהילה', icon: '👨‍👩‍👧‍👦', color: '#5B8A8A' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* תמונת פרופיל קטנה בצד */}
      <View style={styles.header}>
         <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.profileImg} />
      </View>

      {/* חלק הלוגו והכותרת - צמצמנו מרווחים כדי שיעלה למעלה */}
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
            <Text style={{fontSize: 60}}>📍</Text>
        </View>
        <Text style={styles.welcomeTxt}>ברוך הבא{"\n"}לצמד חמד</Text>
      </View>

      {/* תפריט הכפתורים */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity key={index} style={[styles.menuItem, { backgroundColor: item.color }]}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E0E7E9',
    justifyContent: 'flex-start', // מבטיח שהתוכן יתחיל מההתחלה
  },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 10, // פחות פאדינג מלמעלה
    alignItems: 'flex-end' 
  },
  profileImg: { 
    width: 40, 
    height: 40, 
    borderRadius: 20 
  },
  logoSection: { 
    alignItems: 'center', 
    marginTop: 10, // צמצום משמעותי מ-20
    marginBottom: 20 
  },
  logoCircle: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#B8CBD0', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  welcomeTxt: {
    fontSize: 28, // הקטנה קלה כדי לחסוך מקום
    fontFamily: FONTS.extraBold,
    textAlign: 'center',
    color: '#333',
    lineHeight: 34
  },
  menuContainer: { 
    paddingHorizontal: 25, 
    marginTop: 10 // צמצום המרווח בין הכותרת לכפתורים
  },
  menuItem: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    padding: 18, // הקטנה קלה של עובי הכפתור
    borderRadius: 15, 
    marginBottom: 12, // צמצום המרווח בין הכפתורים
    justifyContent: 'space-between' 
  },
  menuText: {
    color: '#333',
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  icon: {
    fontSize: 22
  }
});
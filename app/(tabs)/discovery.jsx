import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "../../src/theme/fonts";

export default function DiscoveryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>גילוי וקהילה</Text>
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.push("/community")}
        >
          <Text style={styles.menuText}>יצירת קהילה/ הצטרפות לפי תחומי עניין</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.push("/recommendations")}
        >
          <Text style={styles.menuText}>המלצות של אחרים על מקומות ואטרקציות</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  content: { paddingHorizontal: 20, paddingTop: 60, alignItems: 'center' },
  header: { fontSize: 24, fontFamily: FONTS.bold, color: "#1A3C40", marginBottom: 40 },
  menuButton: {
    backgroundColor: "#fff",
    width: '100%',
    paddingVertical: 25,
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 3,
  },
  menuText: { fontSize: 18, fontFamily: FONTS.bold, color: "#1A3C40", textAlign: 'center' }
});
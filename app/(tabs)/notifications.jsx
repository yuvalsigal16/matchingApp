import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNav from "../../components/BottomNav";
import { FONTS } from "../../src/theme/fonts";

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>התראות ופעולות</Text>
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.push("/requestStatus")}
        >
          <Text style={styles.menuText}>סטטוס בקשות ששלחתי</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.push("/activeChats")}
        >
          <Text style={styles.menuText}>צ'אטים פעילים כלליים</Text>
        </TouchableOpacity>
      </View>
      <BottomNav active="notifications" />
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
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 3,
  },
  menuText: { fontSize: 20, fontFamily: FONTS.bold, color: "#1A3C40" }
});
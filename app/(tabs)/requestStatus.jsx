import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "../../src/theme/fonts";

export default function RequestStatusScreen() {
  const router = useRouter();

  // נתוני דוגמה המדמים את הסטטוסים בתמונה
  const requests = [
    { id: 1, name: "מיכל", status: 'v' },
    { id: 2, name: "דניאל", status: 'v' },
    { id: 3, name: "רוני", status: 'x' },
    { id: 4, name: "נועה", status: 'x' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>סטטוס בקשות</Text>
        
        <View style={styles.whiteBox}>
          {requests.map((item) => (
            <View key={item.id} style={styles.row}>
              {item.status === 'v' ? (
                <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
              ) : (
                <Ionicons name="close-circle-outline" size={24} color="#F44336" />
              )}
              <View style={styles.userSection}>
                <Text style={styles.userName}>{item.name}</Text>
                <View style={styles.avatarPlaceholder} />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/notifications")}>
          <Text style={styles.backText}>התראות ופעולות</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  content: { paddingHorizontal: 25, paddingTop: 40 },
  header: { fontSize: 22, fontFamily: FONTS.bold, color: "#1A3C40", textAlign: 'center', marginBottom: 20 },
  whiteBox: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  userSection: { flexDirection: 'row', alignItems: 'center' },
  userName: { marginRight: 12, fontFamily: FONTS.regular, fontSize: 16 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0' },
  backBtn: {
    marginTop: 40,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    elevation: 2
  },
  backText: { fontFamily: FONTS.bold, color: '#1A3C40' }
});
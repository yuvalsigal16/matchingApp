import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "../../src/theme/fonts";

export default function CommunityScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>טרקים אחרי צבא</Text>
        
        <View style={styles.whiteBox}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.row}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#B0BEC5" />
              <View style={styles.avatarPlaceholder} />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.fabGreen}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/discovery")}>
          <Text style={styles.backText}>גילוי וקהילה</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  content: { paddingHorizontal: 25, paddingTop: 40, alignItems: 'center' },
  header: { fontSize: 22, fontFamily: FONTS.bold, color: "#1A3C40", marginBottom: 20 },
  whiteBox: { backgroundColor: '#fff', borderRadius: 20, padding: 15, width: '100%', elevation: 2 },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  avatarPlaceholder: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#E0E0E0' },
  fabGreen: {
    backgroundColor: '#81C784',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#1A3C40'
  },
  backText: { fontFamily: FONTS.bold, color: '#1A3C40' }
});
import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "../../src/theme/fonts";

export default function ActiveChatsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>צ'אטים פעילים</Text>
        
        <View style={styles.whiteBox}>
          {[1, 2, 3, 4, 5].map((item) => (
            <TouchableOpacity key={item} style={styles.chatItem}>
              <View style={styles.chatText}>
                <Text style={styles.chatName}>שם המשתמש {item}</Text>
                <Text style={styles.lastMsg}>הודעה אחרונה שנשלחה...</Text>
              </View>
              <View style={styles.avatarLarge} />
            </TouchableOpacity>
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
  whiteBox: { backgroundColor: '#fff', borderRadius: 20, padding: 10 },
  chatItem: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  chatText: { marginRight: 15, alignItems: 'flex-end' },
  chatName: { fontFamily: FONTS.bold, fontSize: 16 },
  lastMsg: { fontFamily: FONTS.regular, fontSize: 12, color: '#666' },
  avatarLarge: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E0E0' },
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
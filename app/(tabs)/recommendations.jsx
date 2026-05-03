import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "../../src/theme/fonts";

export default function RecommendationsScreen() {
  const router = useRouter();

  const places = [
    { id: 1, name: "Daris", desc: "Private City - Theatre Exit", stars: "4.8" },
    { id: 2, name: "Exhostionis", desc: "Ancient City Golding Maks", stars: "4.5" },
    { id: 3, name: "Flent Casion", desc: "Nome, kka Cile With Indeed", stars: "4.9" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>המלצות מהעולם</Text>
        
        {places.map((place) => (
          <View key={place.id} style={styles.card}>
            <Ionicons name="heart-outline" size={20} color="#1A3C40" style={styles.heart} />
            <View style={styles.cardText}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeDesc}>{place.desc}</Text>
              <Text style={styles.stars}>⭐⭐⭐⭐⭐ {place.stars}</Text>
            </View>
            <View style={styles.imagePlaceholder} />
          </View>
        ))}

        <TouchableOpacity style={styles.fabGreen}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/discovery")}>
          <Text style={styles.backText}>גילוי וקהילה</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  content: { paddingHorizontal: 20, paddingTop: 40, alignItems: 'center', paddingBottom: 40 },
  header: { fontSize: 22, fontFamily: FONTS.bold, color: "#1A3C40", marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
    elevation: 2
  },
  heart: { position: 'absolute', top: 10, right: 10 },
  imagePlaceholder: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#E0E0E0' },
  cardText: { flex: 1, marginRight: 12, alignItems: 'flex-end' },
  placeName: { fontFamily: FONTS.bold, fontSize: 16, color: '#1A3C40' },
  placeDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#666', textAlign: 'right' },
  stars: { fontSize: 10, marginTop: 4 },
  fabGreen: {
    backgroundColor: '#81C784',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
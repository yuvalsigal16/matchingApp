import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { addRecommendation, getRecommendationsByTrip } from "../src/api/recommendationService";
import { getUserTrips } from "../src/api/tripService";
import { FONTS } from "../src/theme/fonts";
import BottomNav from "../../components/BottomNav";

export default function RecommendationsScreen() {
  const router = useRouter();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // טופס יצירת המלצה
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const userId = getUser()?.userID;
      const token = getToken();
      if (!userId || !token) return;

      const headers = { Authorization: `Bearer ${token}` };

      const tripsRes = await fetch(`${BASE_URL}/Trips/user/${userId}`, { headers });
      if (!tripsRes.ok) return;
      const userTrips = await tripsRes.json();

      const allRecs = await Promise.all(
        userTrips.map(async (trip) => {
          const recs = await getRecommendationsByTrip(trip.tripID).catch(() => []);
          return recs.map((r) => ({ ...r, tripName: trip.destination }));
        })
      );

      setRecommendations(allRecs.flat());
    } catch (err) {
      console.error("loadRecommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    try {
      const userId = getUser()?.userID;
      const userTrips = await getUserTrips(userId);
      setTrips(userTrips || []);
      setSelectedTripId(userTrips?.[0]?.tripID ?? null);
    } catch {
      setTrips([]);
    }
    setPlaceName("");
    setDescription("");
    setRating(0);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!placeName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם מקום");
      return;
    }
    if (!selectedTripId) {
      Alert.alert("שגיאה", "יש לבחור טיול");
      return;
    }

    setSubmitting(true);
    try {
      const userId = getUser()?.userID;
      await addRecommendation({
        userID: userId,
        tripID: selectedTripId,
        placeName: placeName.trim(),
        description: description.trim() || null,
        rating: rating || null,
        isAnonymous: false,
      });
      setModalVisible(false);
      loadRecommendations();
    } catch (err) {
      Alert.alert("שגיאה", err.message || "לא ניתן להוסיף המלצה");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    const r = rating || 0;
    return "⭐".repeat(r) + "☆".repeat(5 - r);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>המלצות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {recommendations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="star-outline" size={40} color="#aaa" />
            <Text style={styles.emptyText}>אין המלצות עדיין</Text>
          </View>
        ) : (
          recommendations.map((rec) => (
            <View key={rec.recommendationID} style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="location-outline" size={22} color="#1A3C40" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.title}>{rec.placeName}</Text>
                {rec.tripName && (
                  <Text style={styles.tripName}>בטיול: {rec.tripName}</Text>
                )}
                {rec.description ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {rec.description}
                  </Text>
                ) : null}
                <Text style={styles.stars}>{renderStars(rec.rating)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* כפתור פלוס */}
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal יצירת המלצה */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            {/* כותרת */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>המלצה חדשה</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1A3C40" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* בחירת טיול */}
              <Text style={styles.label}>טיול</Text>
              {trips.length === 0 ? (
                <Text style={styles.noTrips}>אין טיולים פעילים</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripPicker}>
                  {trips.map((t) => (
                    <Pressable
                      key={t.tripID}
                      style={[styles.tripChip, selectedTripId === t.tripID && styles.tripChipActive]}
                      onPress={() => setSelectedTripId(t.tripID)}
                    >
                      <Text style={[styles.tripChipText, selectedTripId === t.tripID && styles.tripChipTextActive]}>
                        {t.destination}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* שם המקום */}
              <Text style={styles.label}>שם המקום *</Text>
              <TextInput
                style={styles.input}
                placeholder="למשל: מסעדת פייר בפריז"
                placeholderTextColor="#aaa"
                value={placeName}
                onChangeText={setPlaceName}
                textAlign="right"
              />

              {/* תיאור */}
              <Text style={styles.label}>תיאור (אופציונלי)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="למה כדאי ללכת..."
                placeholderTextColor="#aaa"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlign="right"
                textAlignVertical="top"
              />

              {/* דירוג */}
              <Text style={styles.label}>דירוג</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => setRating(s)}>
                    <Ionicons
                      name={s <= rating ? "star" : "star-outline"}
                      size={32}
                      color="#F4C77B"
                    />
                  </Pressable>
                ))}
              </View>

              {/* כפתור שמירה */}
              <Pressable
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>הוסיפי המלצה</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNav active="discovery" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F2F5" },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  header: { fontSize: 20, fontFamily: FONTS.bold, color: "#1A3C40" },

  content: { paddingHorizontal: 20, paddingBottom: 120 },

  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#E7F3FF",
    justifyContent: "center", alignItems: "center",
  },
  cardText: { flex: 1, marginHorizontal: 12, alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: FONTS.bold, color: "#1A3C40" },
  tripName: { fontSize: 12, fontFamily: FONTS.regular, color: "#1877F2", marginTop: 2 },
  subtitle: { fontSize: 13, fontFamily: FONTS.regular, color: "#666", marginTop: 4, textAlign: "right" },
  stars: { fontSize: 13, marginTop: 6 },

  emptyBox: { marginTop: 80, alignItems: "center" },
  emptyText: { marginTop: 10, fontSize: 16, color: "#888", fontFamily: FONTS.regular },

  fab: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: "#1A3C40",
    width: 60, height: 60, borderRadius: 30,
    justifyContent: "center", alignItems: "center",
    elevation: 5,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, color: "#1A3C40" },

  label: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
    marginBottom: 8,
    marginTop: 14,
  },
  noTrips: { fontSize: 13, color: "#999", fontFamily: FONTS.regular, textAlign: "right" },

  tripPicker: { marginBottom: 4 },
  tripChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  tripChipActive: { backgroundColor: "#1A3C40", borderColor: "#1A3C40" },
  tripChipText: { fontSize: 13, fontFamily: FONTS.regular, color: "#444" },
  tripChipTextActive: { color: "#fff" },

  input: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#1A3C40",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputMulti: { height: 80 },

  starsRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 4,
  },

  submitBtn: {
    backgroundColor: "#1A3C40",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

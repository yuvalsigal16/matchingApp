import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { COLORS, FONTS } from "../src/theme";
import BottomNav from "../../components/BottomNav";

export default function RecommendationsScreen() {
  const router = useRouter();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations(true);
    setRefreshing(false);
  };

  const loadRecommendations = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const userId = getUser()?.userID;
      const token = getToken();
      if (!userId || !token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // ה-route בשרת הוא /Trip/user (יחיד). שימוש ב-/Trips גרם ל-404 וההמלצות לא נטענו.
      const tripsRes = await fetch(`${BASE_URL}/Trip/user/${userId}`, { headers });
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
      if (!silent) setLoading(false);
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
      await loadRecommendations();
      // משוב ברור שההמלצה נשמרה — קודם המשתמשת לא ידעה אם זה עבד.
      if (Platform.OS === "web") window.alert("ההמלצה נוספה בהצלחה");
      else Alert.alert("נוסף בהצלחה ✨", "ההמלצה שלך נוספה ומופיעה ברשימה");
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
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.header}>המלצות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
      >
        {recommendations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="star-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>עדיין אין המלצות</Text>
            <Text style={styles.emptyText}>
              שתפו מקום שאהבתם בטיול — לחצו על ה־＋ למטה כדי להוסיף את ההמלצה הראשונה
            </Text>
          </View>
        ) : (
          recommendations.map((rec) => (
            <View key={rec.recommendationID} style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="location-outline" size={22} color={COLORS.brand} />
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
        <Ionicons name="add" size={28} color={COLORS.onBrand} />
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
                <Ionicons name="close" size={24} color={COLORS.brand} />
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
                placeholderTextColor={COLORS.textMuted}
                value={placeName}
                onChangeText={setPlaceName}
                textAlign="right"
              />

              {/* תיאור */}
              <Text style={styles.label}>תיאור (אופציונלי)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="למה כדאי ללכת..."
                placeholderTextColor={COLORS.textMuted}
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
                      color={COLORS.amber}
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
                  <ActivityIndicator color={COLORS.onBrand} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  header: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.brand },

  content: { paddingHorizontal: 20, paddingBottom: 120 },

  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center", alignItems: "center",
  },
  cardText: { flex: 1, marginHorizontal: 12, alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.brand },
  tripName: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.primary, marginTop: 2 },
  subtitle: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4, textAlign: "right" },
  stars: { fontSize: 13, marginTop: 6 },

  emptyBox: { marginTop: 80, alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { marginTop: 12, fontSize: 17, color: COLORS.brand, fontFamily: FONTS.bold },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 20,
  },

  fab: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: COLORS.brand,
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
    backgroundColor: COLORS.surface,
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
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.brand },

  label: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 8,
    marginTop: 14,
  },
  noTrips: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: "right" },

  tripPicker: { marginBottom: 4 },
  tripChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tripChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tripChipText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  tripChipTextActive: { color: COLORS.onBrand },

  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMulti: { height: 80 },

  starsRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 4,
  },

  submitBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.onBrand, fontSize: 16, fontFamily: FONTS.bold },
});

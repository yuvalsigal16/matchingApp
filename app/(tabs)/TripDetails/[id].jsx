import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";
import { FONTS } from "../../src/theme/fonts";

export default function TripDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params?.id || params?.tripId;

  const [trip, setTrip] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${
      (d.getMonth() + 1).toString().padStart(2, "0")
    }/${d.getFullYear()}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [tripRes, participantsRes] = await Promise.all([
          fetch(`${BASE_URL}/Trips/${id}`, { headers }),
          fetch(`${BASE_URL}/Trips/${id}/participants`, { headers }),
        ]);

        const tripText = await tripRes.text();
        const participantsText = await participantsRes.text();

        if (!tripRes.ok) throw new Error("שגיאה בטעינת הטיול");

        setTrip(tripText ? JSON.parse(tripText) : null);
        setParticipants(participantsText ? JSON.parse(participantsText) : []);
      } catch (err) {
        Alert.alert("שגיאה", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadData();
  }, [id]);

  const handleDeleteTrip = () => {
    Alert.alert(
      "מחיקת טיול",
      "האם אתה בטוח שברצונך למחוק את הטיול?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const token = getToken();

              const res = await fetch(`${BASE_URL}/Trips/${id}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });

              if (!res.ok) throw new Error("מחיקת טיול נכשלה");

              Alert.alert("נמחק", "הטיול נמחק בהצלחה", [
                { text: "אישור", onPress: () => router.replace("/MyTrips") },
              ]);
            } catch (err) {
              Alert.alert("שגיאה", err.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>לא נמצא טיול</Text>
      </SafeAreaView>
    );
  }

  const isPast = new Date(trip.endDate) < new Date();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>פרטי טיול</Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip Card */}
        <View style={[styles.card, isPast && styles.cardPast]}>
          <Text style={styles.title}>{trip.destination}</Text>

          <Text style={styles.label}>יעד</Text>
          <Text style={styles.value}>{trip.destination}</Text>

          <Text style={styles.label}>תאריכים</Text>
          <Text style={styles.value}>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </Text>

          <Text style={styles.label}>סטטוס</Text>
          <Text style={styles.value}>{trip.status}</Text>
        </View>

        {/* Participants */}
        <Text style={styles.sectionTitle}>משתתפים בטיול</Text>

        <View style={styles.card}>
          {participants.length === 0 ? (
            <Text style={styles.value}>אין משתתפים עדיין</Text>
          ) : (
            participants.map((p, index) => (
              <View key={index} style={styles.participant}>
                <Ionicons name="person-circle-outline" size={22} color="#1A3C40" />
                <Text style={styles.value}>
                  {p.firstName} {p.lastName}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/EditTrip/${id}`)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>ערוך טיול</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteTrip}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>מחק טיול</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    padding: 20,
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  cardPast: {
    backgroundColor: "#E0E0E0",
  },

  title: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 10,
    color: "#1A3C40",
  },

  label: {
    fontSize: 12,
    color: "#777",
    marginTop: 10,
    textAlign: "right",
  },

  value: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#222",
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginBottom: 10,
    color: "#1A3C40",
    textAlign: "right",
  },

  participant: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  actions: {
    marginTop: 10,
    gap: 10,
  },

  editBtn: {
    flexDirection: "row-reverse",
    backgroundColor: "#1A3C40",
    padding: 14,
    borderRadius: 12,
    justifyContent: "center",
    gap: 10,
  },

  deleteBtn: {
    flexDirection: "row-reverse",
    backgroundColor: "#C0392B",
    padding: 14,
    borderRadius: 12,
    justifyContent: "center",
    gap: 10,
  },

  btnText: {
    color: "#fff",
    fontFamily: FONTS.bold,
  },
});
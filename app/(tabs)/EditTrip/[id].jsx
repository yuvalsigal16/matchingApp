import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FONTS } from "../../../theme/fonts";
import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";

export default function EditTrip() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const token = getToken();

        const res = await fetch(`${BASE_URL}/Trips/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) throw new Error("שגיאה בטעינת טיול");

        setDestination(data.destination || "");
        setStartDate(data.startDate || "");
        setEndDate(data.endDate || "");
        setStatus(data.status || "Active");
      } catch (err) {
        Alert.alert("שגיאה", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadTrip();
  }, [id]);

  const handleSave = async () => {
    if (!destination.trim()) {
      Alert.alert("שגיאה", "חובה להזין יעד");
      return;
    }

    setSaving(true);

    try {
      const token = getToken();

      const res = await fetch(`${BASE_URL}/Trips/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          TripID: id,
          Destination: destination,
          StartDate: startDate,
          EndDate: endDate,
          Status: status,
        }),
      });

      if (!res.ok) throw new Error("עדכון טיול נכשל");

      Alert.alert("עודכן", "הטיול עודכן בהצלחה", [
        { text: "אישור", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("שגיאה", err.message);
    } finally {
      setSaving(false);
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>

        <Text style={styles.title}>עריכת טיול</Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>יעד</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          textAlign="right"
        />

        <Text style={styles.label}>תאריך התחלה</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          textAlign="right"
        />

        <Text style={styles.label}>תאריך סיום</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          textAlign="right"
        />

        <Text style={styles.label}>סטטוס</Text>
        <TextInput
          style={styles.input}
          value={status}
          onChangeText={setStatus}
          textAlign="right"
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>שמור שינויים</Text>
          )}
        </TouchableOpacity>
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

  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  content: {
    padding: 20,
  },

  label: {
    textAlign: "right",
    marginTop: 10,
    marginBottom: 5,
    color: "#777",
    fontSize: 12,
  },

  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },

  saveBtn: {
    backgroundColor: "#1A3C40",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontFamily: FONTS.bold,
  },
});

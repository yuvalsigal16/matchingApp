import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";
import { COLORS, FONTS } from "../../src/theme";

function toIsoDateOnly(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseServerDate(str) {
  if (!str) return null;
  const match = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return null;
}

export default function EditTrip() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [status, setStatus] = useState("Active");

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${BASE_URL}/Trip/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const text = await res.text();
        if (!res.ok) throw new Error("שגיאה בטעינת טיול");
        const data = text ? JSON.parse(text) : null;
        setDestination(data.destination || "");
        setStartDate(parseServerDate(data.startDate));
        setEndDate(parseServerDate(data.endDate));
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
    if (!startDate) {
      Alert.alert("שגיאה", "חובה לבחור תאריך התחלה");
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/Trip`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          TripID: Number(id),
          Destination: destination,
          StartDate: toIsoDateOnly(startDate),
          EndDate: endDate ? toIsoDateOnly(endDate) : null,
          Status: status,
        }),
      });
      if (!res.ok) throw new Error("עדכון טיול נכשל");
      if (Platform.OS === "web") {
        window.alert("הטיול עודכן בהצלחה");
        router.back();
      } else {
        Alert.alert("עודכן", "הטיול עודכן בהצלחה", [
          { text: "אישור", onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Alert.alert("שגיאה", err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDisplay = (date) => {
    if (!date) return "לא נבחר";
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const renderDateField = (label, date, setDate, showPicker, setShowPicker) => {
    if (Platform.OS === "web") {
      const val = date ? toIsoDateOnly(date) : "";
      return (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{label}</Text>
          <input
            type="date"
            value={val}
            onChange={(e) => {
              if (!e.target.value) { setDate(null); return; }
              const [y, m, d] = e.target.value.split("-").map(Number);
              setDate(new Date(y, m - 1, d));
            }}
            style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              backgroundColor: "#fff", fontSize: 15, textAlign: "right",
              fontFamily: "inherit", direction: "ltr", cursor: "pointer",
              boxSizing: "border-box",
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateBtnText}>{formatDisplay(date)}</Text>
          <Ionicons name="calendar-outline" size={18} color={COLORS.brand} />
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={(_, selected) => {
              setShowPicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}
      </View>
    );
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.title}>עריכת טיול</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>יעד</Text>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              backgroundColor: "#fff", fontSize: 15, textAlign: "right",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
            placeholder="יעד הטיול"
          />
        </View>

        {renderDateField("תאריך יציאה", startDate, setStartDate, showStartPicker, setShowStartPicker)}
        {renderDateField("תאריך חזרה", endDate, setEndDate, showEndPicker, setShowEndPicker)}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.onBrand} />
          ) : (
            <Text style={styles.saveText}>שמור שינויים</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  content: { padding: 20, paddingBottom: 60 },

  fieldGroup: { marginBottom: 16 },

  label: {
    textAlign: "right",
    marginBottom: 6,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.regular,
  },

  dateBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
  },

  dateBtnText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },

  saveBtn: {
    backgroundColor: COLORS.brand,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },

  saveText: {
    color: COLORS.onBrand,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
});

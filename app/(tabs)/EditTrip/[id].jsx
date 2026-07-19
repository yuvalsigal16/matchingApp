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
import { Calendar } from "lucide-react-native";

import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../../src/theme";
import Screen from "../../../components/ui/Screen";
import ScreenHeader from "../../../components/ui/ScreenHeader";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

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

  // שדה תאריך — מנגנון הבחירה נשמר כמות שהוא (web: input[type=date], native: DateTimePicker);
  // רק המעטפת הויזואלית מטוקנת ומיושרת לשפת שדה ה-Input.
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
              width: "100%", padding: 15, borderRadius: RADIUS.lg,
              border: `1.5px solid ${COLORS.hairline}`,
              backgroundColor: COLORS.surface, fontSize: 16, textAlign: "right",
              color: COLORS.text, fontFamily: "inherit", direction: "ltr",
              cursor: "pointer", boxSizing: "border-box",
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
          <Calendar size={18} color={COLORS.brand} strokeWidth={2} />
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
      <Screen>
        <ScreenHeader title="עריכת טיול" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="עריכת טיול" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>יעד</Text>
          <Input
            value={destination}
            onChangeText={setDestination}
            placeholder="יעד הטיול"
            accessibilityLabel="יעד הטיול"
          />
        </View>

        {renderDateField("תאריך יציאה", startDate, setStartDate, showStartPicker, setShowStartPicker)}
        {renderDateField("תאריך חזרה", endDate, setEndDate, showEndPicker, setShowEndPicker)}

        <Button
          label="שמירת שינויים"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  content: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },

  fieldGroup: { marginBottom: SPACING.lg },

  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginBottom: SPACING.xs + 2,
  },

  // מפעיל בחירת תאריך (native) — במראה שדה Input: גובה 54, מסגרת-שיער, פינות RADIUS.lg.
  dateBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    height: 54,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
  },
  dateBtnText: { ...TYPOGRAPHY.body, color: COLORS.text },

  saveBtn: { marginTop: SPACING.md },
});

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { addPlannerEvent, subscribePlanner } from "../src/api/tripPlannerService";
import { COLORS, FONTS } from "../src/theme";
import Snackbar from "../../components/Snackbar";

export default function TripPlanner() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();

  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false); // האם התקבל snapshot ראשון (כולל ריק)
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState(""); // משוב הצלחה קצר
  const titleRef = useRef(null); // מיקוד השדה הראשון מכפתור ה-Empty State

  useEffect(() => {
    const unsubscribe = subscribePlanner(id, (evts) => {
      setEvents(evts);
      setLoaded(true);
    });
    return unsubscribe;
  }, [id]);

  const canSave = !!title.trim() && !!time.trim() && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await addPlannerEvent(id, {
        title: title.trim(),
        time: time.trim(),
        createdAt: Date.now(),
      });
      setTitle("");
      setTime("");
      setSnack("האירוע נוסף ליומן");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.bigTitle} numberOfLines={1}>
          {name || "יומן הטיול"}
        </Text>
        <View style={styles.subtitleRow}>
          <Ionicons name="calendar" size={15} color={COLORS.amberDark} />
          <Text style={styles.subtitle}>תכנון משותף</Text>
        </View>
      </View>

      {/* טופס הוספת אירוע — נעוץ למעלה כדי שיישאר נגיש גם ברשימה ארוכה */}
      <View style={styles.formWrap}>
        <View style={styles.formCard}>
          <TextInput
            ref={titleRef}
            style={styles.input}
            placeholder="מה מתכננים?"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />
          <TextInput
            style={styles.input}
            placeholder="שעה (לדוגמה: 09:00)"
            placeholderTextColor={COLORS.textMuted}
            value={time}
            onChangeText={setTime}
            textAlign="right"
          />
          <TouchableOpacity
            style={[styles.button, !canSave && styles.buttonDisabled]}
            onPress={save}
            disabled={!canSave}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="הוספת אירוע ליומן"
          >
            {saving ? (
              <ActivityIndicator color={COLORS.onBrand} size="small" />
            ) : (
              <>
                <Ionicons name="add" size={20} color={COLORS.onBrand} />
                <Text style={styles.buttonText}>הוספה ליומן</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* טעינה / ריק / רשימה */}
        {!loaded ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.stateSub}>טוען את היומן...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.stateBox}>
            <View style={styles.stateIcon}>
              <Ionicons name="calendar-outline" size={38} color={COLORS.brand} />
            </View>
            <Text style={styles.stateTitle}>עדיין אין אירועים ביומן</Text>
            <Text style={styles.stateSub}>
              זה המקום שבו תתכננו יחד את הטיול. הוסיפו את האירוע הראשון.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => titleRef.current?.focus()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="הוספת אירוע ראשון"
            >
              <Ionicons name="add" size={18} color={COLORS.onBrand} />
              <Text style={styles.emptyBtnText}>הוספת אירוע ראשון</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {events.map((event, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="time-outline" size={18} color={COLORS.brand} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  {event.time ? <Text style={styles.cardTime}>{event.time}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Snackbar text={snack} onHide={() => setSnack("")} bottom={24} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    alignItems: "flex-end",
  },
  bigTitle: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text, textAlign: "right" },
  subtitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary },

  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 30 },

  // ── טופס (נעוץ) ──
  formWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 2,
  },
  buttonDisabled: { backgroundColor: COLORS.textMuted },
  buttonText: { color: COLORS.onBrand, fontSize: 15, fontFamily: FONTS.bold },

  // ── רשימת אירועים ──
  list: { gap: 10 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, textAlign: "right" },
  cardTime: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },

  // ── States ──
  stateBox: { alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingTop: 40, gap: 12 },
  stateIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  stateTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, textAlign: "center" },
  stateSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.brand,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 6,
  },
  emptyBtnText: { color: COLORS.onBrand, fontFamily: FONTS.bold, fontSize: 14 },
});

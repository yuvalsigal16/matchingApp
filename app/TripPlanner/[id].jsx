import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarPlus, Clock, Plus, Users } from "lucide-react-native";

import { addPlannerEvent, subscribePlanner } from "../src/api/tripPlannerService";
import { COLORS, SPACING, TYPOGRAPHY } from "../src/theme";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import ListRow from "../../components/ui/ListRow";
import EmptyState from "../../components/ui/EmptyState";
import SectionLabel from "../../components/ui/SectionLabel";
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
    <Screen>
      <ScreenHeader title={name || "יומן הטיול"} onBack={() => router.back()} />

      {/* חיווי תכנון-משותף — Users במקום ענבר (ענבר שמור לניקוד התאמה) */}
      <View style={styles.lead}>
        <Users size={15} color={COLORS.brand} strokeWidth={2} />
        <Text style={styles.leadText}>תכנון משותף</Text>
      </View>

      {/* טופס הוספה נעוץ וקומפקטי — הוספה מהירה, אך היומן הוא הגיבור */}
      <View style={styles.form}>
        <Input
          ref={titleRef}
          value={title}
          onChangeText={setTitle}
          placeholder="מה מתכננים?"
          accessibilityLabel="כותרת האירוע"
        />
        <View style={styles.formRow}>
          <Input
            value={time}
            onChangeText={setTime}
            placeholder="שעה (09:00)"
            accessibilityLabel="שעת האירוע"
            style={styles.timeInput}
          />
          <Button
            label="הוסף"
            Icon={Plus}
            onPress={save}
            loading={saving}
            disabled={!canSave}
            size="lg"
            accessibilityLabel="הוספת אירוע ליומן"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!loaded ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.loadingText}>טוען את היומן...</Text>
          </View>
        ) : events.length === 0 ? (
          <EmptyState
            Icon={CalendarPlus}
            title="עדיין אין אירועים ביומן"
            subtitle="זה המקום שבו תתכננו יחד את הטיול. הוסיפו את האירוע הראשון."
            actionLabel="הוספת אירוע ראשון"
            onAction={() => titleRef.current?.focus()}
            style={styles.empty}
          />
        ) : (
          <View>
            <SectionLabel
              title="היומן המשותף"
              count={events.length}
              style={styles.sectionLabel}
            />
            <View style={styles.list}>
              {events.map((event, i) => (
                <ListRow
                  key={i}
                  Icon={Clock}
                  title={event.title}
                  subtitle={event.time || undefined}
                  trailing={null}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Snackbar text={snack} onHide={() => setSnack("")} bottom={24} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  leadText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },

  // ── טופס נעוץ קומפקטי (2 שורות): כותרת, ואז שעה + כפתור הוספה ──
  form: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  formRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
  },
  timeInput: { flex: 1 },

  scrollView: { flex: 1 },
  scroll: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxxl,
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: SPACING.xxxl,
    gap: SPACING.md,
  },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: "center" },

  empty: { marginTop: SPACING.xxxl },

  sectionLabel: { marginBottom: SPACING.sm },
  list: { gap: SPACING.sm },
});

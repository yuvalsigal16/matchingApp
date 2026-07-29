import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  BedDouble,
  Calendar as CalendarIcon,
  Camera,
  MapPin,
  Plane,
  Ticket,
  Trash2,
  Utensils,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../../app/src/theme";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { EVENT_TYPES, parseHM, toIsoDate } from "../../app/src/calendar/eventModel";

const TYPE_ICON = {
  flight: Plane,
  hotel: BedDouble,
  restaurant: Utensils,
  attraction: Camera,
  activity: Ticket,
  other: MapPin,
};

// "YYYY-MM-DD" → Date מקומי, אחרת null.
function isoToDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function formatDisplay(date) {
  if (!date) return "בחירת תאריך";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}/${date.getFullYear()}`;
}

// Modal רב-שימושי ליצירה/עריכה של אירוע ביומן המשותף.
// props: visible, mode ('create'|'edit'), initial (event|null), defaultDate (iso),
//        onSubmit(formFields), onDelete, onClose, saving, deleting
export default function EventFormModal({
  visible,
  mode = "create",
  initial = null,
  defaultDate = "",
  onSubmit,
  onDelete,
  onClose,
  saving = false,
  deleting = false,
}) {
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("activity");
  const [date, setDate] = useState(null); // Date | null
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");

  // איפוס/זריעה בכל פתיחה — לפי initial (עריכה) או ברירות מחדל (יצירה).
  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title || "");
    setType(initial?.type || "activity");
    setDate(isoToDate(initial?.date || defaultDate));
    setStartTime(initial?.startTime || initial?.time || "");
    setEndTime(initial?.endTime || "");
    setLocation(initial?.location || "");
    setDescription(initial?.description || "");
    setShowPicker(false);
    setError("");
  }, [visible, initial, defaultDate]);

  const submit = () => {
    if (!title.trim()) {
      setError("יש להזין כותרת לאירוע");
      return;
    }
    if (!date) {
      setError("יש לבחור תאריך");
      return;
    }
    if (startTime.trim() && !parseHM(startTime)) {
      setError("שעת התחלה לא תקינה (למשל 09:00)");
      return;
    }
    if (endTime.trim() && !parseHM(endTime)) {
      setError("שעת סיום לא תקינה (למשל 11:00)");
      return;
    }
    setError("");
    onSubmit?.({
      title: title.trim(),
      type,
      date: toIsoDate(date),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      location: location.trim(),
      description: description.trim(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="סגירה"
            >
              <X size={22} color={COLORS.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {mode === "edit" ? "עריכת אירוע" : "אירוע חדש"}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>כותרת</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="למשל: ארוחת ערב בלרנקה"
              accessibilityLabel="כותרת האירוע"
            />

            <Text style={styles.label}>סוג</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {EVENT_TYPES.map((t) => {
                const Icon = TYPE_ICON[t.key] || MapPin;
                const active = type === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setType(t.key)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t.label}
                  >
                    <Icon
                      size={15}
                      color={active ? COLORS.onBrand : COLORS.textSecondary}
                      strokeWidth={2}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>תאריך</Text>
            {Platform.OS === "web" ? (
              <View style={styles.webDateWrap}>
                <input
                  type="date"
                  value={date ? toIsoDate(date) : ""}
                  onChange={(e) => {
                    if (!e.target.value) return setDate(null);
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    setDate(new Date(y, m - 1, d));
                  }}
                  style={webDateStyle}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => setShowPicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="בחירת תאריך"
                >
                  <Text style={styles.dateBtnText}>{formatDisplay(date)}</Text>
                  <CalendarIcon size={18} color={COLORS.brand} strokeWidth={2} />
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
              </>
            )}

            <View style={styles.timesRow}>
              <View style={styles.timeCol}>
                <Text style={styles.label}>שעת התחלה</Text>
                <Input
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  maxLength={5}
                  accessibilityLabel="שעת התחלה"
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.label}>שעת סיום</Text>
                <Input
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="11:00"
                  maxLength={5}
                  accessibilityLabel="שעת סיום"
                />
              </View>
            </View>

            <Text style={styles.label}>מיקום</Text>
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="שם מקום / כתובת"
              accessibilityLabel="מיקום"
            />

            <Text style={styles.label}>הערות</Text>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="פרטים נוספים (לא חובה)"
              accessibilityLabel="הערות"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={mode === "edit" ? "שמירת שינויים" : "הוספת אירוע"}
              onPress={submit}
              loading={saving}
              disabled={saving || deleting}
              size="lg"
              accessibilityLabel="שמירת האירוע"
            />
            {mode === "edit" ? (
              <Button
                label="מחיקת אירוע"
                Icon={Trash2}
                onPress={onDelete}
                loading={deleting}
                disabled={saving || deleting}
                variant="ghost"
                size="md"
                style={styles.deleteBtn}
                accessibilityLabel="מחיקת האירוע"
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const webDateStyle = {
  height: 50,
  width: "100%",
  borderRadius: 14,
  border: `1.5px solid ${COLORS.hairline}`,
  backgroundColor: COLORS.surface,
  color: COLORS.text,
  fontSize: 16,
  padding: "0 16px",
  fontFamily: FONTS.regular,
  textAlign: "right",
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  backdrop: { ...StyleSheet.absoluteFillObject },

  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: "right" },

  body: { paddingBottom: SPACING.md },
  label: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },

  chips: { flexDirection: "row-reverse", gap: SPACING.sm, paddingVertical: 2 },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bold, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.onBrand },

  webDateWrap: { width: "100%" },
  dateBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    height: 54,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
  },
  dateBtnText: { ...TYPOGRAPHY.body, color: COLORS.text },

  timesRow: { flexDirection: "row-reverse", gap: SPACING.md },
  timeCol: { flex: 1 },

  error: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    textAlign: "right",
    marginTop: SPACING.md,
  },

  footer: { paddingTop: SPACING.md, gap: SPACING.sm },
  deleteBtn: { alignSelf: "stretch" },
});

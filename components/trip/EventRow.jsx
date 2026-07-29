import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  BedDouble,
  Camera,
  CalendarPlus,
  MapPin,
  Plane,
  Ticket,
  Utensils,
} from "lucide-react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../../app/src/theme";
import { formatTimeRange } from "../../app/src/calendar/eventModel";

// אייקון לכל סוג אירוע. ברירת מחדל שקטה: MapPin. (בלי אמוji — לפי ה-Design Bible.)
const TYPE_ICON = {
  flight: Plane,
  hotel: BedDouble,
  restaurant: Utensils,
  attraction: Camera,
  activity: Ticket,
  other: MapPin,
};

// שורת אירוע ביומן המשותף. Presentational בלבד — כל הפעולות מגיעות מ-props.
// לחיצה על השורה → עריכה; לחיצה על אייקון היומן → הוספה ליומן הטלפון.
export default function EventRow({ event, onEdit, onAddToPhone }) {
  const Icon = TYPE_ICON[event?.type] || MapPin;
  const timeRange = formatTimeRange(event);
  const subtitle = [timeRange, event?.location].filter(Boolean).join(" · ");

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onEdit?.(event)}
      accessibilityRole="button"
      accessibilityLabel={`עריכת ${event?.title || "אירוע"}`}
    >
      <View style={styles.iconCircle}>
        <Icon size={18} color={COLORS.brand} strokeWidth={2} />
      </View>

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {event?.title || "אירוע"}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => onAddToPhone?.(event)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`הוספת ${event?.title || "אירוע"} ליומן הטלפון`}
        style={styles.addBtn}
      >
        <CalendarPlus size={18} color={COLORS.brand} strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  text: { flex: 1, alignItems: "flex-end" },
  title: { ...TYPOGRAPHY.bodyBold, color: COLORS.text, textAlign: "right" },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandLight,
  },
});

// JourneyTicket — האלמנט החתימתי של צמד חמד: כרטיס-עלייה למסע משותף.
// גוף טורקיז, שני האווטרים של המטיילים (חיבור), היעד כפני-התצוגה, קו-ניקוב עם
// חיתוכי-קצה (torn ticket), ופרטי תאריכים/סטטוס. רגע-פסגה אחד — שקט ופרימיום,
// בלי גרדיאנטים/אנימציות/קונפטי. משתמש ב-Avatar ובטוקנים בלבד. אינו Card גנרי.
import { StyleSheet, Text, View } from "react-native";
import { Check, Plane } from "lucide-react-native";

import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../../app/src/theme";
import Avatar from "./Avatar";

// שדה-כרטיס קטן (ערך מעל תווית) — כתב onBrand על גוף הטיל.
function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function JourneyTicket({
  destination,
  dateText,
  statusText,
  travelerAName,
  travelerAImage,
  travelerBName,
  travelerBImage,
  style,
}) {
  return (
    <View style={[styles.ticket, style]}>
      {/* אייברו — ממסגר את האלמנט ככרטיס-עלייה */}
      <View style={styles.eyebrow}>
        <Plane size={13} color={COLORS.onBrand} strokeWidth={2} />
        <Text style={styles.eyebrowText}>כרטיס למסע משותף</Text>
      </View>

      {/* שני המטיילים — אווטרים חופפים + חותם-חיבור */}
      <View style={styles.pairWrap}>
        <View style={styles.pair}>
          <Avatar uri={travelerAImage} name={travelerAName} size="lg" ring style={styles.avA} />
          <Avatar uri={travelerBImage} name={travelerBName} size="lg" ring style={styles.avB} />
        </View>
        <View style={styles.connBadge}>
          <Check size={14} color={COLORS.success} strokeWidth={3} />
        </View>
      </View>

      {/* היעד — פני התצוגה של הכרטיס */}
      <Text style={styles.destination} numberOfLines={1}>
        {destination || "המסע שלכם"}
      </Text>

      {/* קו-ניקוב עם חיתוכי-קצה (torn ticket) */}
      <View style={styles.perfBand}>
        <View style={styles.perfLine} />
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {/* פרטי הכרטיס */}
      <View style={styles.stubRow}>
        <Field label="תאריכים" value={dateText || "—"} />
        <Field label="סטטוס" value={statusText} />
        <Field label="מטיילים" value="2" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    ...SHADOWS.md,
  },

  eyebrow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: SPACING.md,
  },
  eyebrowText: {
    ...TYPOGRAPHY.tiny,
    fontFamily: FONTS.medium,
    color: COLORS.onBrand,
    opacity: 0.85,
    letterSpacing: 0.3,
  },

  // ── זוג האווטרים + חותם-החיבור ──
  pairWrap: { alignItems: "center" },
  pair: { flexDirection: "row", alignItems: "center" },
  avA: { marginRight: -12, zIndex: 2 },
  avB: { marginLeft: -12, zIndex: 1 },
  connBadge: {
    marginTop: -14,
    width: 26,
    height: 26,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
    ...SHADOWS.sm,
  },

  destination: {
    ...TYPOGRAPHY.h2,
    fontFamily: FONTS.extraBold,
    color: COLORS.onBrand,
    textAlign: "center",
    marginTop: SPACING.md,
  },

  // ── קו-ניקוב במלוא-הרוחב + חיתוכי-קצה בגוון הרקע ──
  perfBand: {
    alignSelf: "stretch",
    marginHorizontal: -SPACING.xl,
    marginVertical: SPACING.lg,
    height: 16,
    justifyContent: "center",
  },
  perfLine: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: COLORS.onBrand,
    opacity: 0.3,
  },
  notch: {
    position: "absolute",
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  notchLeft: { left: -8 },
  notchRight: { right: -8 },

  // ── פרטי הכרטיס ──
  stubRow: {
    alignSelf: "stretch",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  field: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: SPACING.xs },
  fieldValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.onBrand,
    textAlign: "center",
  },
  fieldLabel: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.onBrand,
    opacity: 0.7,
    textAlign: "center",
  },
});

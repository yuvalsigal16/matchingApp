import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { MapPin, Route } from "lucide-react-native";

import { approveTripLink, getTripLink, rejectTripLink } from "../src/api/tripLinkService";
import { getUserProfile } from "../src/api/userProfileService";
import { getToken } from "../src/auth/authStore";
import { BASE_URL } from "../src/api/config";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Snackbar from "../../components/Snackbar";

// תאריך → DD/MM/YYYY (ניטרלי-locale). null → "".
function formatDate(raw) {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function TripLinkApproval() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [req, setReq] = useState(null); // { matchID, tripID, requestedByUserID, status }
  const [requesterName, setRequesterName] = useState("");
  const [trip, setTrip] = useState(null); // { destination, startDate, endDate }
  const [acting, setActing] = useState(false);
  const [snack, setSnack] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getTripLink(requestId);
        if (!alive) return;
        setReq(data);

        // שם המבקש (שירות קיים) + פרטי הטיול (fetch ישיר, דפוס קיים כמו MatchingSuccess).
        // כישלון בכל אחד מהם אינו קריטי — המסך עדיין מציג את הפעולה.
        try {
          const profile = await getUserProfile(data.requestedByUserID);
          if (alive && profile) {
            const name = [profile.firstName || profile.FirstName, profile.lastName || profile.LastName]
              .filter(Boolean).join(" ").trim();
            if (name) setRequesterName(name);
          }
        } catch {}
        try {
          const token = getToken();
          const r = await fetch(`${BASE_URL}/Trip/${data.tripID}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (alive && r.ok) setTrip(await r.json());
        } catch {}
      } catch {
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestId]);

  // ממפה שגיאת שרת להודעה ידידותית (בלי טקסט טכני).
  const friendlyError = (err) => {
    const m = String(err?.message || "").toLowerCase();
    if (m.includes("pending") || m.includes("not found") || m.includes("404"))
      return "הבקשה כבר אינה פעילה";
    return "לא ניתן להתחבר כרגע. נסו שוב מאוחר יותר.";
  };

  const onApprove = async () => {
    if (acting) return;
    setActing(true);
    try {
      const res = await approveTripLink(requestId);
      const matchID = res?.matchID ?? req?.matchID;
      setSnack("הטיול קושר בהצלחה");
      setTimeout(() => router.replace(`/chat/${matchID}`), 900);
    } catch (err) {
      setSnack(friendlyError(err));
      setActing(false);
    }
  };

  const onReject = async () => {
    if (acting) return;
    setActing(true);
    try {
      await rejectTripLink(requestId);
      setSnack("הבקשה נדחתה");
      setTimeout(() => router.back(), 900);
    } catch (err) {
      setSnack(friendlyError(err));
      setActing(false);
    }
  };

  const header = <ScreenHeader title="בקשה לקישור טיול" onBack={() => router.back()} />;

  if (loading) {
    return (
      <Screen>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      </Screen>
    );
  }

  if (loadError || !req) {
    return (
      <Screen>
        {header}
        <EmptyState
          Icon={Route}
          title="לא ניתן לטעון את הבקשה"
          subtitle="ייתכן שהבקשה כבר טופלה. נסו שוב מאוחר יותר."
          style={styles.empty}
        />
      </Screen>
    );
  }

  const isPending = String(req.status || "").toLowerCase() === "pending";
  const who = requesterName || "שותף/ה שלך";
  const dest = trip?.destination || "טיול";
  const dates = trip ? [formatDate(trip.startDate), formatDate(trip.endDate)].filter(Boolean).join(" – ") : "";

  return (
    <Screen>
      {header}

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.iconCircle}>
            <Route size={26} color={COLORS.brand} strokeWidth={2} />
          </View>
          <Text style={styles.lead}>
            {who} רוצה להפוך את השיחה שלכם לטיול משותף
          </Text>

          <View style={styles.tripBox}>
            <View style={styles.tripRow}>
              <MapPin size={16} color={COLORS.brand} strokeWidth={2} />
              <Text style={styles.tripDest} numberOfLines={1}>{dest}</Text>
            </View>
            {dates ? <Text style={styles.tripDates}>{dates}</Text> : null}
          </View>

          <Text style={styles.note}>
            אם תאשרו, השיחה תהפוך למרחב תכנון משותף — עם יומן, מסלול ורשימת משימות.
          </Text>
        </Card>

        {isPending ? (
          <View style={styles.actions}>
            <Button
              label="אישור וקישור הטיול"
              onPress={onApprove}
              loading={acting}
              disabled={acting}
              variant="primary"
              size="lg"
            />
            <Button
              label="דחייה"
              onPress={onReject}
              disabled={acting}
              variant="secondary"
              size="md"
              style={styles.rejectBtn}
            />
          </View>
        ) : (
          <Text style={styles.inactive}>הבקשה כבר אינה פעילה.</Text>
        )}
      </ScrollView>

      <Snackbar text={snack} onHide={() => setSnack("")} bottom={24} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { marginTop: SPACING.xxxl },
  body: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xl },

  card: { alignItems: "center", paddingVertical: SPACING.xl },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  lead: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  tripBox: {
    alignSelf: "stretch",
    backgroundColor: COLORS.backgroundSunk,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    gap: 4,
  },
  tripRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  tripDest: { ...TYPOGRAPHY.bodyBold, color: COLORS.text },
  tripDates: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  note: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },

  actions: { marginTop: SPACING.xl, gap: SPACING.sm },
  rejectBtn: { alignSelf: "stretch" },
  inactive: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xl,
  },
});

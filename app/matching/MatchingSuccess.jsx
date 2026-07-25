import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BedDouble,
  Check,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  Plane,
  X,
} from "lucide-react-native";

import { getMatchById } from "../src/api/chatService";
import { getUserProfile } from "../src/api/userProfileService";
import { getUserTrips } from "../src/api/tripService";
import { sendTripLinkRequest } from "../src/api/tripLinkService";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { openFlights, openHotels } from "../src/utils/externalLinks";
import Screen from "../../components/ui/Screen";
import Button from "../../components/ui/Button";
import ListRow from "../../components/ui/ListRow";
import JourneyTicket from "../../components/ui/JourneyTicket";
import Snackbar from "../../components/Snackbar";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../src/theme";

function formatDate(raw) {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// טווח תאריכים לטיול; לכיוון-אחד (בלי endDate) מציג רק את תאריך היציאה.
function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

// תווית סטטוס בעברית לפי matchingStatus שמגיע מ-getMatchById (Active/Closed/none).
function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "closed") return "הסתיים";
  if (s === "active") return "יוצאים לדרך";
  return "בתכנון";
}

export default function MatchingSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // הנתונים מגיעים כ-params מהצ'אט (מיידי, בלי טעינה). נופלים ל-fetch רק אם חסר מידע מפתח.
  const [otherName, setOtherName] = useState(params.otherUserName || "");
  const [otherImage, setOtherImage] = useState(params.otherUserImage || "");
  const [destination, setDestination] = useState(params.destination || "");
  const [tripID, setTripID] = useState(params.tripID || "");
  const [startDate, setStartDate] = useState(params.startDate || "");
  const [endDate, setEndDate] = useState(params.endDate || "");
  const [matchingStatus, setMatchingStatus] = useState(params.status || "");

  // שלב פתיחה קצר ("מכינים את אזור התכנון") לפני חשיפת התוכן — מעבר איכותי בין שלבים.
  const [ready, setReady] = useState(false);

  // המשתמש המחובר: authStore מחזיק רק userID/email (ללא firstName ותמונה),
  // לכן מתחילים מ-params/getUser ומעשירים מפרופיל השרת מיד עם העלייה.
  const me = getUser();
  const [myName, setMyName] = useState(params.myName || "");
  const [myImage, setMyImage] = useState(params.myImage || me?.profileImage || "");

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 650);
    return () => clearTimeout(t);
  }, []);

  // טעינת הפרופיל המלא של המשתמש המחובר (שם + תמונה) — כדי שהכותרת תציג
  // "ליאל וטלי" ולא רק את הצד השני, והאווטר השמאלי יראה את התמונה שלי.
  useEffect(() => {
    const myUserId = me?.userID;
    if (!myUserId) return;
    let alive = true;
    (async () => {
      try {
        const profile = await getUserProfile(myUserId);
        if (!alive || !profile) return;

        const fname = profile.firstName || profile.FirstName || "";
        if (fname) setMyName(fname);

        let img = profile.profileImage || profile.ProfileImage || "";
        // נפילה-לאחור לתמונה: endpoint ייעודי אם אין נתיב בפרופיל עצמו.
        if (!img) {
          try {
            const token = getToken();
            const r = await fetch(`${BASE_URL}/UserProfile/image/${myUserId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (r.ok) {
              const d = await r.json();
              if (d?.imagePath) img = d.imagePath;
            }
          } catch {
            // כשל בתמונה — נשארים עם fallback לראשי-תיבות לפי השם
          }
        }
        if (alive && img) setMyImage(img);
      } catch {
        // כשל טעינת פרופיל — המסך עדיין תקין עם מה שהתקבל ב-params
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // הצ'אט מעביר שם/יעד/תאריך-יציאה, אך לא תאריך-סיום וסטטוס — לכן משלימים
    // מ-getMatchById (שכבר מחזיר tripEndDate + matchingStatus). גם deep-link
    // עם matchId בלבד נתמך. מדלגים רק אם כבר יש את כל השדות המוצגים.
    if (!params.matchId) return;
    if (otherName && destination && endDate && matchingStatus) return;
    let alive = true;
    (async () => {
      try {
        const m = await getMatchById(params.matchId);
        if (!alive || !m) return;
        if (!otherName) setOtherName(m.otherUserName || "");
        if (!otherImage) setOtherImage(m.otherUserImage || "");
        if (!destination && m.tripName && m.tripName !== "טיול") setDestination(m.tripName);
        if (!tripID && m.tripID != null) setTripID(String(m.tripID));
        if (!startDate && m.tripStartDate) setStartDate(m.tripStartDate);
        if (!endDate && m.tripEndDate) setEndDate(m.tripEndDate);
        if (!matchingStatus && m.matchingStatus) setMatchingStatus(m.matchingStatus);
      } catch {
        // כשל השלמה — המסך עדיין תקין עם מה שיש
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dest = (destination || "").trim();
  const dateRangeText = formatDateRange(startDate, endDate);
  const statusText = statusLabel(matchingStatus);
  const bothNames = myName && otherName ? `${myName} ו${otherName}` : otherName || "אתם";

  const hasTrip = !!tripID;

  // ── קישור-טיול (רק בהתאמה כללית, hasTrip=false): הפיכת השיחה לשותפות טיול ──
  // bottom-sheet מקומי בלבד; אין state גלובלי / AsyncStorage / קומפוננטה חדשה.
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [myTrips, setMyTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState("");

  // ניווט ליצירת מסע חדש — אותו יעד בדיוק כמו myTrips (goNewTrip).
  const goNewTrip = () =>
    router.push({ pathname: "/PreferencesQuiz", params: { mode: "newTrip" } });

  // פתיחת הבורר + טעינת הטיולים שהמשתמש יצר (getUserTrips מחזיר בדיוק אותם).
  const openLinkSheet = async () => {
    setSelectedTripId(null);
    setLinkSheetOpen(true);
    setTripsLoading(true);
    try {
      const trips = await getUserTrips(me?.userID);
      setMyTrips(Array.isArray(trips) ? trips : []);
    } catch {
      setMyTrips([]);
    } finally {
      setTripsLoading(false);
    }
  };

  // ממפה שגיאת שרת להודעה ידידותית (בלי לחשוף טקסט טכני/SP).
  const friendlyLinkError = (err) => {
    const m = String(err?.message || "").toLowerCase();
    if (m.includes("pending")) return "כבר נשלחה בקשה לקישור טיול";
    if (m.includes("linked") || m.includes("owned") || m.includes("trip") || m.includes("participant"))
      return "לא ניתן לקשר את הטיול הזה";
    return "לא ניתן להתחבר כרגע. נסו שוב מאוחר יותר.";
  };

  // שליחת בקשת הקישור. בהצלחה: Snackbar קצר ואז חזרה לצ'אט (לא ל-TripPlanner).
  const sendLinkRequest = async () => {
    if (!selectedTripId || sending) return;
    setSending(true);
    try {
      await sendTripLinkRequest(params.matchId, selectedTripId);
      setLinkSheetOpen(false);
      setSnack("נשלחה בקשה לקישור טיול — ממתינים לאישור");
      setTimeout(() => router.back(), 1400);
    } catch (err) {
      setSnack(friendlyLinkError(err));
    } finally {
      setSending(false);
    }
  };

  // פעולה ראשית אחת — השלב הטבעי הבא אחרי ההתאמה: תכנון אם יש הקשר-טיול,
  // ובהתאמה כללית — קישור טיול לשיחה (במקום דד-אנד של "התחילו לדבר").
  const primaryCta = hasTrip
    ? {
        label: "המשיכו לתכנון יחד",
        onPress: () =>
          router.push({ pathname: "/TripPlanner/[id]", params: { id: tripID, name: dest } }),
      }
    : {
        label: "קשרו טיול לשיחה",
        onPress: openLinkSheet,
      };

  // פעולות משנה — כלי-עזר שקטים (ListRow). ללא כפילות של פעולת הצ'אט הראשית.
  const secondary = [
    ...(hasTrip
      ? [
          {
            Icon: ClipboardCheck,
            title: "רשימת משימות",
            subtitle: "מה צריך להכין לפני היציאה",
            onPress: () =>
              router.push({ pathname: "/TripToDo/[id]", params: { id: tripID, name: dest } }),
          },
        ]
      : []),
    {
      Icon: Plane,
      title: "חיפוש טיסות",
      subtitle: dest ? `טיסות ל${dest} ב-Skyscanner` : "פתיחת Skyscanner",
      onPress: openFlights,
    },
    {
      Icon: BedDouble,
      title: "חיפוש מלונות",
      subtitle: dest ? `מלונות ב${dest} ב-Booking` : "פתיחת Booking.com",
      onPress: () => openHotels(dest),
    },
    ...(hasTrip
      ? [
          {
            Icon: MessageCircle,
            title: "חזרה לצ'אט",
            subtitle: otherName ? `המשך השיחה עם ${otherName}` : "המשך השיחה",
            onPress: () => router.back(),
          },
        ]
      : []),
  ];

  // ── שלב פתיחה: "מכינים את אזור התכנון" (שפת ה-CompletionOverlay) ──
  if (!ready) {
    return (
      <Screen>
        <View style={styles.introContainer}>
          <Animated.View entering={ZoomIn.duration(400)} style={styles.introCircle}>
            <Check size={40} color={COLORS.onBrand} strokeWidth={2.6} />
          </Animated.View>
          <Animated.Text entering={FadeIn.delay(120).duration(400)} style={styles.introTitle}>
            ההתאמה שלכם אושרה
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(220).duration(400)} style={styles.introSub}>
            מכינים עבורכם את אזור התכנון...
          </Animated.Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* סגירה — צף, מודע ל-safe-area (בתוך גוף ה-Screen) */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="סגירה"
      >
        <X size={24} color={COLORS.textSecondary} strokeWidth={2} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── כותרת ── */}
        <Animated.Text entering={FadeInDown.duration(500)} style={styles.title}>
          מצאתם שותף לטיול
        </Animated.Text>

        {/* ── כרטיס-המסע — האלמנט החתימתי היחיד (ההירו הרגשי) ── */}
        <Animated.View
          entering={FadeInUp.delay(150).duration(550)}
          style={styles.ticketWrap}
        >
          <JourneyTicket
            destination={dest}
            dateText={dateRangeText}
            statusText={statusText}
            travelerAName={myName}
            travelerAImage={myImage}
            travelerBName={otherName}
            travelerBImage={otherImage}
          />
        </Animated.View>

        {/* ── טקסט אישי ── */}
        <Animated.Text entering={FadeInDown.delay(320).duration(500)} style={styles.personal}>
          {dest
            ? `${bothNames}, ${dest} כבר מחכה לכם.`
            : `${bothNames}, ההרפתקה שלכם מתחילה כאן.`}
        </Animated.Text>

        {/* ── פעולה ראשית אחת ── */}
        <Animated.View entering={FadeInUp.delay(540).duration(500)} style={styles.ctaWrap}>
          <Button
            label={primaryCta.label}
            onPress={primaryCta.onPress}
            variant="primary"
            size="lg"
          />
        </Animated.View>

        {/* ── פעולות משנה — כלי-עזר שקטים ── */}
        <View style={styles.secondary}>
          {secondary.map((s, i) => (
            <Animated.View key={s.title} entering={FadeInUp.delay(620 + i * 70).duration(450)}>
              <ListRow
                Icon={s.Icon}
                title={s.title}
                subtitle={s.subtitle}
                onPress={s.onPress}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* ── בורר טיול לקישור (bottom-sheet מקומי) — נפתח רק בהתאמה כללית ── */}
      <Modal
        visible={linkSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLinkSheetOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLinkSheetOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>קשרו טיול לשיחה</Text>
            <Text style={styles.sheetSub}>בחרו טיול שלכם — והשותף יתבקש לאשר את התכנון המשותף.</Text>

            {tripsLoading ? (
              <View style={styles.sheetCenter}>
                <ActivityIndicator size="large" color={COLORS.brand} />
              </View>
            ) : myTrips.length === 0 ? (
              <View style={styles.sheetCenter}>
                <Text style={styles.emptyTitle}>עוד אין לך טיול</Text>
                <Text style={styles.emptySub}>צרו טיול חדש כדי לתכנן אותו יחד.</Text>
                <Button
                  label="יצירת טיול חדש"
                  onPress={goNewTrip}
                  variant="primary"
                  size="md"
                  style={styles.emptyBtn}
                />
              </View>
            ) : (
              <>
                <ScrollView style={styles.tripList} showsVerticalScrollIndicator={false}>
                  {myTrips.map((t) => {
                    const selected = selectedTripId === t.tripID;
                    const title = t.destination || t.tripName || "טיול";
                    return (
                      <Pressable
                        key={t.tripID}
                        onPress={() => setSelectedTripId(t.tripID)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.tripRow, selected && styles.tripRowSelected]}
                      >
                        <View style={styles.tripIcon}>
                          <MapPin size={18} color={COLORS.brand} strokeWidth={2} />
                        </View>
                        <View style={styles.tripText}>
                          <Text style={styles.tripDest} numberOfLines={1}>{title}</Text>
                          {formatDateRange(t.startDate, t.endDate) ? (
                            <Text style={styles.tripDates} numberOfLines={1}>
                              {formatDateRange(t.startDate, t.endDate)}
                            </Text>
                          ) : null}
                        </View>
                        {selected ? <Check size={20} color={COLORS.brand} strokeWidth={2.4} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Button
                  label="שלחו בקשה"
                  onPress={sendLinkRequest}
                  loading={sending}
                  disabled={!selectedTripId || sending}
                  variant="primary"
                  size="lg"
                  style={styles.sendBtn}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      <Snackbar text={snack} onHide={() => setSnack("")} bottom={24} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── שלב פתיחה ──
  introContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xxl,
  },
  introCircle: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  introTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    textAlign: "center",
  },
  introSub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },

  // ── סגירה ──
  closeBtn: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.xl,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.sm,
  },

  scroll: {
    paddingTop: SPACING.xxxl + SPACING.lg,
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
  },

  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },

  ticketWrap: { alignSelf: "stretch" },

  personal: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "center",
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },

  // ── פעולות ──
  ctaWrap: { alignSelf: "stretch", marginTop: SPACING.xl },
  secondary: { alignSelf: "stretch", marginTop: SPACING.lg, gap: SPACING.sm },

  // ── bottom-sheet קישור-טיול (דפוס recommendations/TripToDo) ──
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: COLORS.scrim },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  sheetTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: "right" },
  sheetSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  sheetCenter: { alignItems: "center", paddingVertical: SPACING.xxl, gap: SPACING.sm },

  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: "center" },
  emptySub: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textAlign: "center" },
  emptyBtn: { alignSelf: "stretch", marginTop: SPACING.md },

  tripList: { alignSelf: "stretch", marginBottom: SPACING.md },
  tripRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    marginBottom: SPACING.sm,
  },
  tripRowSelected: { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  tripIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  tripText: { flex: 1, alignItems: "flex-end" },
  tripDest: { ...TYPOGRAPHY.bodyBold, color: COLORS.text, textAlign: "right" },
  tripDates: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: "right", marginTop: 2 },
  sendBtn: { alignSelf: "stretch" },
});

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BedDouble,
  Check,
  ClipboardCheck,
  MessageCircle,
  Plane,
  X,
} from "lucide-react-native";

import { getMatchById } from "../src/api/chatService";
import { getUserProfile } from "../src/api/userProfileService";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { openFlights, openHotels } from "../src/utils/externalLinks";
import Screen from "../../components/ui/Screen";
import Button from "../../components/ui/Button";
import ListRow from "../../components/ui/ListRow";
import RouteLine from "../../components/ui/RouteLine";
import JourneyTicket from "../../components/ui/JourneyTicket";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../src/theme";

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

  // פעולה ראשית אחת — השלב הטבעי הבא אחרי ההתאמה: תכנון אם יש הקשר-טיול, אחרת שיחה.
  const primaryCta = hasTrip
    ? {
        label: "המשיכו לתכנון יחד",
        onPress: () =>
          router.push({ pathname: "/TripPlanner/[id]", params: { id: tripID, name: dest } }),
      }
    : {
        label: "התחילו לדבר",
        onPress: () => router.back(),
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

        {/* ── נרטיב המסע (RouteLine) — עוגני-מסע מרכזיים, בלי תחושת צ'ק-ליסט ── */}
        <Animated.View entering={FadeInUp.delay(430).duration(500)} style={styles.journeyNav}>
          <RouteLine
            nodes={3}
            activeIndex={2}
            rtl
            accent={COLORS.brand}
            color={COLORS.border}
            style={styles.routeLine}
          />
          <View style={styles.journeyLabels}>
            <Text style={styles.journeyLabel}>התאמה</Text>
            <Text style={styles.journeyLabel}>שיחה</Text>
            <Text style={[styles.journeyLabel, styles.journeyLabelActive]}>תכנון</Text>
          </View>
        </Animated.View>

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

  // ── נרטיב המסע ──
  journeyNav: {
    alignSelf: "stretch",
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  routeLine: { alignSelf: "stretch" },
  journeyLabels: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  journeyLabel: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.textMuted,
  },
  journeyLabelActive: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },

  // ── פעולות ──
  ctaWrap: { alignSelf: "stretch", marginTop: SPACING.xl },
  secondary: { alignSelf: "stretch", marginTop: SPACING.lg, gap: SPACING.sm },
});

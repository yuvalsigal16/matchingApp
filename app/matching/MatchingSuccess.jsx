import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getMatchById } from "../src/api/chatService";
import { getUser } from "../src/auth/authStore";
import { buildImageUri } from "../src/utils/image";
import { openFlights, openHotels } from "../src/utils/externalLinks";
import { COLORS, FONTS } from "../src/theme";

function initialsOf(name) {
  return (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(raw) {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// אווטר עגול עם נפילה חלקה לראשי-תיבות כשאין תמונה.
function PartnerAvatar({ image, name }) {
  const uri = buildImageUri(image);
  if (uri) return <Image source={{ uri }} style={styles.avatar} />;
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{initialsOf(name) || "?"}</Text>
    </View>
  );
}

// נצנוץ בודד — פורח פעם אחת (fade-in→out) ונע החוצה מהמרכז. אלגנטי, לא ילדותי.
function Sparkle({ angle, distance, delay, color, size }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => {
    const o = p.value < 0.5 ? p.value * 2 : (1 - p.value) * 2;
    const d = distance * p.value;
    return {
      opacity: o,
      transform: [
        { translateX: Math.cos(angle) * d },
        { translateY: Math.sin(angle) * d },
        { scale: 0.5 + p.value * 0.6 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.sparkle, st]} pointerEvents="none">
      <Ionicons name="sparkles" size={size} color={color} />
    </Animated.View>
  );
}

// שדה נצנוצים עדין סביב נקודת המפגש — מופיע פעם אחת עם עליית התוכן.
const SPARKLES = [
  { angle: -1.9, distance: 78, delay: 120, color: COLORS.amber, size: 15 },
  { angle: -1.1, distance: 92, delay: 260, color: COLORS.primary, size: 13 },
  { angle: -0.2, distance: 84, delay: 200, color: COLORS.amber, size: 12 },
  { angle: 0.5, distance: 70, delay: 340, color: COLORS.brand, size: 14 },
  { angle: -2.6, distance: 88, delay: 300, color: COLORS.primary, size: 12 },
  { angle: 3.0, distance: 74, delay: 160, color: COLORS.amber, size: 13 },
];

function SparkleField() {
  return (
    <View style={styles.sparkleField} pointerEvents="none">
      {SPARKLES.map((s, i) => (
        <Sparkle key={i} {...s} />
      ))}
    </View>
  );
}

// טיימליין ויזואלי בלבד של התקדמות הטיול.
const PROGRESS_STEPS = [
  { label: "התאמה", state: "done" },
  { label: "שיחה", state: "done" },
  { label: "התחלת תכנון", state: "current" },
  { label: "הזמנת טיסות", state: "future" },
  { label: "בניית מסלול", state: "future" },
  { label: "יציאה לטיול", state: "future" },
];

function TimelineStep({ step, isFirst, isLast }) {
  const done = step.state === "done";
  const current = step.state === "current";
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlLabelWrap}>
        <Text style={[styles.tlLabel, (done || current) && styles.tlLabelActive]}>
          {step.label}
        </Text>
      </View>
      <View style={styles.tlRail}>
        {/* קו מחבר רציף מאחורי האייקונים */}
        <View
          style={[
            styles.tlLine,
            { top: isFirst ? "50%" : 0, bottom: isLast ? "50%" : 0 },
            done && styles.tlLineDone,
          ]}
        />
        <View
          style={[
            styles.tlDot,
            done && styles.tlDotDone,
            current && styles.tlDotCurrent,
            !done && !current && styles.tlDotFuture,
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={13} color={COLORS.success} />
          ) : current ? (
            <Ionicons name="ellipse" size={9} color={COLORS.onBrand} />
          ) : null}
        </View>
      </View>
    </View>
  );
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

  // שלב פתיחה קצר ("מכינים את אזור התכנון") לפני חשיפת התוכן — מעבר איכותי בין שלבים.
  const [ready, setReady] = useState(false);

  const me = getUser();
  const myName = params.myName || me?.firstName || "";
  const myImage = params.myImage || me?.profileImage || "";

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 650);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // אם נכנסו עם matchId בלבד (למשל deep-link) — משלימים את החוסר מהשרת.
    if ((otherName && destination) || !params.matchId) return;
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
      } catch {
        // כשל השלמה — המסך עדיין תקין עם מה שיש
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // טבעת הילה עדינה שפועמת מאחורי נקודת המפגש של האווטרים.
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.value = withDelay(
      350,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.4 * (1 - ring.value),
    transform: [{ scale: 0.85 + ring.value * 0.6 }],
  }));

  const dest = (destination || "").trim();
  const dateText = formatDate(startDate);
  const bothNames = myName && otherName ? `${myName} ו${otherName}` : otherName || "אתם";

  // כרטיסי "השלב הבא" — קודם בתוך האפליקציה (תכנון), ואז שירותים חיצוניים.
  const cards = [
    ...(tripID
      ? [
          {
            icon: "calendar",
            tint: COLORS.amberDark,
            bg: COLORS.amberLight,
            title: "מתכנן הטיול",
            desc: "יומן משותף לתכנון הימים",
            onPress: () => router.push({ pathname: "/TripPlanner/[id]", params: { id: tripID } }),
          },
          {
            icon: "checkmark-done",
            tint: COLORS.success,
            bg: COLORS.successLight,
            title: "רשימת משימות",
            desc: "מה צריך להכין לפני היציאה",
            onPress: () =>
              router.push({ pathname: "/TripToDo/[id]", params: { id: tripID, name: dest } }),
          },
        ]
      : []),
    {
      icon: "airplane",
      tint: COLORS.primary,
      bg: COLORS.primaryLight,
      title: "חיפוש טיסות",
      desc: dest ? `טיסות ל${dest} ב-Skyscanner` : "פתיחת Skyscanner",
      onPress: openFlights,
    },
    {
      icon: "bed",
      tint: COLORS.coral,
      bg: COLORS.coralLight,
      title: "חיפוש מלונות",
      desc: dest ? `מלונות ב${dest} ב-Booking` : "פתיחת Booking.com",
      onPress: () => openHotels(dest),
    },
    {
      icon: "chatbubbles",
      tint: COLORS.brand,
      bg: COLORS.brandLight,
      title: "חזרה לצ'אט",
      desc: otherName ? `המשך השיחה עם ${otherName}` : "המשך השיחה",
      onPress: () => router.back(),
    },
  ];

  // ── שלב פתיחה: "מכינים את אזור התכנון" ──
  if (!ready) {
    return (
      <SafeAreaView style={styles.introContainer}>
        <Animated.View entering={ZoomIn.duration(400)} style={styles.introIconCircle}>
          <Ionicons name="checkmark" size={40} color={COLORS.onBrand} />
        </Animated.View>
        <Animated.Text entering={FadeIn.delay(120).duration(400)} style={styles.introTitle}>
          ההתאמה שלכם אושרה
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(220).duration(400)} style={styles.introSub}>
          מכינים עבורכם את אזור התכנון...
        </Animated.Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* כפתור סגירה */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="סגירה"
      >
        <Ionicons name="close" size={26} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── כותרת ── */}
        <Animated.Text entering={FadeInDown.duration(500)} style={styles.title}>
          מצאתם שותף לטיול
        </Animated.Text>

        {/* ── שני האווטרים נעים אל המרכז + נצנוצים ── */}
        <View style={styles.avatarsRow}>
          <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
          <SparkleField />

          <Animated.View entering={SlideInLeft.delay(150).duration(600)} style={styles.avatarLeft}>
            <PartnerAvatar image={myImage} name={myName} />
          </Animated.View>

          <Animated.View entering={SlideInRight.delay(150).duration(600)} style={styles.avatarRight}>
            <PartnerAvatar image={otherImage} name={otherName} />
          </Animated.View>

          <Animated.View entering={ZoomIn.delay(650).duration(400)} style={styles.centerBadge}>
            <Ionicons name="airplane" size={20} color={COLORS.onBrand} />
          </Animated.View>
        </View>

        {/* ── טקסט אישי + הסבר ── */}
        <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.personal}>
          {dest ? `${bothNames}, ${dest} כבר מחכה לכם.` : `${bothNames}, ההרפתקה שלכם מתחילה כאן.`}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.subtitle}>
          מעכשיו כל התכנון שלכם במקום אחד — אפשר להתחיל לבנות את הטיול המשותף.
        </Animated.Text>

        {/* ── Summary Card ── */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <Text style={styles.summaryValue} numberOfLines={1}>{dest || "—"}</Text>
            <Text style={styles.summaryLabel}>יעד</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <Text style={styles.summaryValue}>2</Text>
            <Text style={styles.summaryLabel}>מטיילים</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Ionicons name="navigate-outline" size={20} color={COLORS.primary} />
            <Text style={styles.summaryValue}>בתכנון</Text>
            <Text style={styles.summaryLabel}>סטטוס</Text>
          </View>
        </Animated.View>

        {dateText ? (
          <Animated.View entering={FadeInUp.delay(560).duration(500)} style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.dateText}>תאריך יציאה משוער: {dateText}</Text>
          </Animated.View>
        ) : null}

        {/* ── התקדמות הטיול ── */}
        <Animated.View entering={FadeInUp.delay(640).duration(500)} style={styles.timelineWrap}>
          <Text style={styles.sectionTitle}>התקדמות הטיול</Text>
          <View style={styles.timeline}>
            {PROGRESS_STEPS.map((s, i) => (
              <TimelineStep
                key={s.label}
                step={s}
                isFirst={i === 0}
                isLast={i === PROGRESS_STEPS.length - 1}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── השלב הבא ── */}
        <Animated.Text
          entering={FadeInUp.delay(720).duration(500)}
          style={[styles.sectionTitle, { marginTop: 28 }]}
        >
          השלב הבא
        </Animated.Text>

        <View style={styles.cards}>
          {cards.map((c, i) => (
            <Animated.View key={c.title} entering={FadeInUp.delay(770 + i * 80).duration(450)}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={c.onPress}
                accessibilityRole="button"
                accessibilityLabel={c.title}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardDesc}>{c.desc}</Text>
                </View>
                <View style={[styles.cardIcon, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={22} color={c.tint} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR = 84;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── שלב פתיחה ──
  introContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  introIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: COLORS.brand,
    textAlign: "center",
  },
  introSub: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },

  closeBtn: {
    position: "absolute",
    top: 52,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  scroll: {
    paddingTop: 66,
    paddingBottom: 40,
    paddingHorizontal: 22,
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontFamily: FONTS.extraBold,
    color: COLORS.brand,
    textAlign: "center",
  },

  // ── אווטרים ──
  avatarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    marginTop: 6,
  },
  sparkleField: {
    position: "absolute",
    width: 1,
    height: 1,
    top: "50%",
    left: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: { position: "absolute" },
  avatarLeft: { marginRight: -14, zIndex: 2 },
  avatarRight: { marginLeft: -14, zIndex: 1 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 3,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.divider,
  },
  avatarFallback: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 30,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },
  centerBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: 22,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.surface,
    zIndex: 3,
  },
  ring: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -75,
    marginLeft: -75,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.brandLight,
  },

  personal: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 25,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 6,
  },

  // ── Summary Card ──
  summaryCard: {
    alignSelf: "stretch",
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 22,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCol: { flex: 1, alignItems: "center", gap: 5, paddingHorizontal: 6 },
  summaryValue: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.divider,
  },

  dateRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dateText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },

  // ── Timeline ──
  timelineWrap: { alignSelf: "stretch", marginTop: 26 },
  timeline: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tlRow: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    minHeight: 46,
  },
  tlRail: { width: 30, alignItems: "center", justifyContent: "center", position: "relative" },
  tlLine: {
    position: "absolute",
    width: 2,
    left: 14,
    backgroundColor: COLORS.divider,
  },
  tlLineDone: { backgroundColor: COLORS.success },
  tlDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  tlDotDone: { backgroundColor: COLORS.successLight },
  tlDotCurrent: { backgroundColor: COLORS.brand },
  tlDotFuture: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tlLabelWrap: { flex: 1, justifyContent: "center", alignItems: "flex-end", paddingRight: 12 },
  tlLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
  },
  tlLabelActive: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },

  // ── כרטיסים ──
  sectionTitle: {
    alignSelf: "stretch",
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 12,
  },
  cards: { alignSelf: "stretch", gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardText: { flex: 1, alignItems: "flex-end", paddingHorizontal: 14 },
  cardTitle: {
    fontSize: 15.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});

import { useRouter } from "expo-router";
import { ArrowLeft, ChevronLeft, Compass, MapPin, Plus, Sparkles, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import BottomNav from "../../components/BottomNav";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import RouteLine from "../../components/ui/RouteLine";
import Screen from "../../components/ui/Screen";
import SectionLabel from "../../components/ui/SectionLabel";
import { getSnapshot, loadMatches, loadProfile, loadTrips } from "../src/api/homeData";
import { getToken, getUser } from "../src/auth/authStore";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../src/theme";

// כינויים מקומיים למשקלי Rubik — היררכיה ממשקל בלבד (משפחה אחת).
const {
  regular: FONTS_REGULAR,
  medium: FONTS_MEDIUM,
  semibold: FONTS_SEMIBOLD,
  bold: FONTS_BOLD,
} = FONTS;

// ברכה לפי שעה — נגיעה אישית וקונטקסטואלית (לא "שלום" גנרי).
function greetingByHour(h) {
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

const firstNameOf = (full) => String(full || "").trim().split(/\s+/)[0] || "";

// תאריך קצר DD.M לרצועת המסעות.
function shortDate(raw) {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${Number(m[3])}.${Number(m[2])}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()}.${d.getMonth() + 1}`;
}

function tripDatesLabel(t) {
  const s = shortDate(t.startDate || t.StartDate);
  const e = shortDate(t.endDate || t.EndDate);
  if (s && e) return `${s} – ${e}`;
  return s || e || "תאריך גמיש";
}

export default function Home() {
  const router = useRouter();
  const cachedUser = getUser();
  const userId = cachedUser?.userID;

  // תמונת-מצב אחרונה (SWR): מציגים מיד תוכן אמיתי מהמטמון, ומרעננים ברקע.
  const snap = getSnapshot(userId);

  // כל מקטע מנהל את מצב-הטעינה שלו — אף קריאה בודדת לא חוסמת את כל המסך.
  const [matchesState, setMatchesState] = useState(() => ({
    status: snap?.matches ? "ready" : "loading",
    list: snap?.matches || null,
  }));
  const [tripsState, setTripsState] = useState(() => ({
    status: snap?.trips ? "ready" : "loading",
    list: snap?.trips || null,
  }));
  const [firstName, setFirstName] = useState(
    firstNameOf(snap?.profile?.firstName || cachedUser?.firstName)
  );
  const [profileImage, setProfileImage] = useState(snap?.profile?.profileImage || "");
  const [needsQuiz, setNeedsQuiz] = useState(!!snap?.profile?.needsQuiz);

  useEffect(() => {
    if (!userId || !getToken()) return;
    let alive = true;

    // התאמות — מזינות את ה-hero ואת רצועת השותפים. בכשל/timeout שומרים את מה
    // שכבר יש (מהמטמון) ולא קובעים "אין התאמות".
    loadMatches(userId)
      .then((list) => alive && setMatchesState({ status: "ready", list }))
      .catch(() => alive && setMatchesState((s) => ({ status: s.list ? "ready" : "error", list: s.list })));

    // מסעות — אותו עיקרון: כשל לא מתפרש כ"אין מסעות".
    loadTrips(userId)
      .then((list) => alive && setTripsState({ status: "ready", list }))
      .catch(() => alive && setTripsState((s) => ({ status: s.list ? "ready" : "error", list: s.list })));

    // פרופיל: שם, תמונה ובאנר-שאלון. מעדכן רק ערכים שחזרו בפועל; אחרת נשמר המטמון.
    loadProfile(userId)
      .then((p) => {
        if (!alive || !p) return;
        if (p.firstName != null) setFirstName(firstNameOf(p.firstName || cachedUser?.firstName));
        if (p.profileImage != null) setProfileImage(p.profileImage);
        if (p.needsQuiz !== undefined) setNeedsQuiz(!!p.needsQuiz);
      })
      .catch(() => {}); // שומרים שם/תמונה/באנר מהמטמון

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── נגזרות לתצוגה ──
  const partners = (matchesState.list || []).filter((m) => m.status !== "Closed");
  const journeyPartner = partners.find((m) => m.journeyStarted) || null;

  const trips = (tripsState.list || [])
    .filter((t) => (t.status || t.Status) !== "Cancelled")
    .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")))
    .slice(0, 6);

  // ה-hero מציג שלד רק כשאין עדיין נתוני התאמות כלל (גם לא מהמטמון).
  const matchesPending = matchesState.status === "loading" && !matchesState.list;
  // מקטע המסעות מופיע ברגע שיש נתונים או שהטעינה הסתיימה (גם בשגיאה).
  const tripsReady = tripsState.status !== "loading" || !!tripsState.list;

  // ── מצב ה-hero: תמיד פעולה אחת ברורה, לפי המקום במסע ──
  let hero;
  if (journeyPartner) {
    hero = {
      eyebrow: "הטיול שלכם בתכנון",
      title: `ממשיכים לתכנן עם ${firstNameOf(journeyPartner.otherUserName)}`,
      sub: journeyPartner.tripName
        ? `${journeyPartner.tripName} מחכה לכם — יש עוד מה לסדר.`
        : "כל התכנון שלכם במקום אחד.",
      cta: "המשיכו לתכנון",
      stage: 2, // מד-ההתקדמות: מציאה(0) → שיחה(1) → תכנון(2) → יציאה(3)
      onPress: () =>
        router.push({ pathname: "/chat/[matchId]", params: { matchId: journeyPartner.matchID } }),
    };
  } else if (partners.length > 0) {
    hero = {
      eyebrow: "יש עם מי לדבר",
      title: "המשיכו את השיחה",
      sub: `${partners.length} ${partners.length === 1 ? "שותף מחכה" : "שותפים מחכים"} להמשיך מאיפה שהפסקתם.`,
      cta: "לצ'אטים שלכם",
      stage: 1,
      onPress: () => router.push("/activeChats"),
    };
  } else {
    hero = {
      eyebrow: "הצעד הבא שלכם",
      title: "מצאו שותף לטיול הבא",
      sub: "נמצא לכם את מי שמתאים לצאת איתו לדרך — לפי הקצב, הסגנון והחלומות.",
      cta: "מצא שותף",
      stage: 0,
      onPress: () => router.push("/matchesForYou"),
    };
  }

  const openTrip = (t) => {
    const id = t.tripID ?? t.id ?? t.TripID;
    if (id != null) router.push({ pathname: "/TripDetails/[id]", params: { id: String(id) } });
    else router.push("/myTrips");
  };

  return (
    <Screen>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── כותרת: ברכה אישית + אווטר ── */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              {greetingByHour(new Date().getHours())}
              {firstName ? `, ${firstName}` : ""}
            </Text>
          </View>
          <Avatar
            uri={profileImage}
            name={firstName}
            size="md"
            onPress={() => router.push("/PersonalProfile")}
            accessibilityLabel="הפרופיל שלי"
          />
        </View>

        {/* ── כותרת-תזה של המסך ── */}
        <Text style={styles.thesis}>לאן ממשיכים מכאן?</Text>

        {/* ── באנר השלמת פרופיל (רק בעת הצורך) ── */}
        {needsQuiz ? (
          <Pressable
            style={({ pressed }) => [styles.quizBanner, pressed && styles.pressedSoft]}
            onPress={() => router.replace("/QuizStartScreen")}
            accessibilityRole="button"
            accessibilityLabel="השלמת פרופיל ההיכרות"
          >
            <View style={styles.quizIcon}>
              <Compass size={18} color={COLORS.brand} strokeWidth={2} />
            </View>
            <View style={styles.quizText}>
              <Text style={styles.quizTitle}>השלימו את הפרופיל</Text>
              <Text style={styles.quizSub}>כמה שאלות קצרות — וההתאמות יהיו מדויקות יותר</Text>
            </View>
            <ChevronLeft size={18} color={COLORS.textMuted} strokeWidth={2} />
          </Pressable>
        ) : null}

        {/* ── HERO: הפעולה הראשית, מודעת-הקשר ── */}
        {matchesPending ? (
          <View style={styles.heroSkeleton} />
        ) : (
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>{hero.eyebrow}</Text>
            <Text style={styles.heroTitle}>{hero.title}</Text>
            <Text style={styles.heroSub}>{hero.sub}</Text>

            {/* מד-התקדמות במסע (החתימה): מציאה → שיחה → תכנון → יציאה.
                העצירה הפעילה משקפת היכן המשתמש נמצא בפועל — לא קישוט. */}
            <RouteLine style={styles.heroRoute} nodes={4} activeIndex={hero.stage} rtl />

            <Button
              label={hero.cta}
              onPress={hero.onPress}
              variant="light"
              size="md"
              Icon={ArrowLeft}
            />
          </View>
        )}

        {/* ── השותפים שלך: חברות, פנים אמיתיות ── */}
        {partners.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel
              title="השותפים שלך"
              count={partners.length}
              actionLabel="הכל"
              onAction={() => router.push("/activeChats")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.railBreakout}
              contentContainerStyle={styles.railContent}
            >
              {partners.slice(0, 10).map((p) => (
                <Pressable
                  key={p.matchID}
                  style={({ pressed }) => [styles.partner, styles.flip, pressed && styles.pressedSoft]}
                  onPress={() =>
                    router.push({ pathname: "/chat/[matchId]", params: { matchId: p.matchID } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`צ'אט עם ${p.otherUserName}`}
                >
                  <Avatar uri={p.otherUserImage} name={p.otherUserName} size="lg" ring />
                  <Text style={styles.partnerName} numberOfLines={1}>
                    {firstNameOf(p.otherUserName)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── המסעות שלי: חקר, מקומות ── */}
        {tripsReady ? (
          <View style={styles.section}>
            <SectionLabel
              title="המסעות שלי"
              count={trips.length || undefined}
              actionLabel={trips.length > 0 ? "הוספה" : undefined}
              onAction={trips.length > 0 ? () => router.push("/myTrips") : undefined}
            />
            {trips.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.railBreakout}
                contentContainerStyle={styles.railContent}
              >
                {trips.map((t, i) => (
                  <Pressable
                    key={t.tripID ?? t.id ?? i}
                    style={({ pressed }) => [styles.tripCard, styles.flip, pressed && styles.pressedSoft]}
                    onPress={() => openTrip(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`מסע ל${t.destination || t.Destination || "יעד"}`}
                  >
                    <View style={styles.tripPin}>
                      <MapPin size={16} color={COLORS.brand} strokeWidth={2} />
                    </View>
                    <Text style={styles.tripDest} numberOfLines={1}>
                      {t.destination || t.Destination || "יעד חדש"}
                    </Text>
                    <Text style={styles.tripDates}>{tripDatesLabel(t)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.tripEmpty, pressed && styles.pressedSoft]}
                onPress={() => router.push("/myTrips")}
                accessibilityRole="button"
                accessibilityLabel="תכנון המסע הראשון"
              >
                <View style={styles.tripEmptyIcon}>
                  <Plus size={20} color={COLORS.brand} strokeWidth={2.2} />
                </View>
                <View style={styles.tripEmptyText}>
                  <Text style={styles.tripEmptyTitle}>תכננו את המסע הראשון</Text>
                  <Text style={styles.tripEmptySub}>בחרו יעד ותאריכים — ונתחיל מכאן</Text>
                </View>
                <ChevronLeft size={18} color={COLORS.textMuted} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        ) : null}

        {/* ── התאמות עבורך: כניסה קבועה למנוע ההמלצות (תמיד זמינה, גם עם צ'אטים) ──
            מנווטת ל-/matchesForYou — מקור אמת יחיד להעשרה, לדירוג ולפרופילים. */}
        <Pressable
          style={({ pressed }) => [styles.discoverRow, pressed && styles.pressedSoft]}
          onPress={() => router.push("/matchesForYou")}
          accessibilityRole="button"
          accessibilityLabel="התאמות עבורך"
        >
          <View style={styles.discoverIcon}>
            <Sparkles size={20} color={COLORS.brand} strokeWidth={2} />
          </View>
          <View style={styles.discoverText}>
            <Text style={styles.discoverTitle}>התאמות עבורך</Text>
            <Text style={styles.discoverSub}>אנשים שמתאימים לך לפי הפרופיל </Text>
          </View>
          <ChevronLeft size={18} color={COLORS.textMuted} strokeWidth={2} />
        </Pressable>

        {/* ── קהילה: כניסה שקטה אל העולם הרחב ── */}
        <Pressable
          style={({ pressed }) => [styles.communityRow, pressed && styles.pressedSoft]}
          onPress={() => router.push("/discovery")}
          accessibilityRole="button"
          accessibilityLabel="קהילת המטיילים"
        >
          <View style={styles.communityIcon}>
            <Users size={20} color={COLORS.brand} strokeWidth={2} />
          </View>
          <View style={styles.communityText}>
            <Text style={styles.communityTitle}>קהילת המטיילים</Text>
            <Text style={styles.communitySub}>אנשים, מקומות והמלצות מהדרך</Text>
          </View>
          <ChevronLeft size={18} color={COLORS.textMuted} strokeWidth={2} />
        </Pressable>
      </ScrollView>

      <BottomNav active="home" />
    </Screen>
  );
}

const GUTTER = SPACING.xl;

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scroll: { paddingTop: SPACING.md, paddingBottom: SPACING.xxl },

  // ── כותרת ──
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUTTER,
    marginBottom: SPACING.lg,
  },
  headerText: { flex: 1, alignItems: "flex-end" },
  greeting: {
    fontFamily: FONTS_MEDIUM,
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  thesis: {
    ...TYPOGRAPHY.h1,
    // Bold (לא ExtraBold) + ריווח אותיות ניטרלי — עברית לא אוהבת tracking שלילי.
    fontFamily: FONTS_BOLD,
    color: COLORS.text,
    textAlign: "right",
    letterSpacing: 0.2,
    paddingHorizontal: GUTTER,
    marginBottom: SPACING.xl,
  },

  // ── באנר פרופיל ──
  quizBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    marginHorizontal: GUTTER,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.brandLight,
  },
  quizIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  quizText: { flex: 1, alignItems: "flex-end" },
  quizTitle: { fontFamily: FONTS_SEMIBOLD, fontSize: 14.5, color: COLORS.brand, textAlign: "right" },
  quizSub: {
    fontFamily: FONTS_REGULAR,
    fontSize: 12.5,
    color: COLORS.brand,
    opacity: 0.75,
    textAlign: "right",
    marginTop: 1,
  },

  // ── HERO ──
  hero: {
    marginHorizontal: GUTTER,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroSkeleton: {
    marginHorizontal: GUTTER,
    height: 210,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.backgroundSunk,
  },
  heroEyebrow: {
    fontFamily: FONTS_SEMIBOLD,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    textAlign: "right",
    letterSpacing: 0.2,
  },
  // Bold ומעט קטן יותר מהתזה (28) כדי לא להתחרות בה — היררכיה ברורה.
  heroTitle: {
    fontFamily: FONTS_BOLD,
    fontSize: 22,
    lineHeight: 30,
    color: COLORS.onBrand,
    textAlign: "right",
    letterSpacing: 0,
    marginTop: SPACING.sm,
  },
  heroSub: {
    fontFamily: FONTS_REGULAR,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.82)",
    textAlign: "right",
    marginTop: SPACING.sm,
  },
  // מד-ההתקדמות במלוא הרוחב, מעל ה-CTA שגם הוא במלוא הרוחב — מרכב מאוזן, בלי pill צף.
  heroRoute: { marginTop: SPACING.lg, marginBottom: SPACING.lg },

  // ── מקטעים ──
  section: { marginTop: SPACING.xxl, paddingHorizontal: GUTTER },

  // רצועה אופקית שחורגת מהגוטר, כשהכרטיס הראשון מיושר לגוטר הימני.
  // ב-RN כאן ה-RTL כבוי (forceRTL=false) וגלילה אופקית תמיד מתחילה משמאל,
  // לכן הופכים את הרצועה (scaleX:-1) ומבטלים את ההיפוך על כל פריט — כך הפריט
  // הראשון יושב בימין והתוכן הפנימי נשאר ישר. (הדפוס המתועד ב-Bible §5.)
  railBreakout: { marginHorizontal: -GUTTER, transform: [{ scaleX: -1 }] },
  railContent: { flexDirection: "row", paddingHorizontal: GUTTER, gap: SPACING.lg },
  flip: { transform: [{ scaleX: -1 }] },

  // ── שותף ברצועה ──
  partner: { width: 68, alignItems: "center", gap: 6 },
  partnerName: {
    fontFamily: FONTS_MEDIUM,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ── כרטיס מסע ──
  tripCard: {
    width: 190,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: "flex-end",
  },
  tripPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  tripDest: {
    fontFamily: FONTS_BOLD,
    fontSize: 17,
    color: COLORS.text,
    textAlign: "right",
  },
  tripDates: {
    fontFamily: FONTS_REGULAR,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 3,
  },

  // ── כרטיס-הזמנה למסע ראשון ──
  tripEmpty: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  tripEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  tripEmptyText: { flex: 1, alignItems: "flex-end" },
  tripEmptyTitle: { fontFamily: FONTS_SEMIBOLD, fontSize: 15, color: COLORS.text, textAlign: "right" },
  tripEmptySub: {
    fontFamily: FONTS_REGULAR,
    fontSize: 12.5,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 2,
  },

  // ── שורת קהילה ──
  communityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    marginTop: SPACING.xxl,
    marginHorizontal: GUTTER,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  communityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  communityText: { flex: 1, alignItems: "flex-end" },
  communityTitle: { fontFamily: FONTS_SEMIBOLD, fontSize: 15, color: COLORS.text, textAlign: "right" },
  communitySub: {
    fontFamily: FONTS_REGULAR,
    fontSize: 12.5,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 2,
  },

  // ── "התאמות עבורך" — זהה בסגנון לשורת הקהילה (עקבי, לא כרטיס גנרי) ──
  discoverRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    marginTop: SPACING.xxl,
    marginHorizontal: GUTTER,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  discoverIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  discoverText: { flex: 1, alignItems: "flex-end" },
  discoverTitle: {
    fontFamily: FONTS_SEMIBOLD,
    fontSize: 15,
    color: COLORS.text,
    textAlign: "right",
  },
  discoverSub: {
    fontFamily: FONTS_REGULAR,
    fontSize: 12.5,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 2,
  },

  pressedSoft: { opacity: 0.85 },
});

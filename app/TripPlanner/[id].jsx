import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CalendarPlus,
  Check,
  Clock,
  Coffee,
  Footprints,
  Landmark,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  ShoppingBag,
  Star,
  Trees,
  Users,
  Utensils,
  Waves,
  Wine,
} from "lucide-react-native";
import { Image } from "expo-image";

import { generateItinerary } from "../src/api/aiItineraryService";
import { addPlannerEvent, subscribePlanner } from "../src/api/tripPlannerService";
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ListRow from "../../components/ui/ListRow";
import EmptyState from "../../components/ui/EmptyState";
import SectionLabel from "../../components/ui/SectionLabel";
import Snackbar from "../../components/Snackbar";

// מיפוי primaryType של Google Places לאייקון lucide. fallback שקט: MapPin.
const TYPE_ICONS = [
  [/museum|gallery|landmark|monument|attraction|historical/, Landmark],
  [/restaurant|food|meal|diner|steak|pizza|sushi/, Utensils],
  [/cafe|coffee|bakery|dessert|tea/, Coffee],
  [/park|garden|hiking|nature|zoo|forest|trail/, Trees],
  [/market|shopping|store|mall|boutique/, ShoppingBag],
  [/bar|night_club|pub|wine|brewery/, Wine],
  [/beach|aquarium|marina|pier|water/, Waves],
];

const typeIconFor = (type) => {
  if (!type) return MapPin;
  for (const [re, IconCmp] of TYPE_ICONS) {
    if (re.test(type)) return IconCmp;
  }
  return MapPin;
};

// 12453 → "12,453" — בלי תלות ב-locale של מנוע ה-JS במובייל.
const formatCount = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const openUrl = (url) => {
  if (url) Linking.openURL(url).catch(() => {});
};

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

  // ── "המסלול שלכם" — הצעת מסלול מותאמת. Preview בלבד: שום דבר לא נכנס
  //    ליומן אוטומטית — רק פעילויות שנבחרו במפורש מתווספות דרך addPlannerEvent. ──
  const [itinerary, setItinerary] = useState(null); // { summary, match_reason, planning_notes, days }
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [selected, setSelected] = useState(new Set()); // מפתחות "day-activity" שנבחרו
  const [addingSelected, setAddingSelected] = useState(false);

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

  // בקשת הצעת מסלול מהשרת. regenerate=true מבקש הצעה שונה מהקודמת.
  const generate = async (regenerate = false) => {
    if (generating) return;
    setGenerating(true);
    setGenError("");
    try {
      const data = await generateItinerary(id, { regenerate });
      setItinerary(data);
      setSelected(new Set());
    } catch (err) {
      setGenError(err?.message || "לא הצלחנו להרכיב מסלול כרגע. נסו שוב בעוד רגע.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleActivity = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // מוסיף ליומן רק את הפעילויות שנבחרו — באותו מבנה אירוע בדיוק כמו הוספה ידנית.
  const addSelected = async () => {
    if (selected.size === 0 || addingSelected) return;
    setAddingSelected(true);
    setGenError("");
    try {
      const picks = [];
      itinerary.days.forEach((d, di) => {
        (d.activities || []).forEach((a, ai) => {
          if (selected.has(`${di}-${ai}`)) {
            picks.push({
              title: `יום ${d.day} · ${a.title}`,
              time: a.time || "",
              // +picks.length: מבטיח createdAt ייחודי גם באותה מילישנייה —
              // arrayUnion של Firestore מסנן אובייקטים זהים לחלוטין.
              createdAt: Date.now() + picks.length,
            });
          }
        });
      });
      for (const ev of picks) {
        await addPlannerEvent(id, ev);
      }
      setSelected(new Set());
      setSnack(picks.length === 1 ? "הפעילות נוספה ליומן" : "הפעילויות נוספו ליומן");
    } catch {
      setGenError("לא הצלחנו להוסיף ליומן. נסו שוב.");
    } finally {
      setAddingSelected(false);
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
            label="הוספה"
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
        {/* ── המסלול שלכם — עוזר תכנון: הצעה → תצוגה מקדימה → בחירה → הוספה ליומן ── */}
        {loaded && !itinerary ? (
          <Card style={styles.itinerarySection}>
            <View style={styles.itineraryHead}>
              <View style={styles.itineraryIcon}>
                <Route size={20} color={COLORS.brand} strokeWidth={2} />
              </View>
              <View style={styles.itineraryHeadText}>
                <Text style={styles.itineraryTitle}>מסלול מותאם לשניכם</Text>
                <Text style={styles.itinerarySub}>
                  הצעת מסלול שנבנית לפי תחומי העניין וההעדפות שלכם
                </Text>
              </View>
            </View>
            <Button
              label="הציעו לנו מסלול"
              onPress={() => generate(false)}
              loading={generating}
              size="md"
              style={styles.itineraryCta}
              accessibilityLabel="בקשת הצעת מסלול מותאם"
            />
            {generating ? (
              <Text style={styles.itineraryHint}>
                מרכיבים מסלול שלם במיוחד בשבילכם... בטיול ארוך זה יכול לקחת עד שתי דקות
              </Text>
            ) : null}
            {genError ? <Text style={styles.itineraryError}>{genError}</Text> : null}
          </Card>
        ) : null}

        {loaded && itinerary ? (
          <Card style={styles.itinerarySection}>
            <View style={styles.itineraryHead}>
              <View style={styles.itineraryIcon}>
                <Route size={20} color={COLORS.brand} strokeWidth={2} />
              </View>
              <Text style={[styles.itineraryTitle, styles.itineraryHeadTitle]}>
                המסלול שלכם
              </Text>
            </View>

            {/* קודם ההסבר — מה, למה ואיך — ורק אחר כך הימים והפעילויות */}
            <Text style={styles.itinerarySummary}>{itinerary.summary}</Text>
            {itinerary.match_reason ? (
              <View style={styles.itineraryNote}>
                <Text style={styles.itineraryNoteLabel}>למה המסלול מתאים לכם</Text>
                <Text style={styles.itineraryNoteText}>{itinerary.match_reason}</Text>
              </View>
            ) : null}

            {/* אמינות המסלול — מוצג רק כשהשרת אימת מספיק מקומות מול Google.
                בכוונה בלי "X מתוך Y" — דירוג ומספר מדרגים בלבד. */}
            {itinerary.trust ? (
              <View style={styles.itineraryNote}>
                <Text style={styles.itineraryNoteLabel}>אמינות המסלול</Text>
                <View style={styles.trustRow}>
                  <Star size={16} color={COLORS.amber} fill={COLORS.amber} strokeWidth={2} />
                  <Text style={styles.trustRating}>{itinerary.trust.avgRating}</Text>
                  {itinerary.trust.totalRatings ? (
                    <Text style={styles.trustCount}>
                      · {formatCount(itinerary.trust.totalRatings)} דירוגים
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.trustSource}>מבוסס על דירוגי Google Places</Text>
              </View>
            ) : null}

            {(itinerary.days || []).map((d, di) => (
              <View key={di} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>
                    יום {d.day} · {d.title}
                  </Text>
                  {d.dayNavUrl ? (
                    <TouchableOpacity
                      onPress={() => openUrl(d.dayNavUrl)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`ניווט לכל יום ${d.day}`}
                      style={styles.navLink}
                    >
                      <Navigation size={13} color={COLORS.brand} strokeWidth={2.2} />
                      <Text style={styles.navLinkText}>נווט את כל היום</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {(d.activities || []).map((a, ai) => {
                  const key = `${di}-${ai}`;
                  const checked = selected.has(key);
                  const TypeIcon = typeIconFor(a.place?.type);
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => toggleActivity(key)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={a.title}
                      style={[styles.activityRow, checked && styles.activityRowSelected]}
                    >
                      <View style={[styles.checkCircle, checked && styles.checkCircleOn]}>
                        {checked ? (
                          <Check size={14} color={COLORS.onBrand} strokeWidth={2.6} />
                        ) : null}
                      </View>
                      {a.place?.photoUrl ? (
                        <Image
                          source={{ uri: a.place.photoUrl }}
                          style={styles.activityPhoto}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : null}
                      <View style={styles.activityText}>
                        <Text style={styles.activityTitle}>{a.title}</Text>
                        {a.description ? (
                          <Text style={styles.activityDesc}>{a.description}</Text>
                        ) : null}
                        {a.place?.rating ? (
                          <View style={styles.activityMeta}>
                            <TypeIcon size={13} color={COLORS.textMuted} strokeWidth={2} />
                            <Star size={13} color={COLORS.amber} fill={COLORS.amber} strokeWidth={2} />
                            <Text style={styles.activityRating}>{a.place.rating}</Text>
                            {a.place.ratingCount ? (
                              <Text style={styles.activityRatingCount}>
                                ({formatCount(a.place.ratingCount)})
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {a.why ? (
                          <View style={styles.whyRow}>
                            <Check size={13} color={COLORS.brand} strokeWidth={2.4} />
                            <Text style={styles.whyText}>{a.why}</Text>
                          </View>
                        ) : null}
                        {a.place?.navUrl ? (
                          <TouchableOpacity
                            onPress={() => openUrl(a.place.navUrl)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`ניווט אל ${a.title}`}
                            style={[styles.navLink, styles.activityNavLink]}
                          >
                            <Navigation size={13} color={COLORS.brand} strokeWidth={2.2} />
                            <Text style={styles.navLinkText}>נווט לשם</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      {a.time ? <Text style={styles.activityTime}>{a.time}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
                {d.insights ? (
                  <View style={styles.insightsRow}>
                    {d.insights.walkKm ? (
                      <View style={styles.insightItem}>
                        <Footprints size={13} color={COLORS.textSecondary} strokeWidth={2} />
                        <Text style={styles.insightText}>
                          {`הליכה ≈ ${d.insights.walkKm} ק"מ`}
                          {d.insights.walkMinutes ? ` (כ-${d.insights.walkMinutes} דק')` : ""}
                        </Text>
                      </View>
                    ) : null}
                    {d.insights.activeHours ? (
                      <View style={styles.insightItem}>
                        <Clock size={13} color={COLORS.textSecondary} strokeWidth={2} />
                        <Text style={styles.insightText}>{`כ-${d.insights.activeHours} שעות פעילות`}</Text>
                      </View>
                    ) : null}
                    {d.insights.isCompact ? (
                      <View style={styles.insightItem}>
                        <Check size={13} color={COLORS.brand} strokeWidth={2.4} />
                        <Text style={styles.insightText}>רוב הפעילויות במרחק הליכה זו מזו</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}

            {/* איך תכננו את המסלול — אסטרטגיית התכנון, בסוף: אחרי שרואים את הימים */}
            {itinerary.planning_notes ? (
              <View style={[styles.itineraryNote, styles.strategyNote]}>
                <Text style={styles.itineraryNoteLabel}>איך תכננו את המסלול</Text>
                <Text style={styles.itineraryNoteText}>{itinerary.planning_notes}</Text>
              </View>
            ) : null}

            <Button
              label={selected.size > 0 ? `הוספה ליומן (${selected.size})` : "הוספה ליומן"}
              Icon={CalendarPlus}
              onPress={addSelected}
              loading={addingSelected}
              disabled={selected.size === 0 || generating}
              size="md"
              style={styles.itineraryCta}
              accessibilityLabel="הוספת הפעילויות שנבחרו ליומן"
            />
            <Button
              label="הציעו לנו מסלול אחר"
              Icon={RefreshCw}
              onPress={() => generate(true)}
              loading={generating}
              disabled={addingSelected}
              variant="ghost"
              size="md"
              accessibilityLabel="בקשת הצעת מסלול שונה"
            />
            {genError ? <Text style={styles.itineraryError}>{genError}</Text> : null}
          </Card>
        ) : null}

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

  // ── "המסלול שלכם" — כרטיס הצעת המסלול ──
  itinerarySection: { marginBottom: SPACING.lg },
  itineraryHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
  },
  itineraryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  itineraryHeadText: { flex: 1, alignItems: "flex-end" },
  itineraryHeadTitle: { flex: 1 },
  itineraryTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: "right" },
  itinerarySub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  itineraryCta: { marginTop: SPACING.md },
  itineraryHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  itineraryError: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    textAlign: "center",
    marginTop: SPACING.sm,
  },

  itinerarySummary: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: "right",
    marginTop: SPACING.md,
  },
  itineraryNote: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  itineraryNoteLabel: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
  },
  itineraryNoteText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    textAlign: "right",
    marginTop: 2,
  },

  dayBlock: { marginTop: SPACING.lg },
  dayHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dayTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.brand,
    textAlign: "right",
    flex: 1,
  },
  activityRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  activityRowSelected: { backgroundColor: COLORS.brandLight },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkCircleOn: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  activityText: { flex: 1, alignItems: "flex-end" },
  activityTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.text, textAlign: "right" },
  activityDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  activityTime: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 3 },

  // ── העשרת מקום (Google Places) — כל אלמנט מוצג רק אם קיים ──
  activityPhoto: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    marginTop: 2,
    backgroundColor: COLORS.backgroundSunk,
  },
  activityMeta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  activityRating: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bold, color: COLORS.text },
  activityRatingCount: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  whyRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 4,
  },
  whyText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: "right", flex: 1 },

  // ── ניווט (פעילות + יום) ──
  navLink: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  navLinkText: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bold, color: COLORS.brand },
  activityNavLink: { marginTop: SPACING.xs },

  // ── אמינות המסלול ──
  trustRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.xs,
  },
  trustRating: { ...TYPOGRAPHY.bodyBold, color: COLORS.text },
  trustCount: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  trustSource: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 2,
  },

  // ── תובנות סוף-יום ואסטרטגיית תכנון ──
  insightsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  insightItem: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  insightText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  strategyNote: { marginTop: SPACING.lg },
});

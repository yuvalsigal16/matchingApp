import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getChatMessages,
  getMatchById,
  sendChatMessage,
} from "../src/api/chatService";
import { blockUser } from "../src/api/blockService";
import { buildImageUri } from "../src/utils/image";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";
import HeaderMenu from "../../components/HeaderMenu";
import ChatBackground from "../../components/ChatBackground";

// ── עזרי תצוגה ──
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayKey(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "היום";
  if (dayKey(d) === dayKey(yesterday)) return "אתמול";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// מריץ הבטחה עם תקרת זמן — מונע "תקיעה" כשהשרת איטי/לא מגיב.
function withTimeout(promise, ms) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

// משווה אם "זנב" הרשימה זהה (אורך + ההודעה האחרונה) — לדילוג על עדכון מיותר ב-polling.
function sameTail(a, b) {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  return a[a.length - 1].messageID === b[b.length - 1].messageID;
}

// גובה המסך — לחישוב חפיפת המקלדת.
const { height: SCREEN_H } = Dimensions.get("window");

// מפתח מקומי (AsyncStorage) לזכירת "יצאנו לדרך" לצ'אט — בלי שרת, בלי DB.
const journeyKey = (id) => `journey_started_${id}`;

export default function ChatScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams();
  const currentUser = getUser();

  const [messages, setMessages] = useState([]); // ישן→חדש
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [journeyStarted, setJourneyStarted] = useState(false); // "יצאנו לדרך" (מקומי)

  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const chatIdRef = useRef(null); // chatID זמין ל-polling בלי תלות ב-state אסינכרוני
  const fetchingRef = useRef(false); // מונע חפיפת בקשות polling
  const mountedRef = useRef(true); // מונע setState אחרי יציאה מהמסך

  // גובה המקלדת — shared value שמתחיל ב-0 בכל כניסה למסך (מונע "תקיעה" למעלה).
  const kb = useSharedValue(0);
  const areaStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingBottom: Math.max(kb.value, insets.bottom),
  }));

  // מאזינים למקלדת + אנימציה חלקה. keyboardDidHide מאפס תמיד → לא נשאר תקוע.
  // מחשבים את החפיפה לפי ראש המקלדת (screenY) ולא לפי הגובה לבד —
  // כך זה מדויק גם ב-edge-to-edge (המקלדת יושבת מעל סרגל הניווט).
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const top = e.endCoordinates?.screenY ?? SCREEN_H;
      const overlap = Math.max(SCREEN_H - top, 0);
      kb.value = withTiming(overlap, { duration: 220, easing: Easing.out(Easing.quad) });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      kb.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ניקוי בעת יציאה מהמסך — חוסם setState על קומפוננטה לא-מורכבת.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // טעינה ראשונית: התאמה + הודעות, עטוף ב-timeout עדין כדי לא להיתקע.
  const initChat = useCallback(async () => {
    if (!matchId) return;
    try {
      const match = await withTimeout(getMatchById(matchId), 15000);
      if (!mountedRef.current) return;
      setMatchData(match);
      chatIdRef.current = match?.chatID ?? null;
      const msgs = await withTimeout(getChatMessages(match.chatID), 15000);
      if (!mountedRef.current) return;
      setMessages(msgs);
      setLoadError(false);
    } catch {
      if (mountedRef.current) setLoadError(true); // הודעה עדינה במסך, בלי Alert ובלי יציאה
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (!currentUser?.userID) {
      router.replace("/Login");
      return;
    }
    setLoading(true);
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initChat]);

  // ── Polling: רענון הודעות כל 4 שניות בזמן שהמסך בפוקוס בלבד ──
  // useFocusEffect מפעיל בכניסה ומנקה (clearInterval) ביציאה — אפס ריצה ברקע.
  useFocusEffect(
    useCallback(() => {
      // קריאת סטטוס "יצאנו לדרך" בכל חזרה למסך (למשל אחרי מסך ההצלחה).
      AsyncStorage.getItem(journeyKey(matchId))
        .then((v) => {
          if (mountedRef.current) setJourneyStarted(v === "1");
        })
        .catch(() => {});

      const tick = async () => {
        if (fetchingRef.current) return; // לא מתחילים בקשה אם הקודמת עדיין רצה
        fetchingRef.current = true;
        try {
          if (!chatIdRef.current) {
            await initChat(); // עוד אין צ'אט (טעינה נכשלה/לא הסתיימה) → ניסיון חוזר
          } else {
            const msgs = await getChatMessages(chatIdRef.current);
            if (mountedRef.current) {
              setMessages((prev) => (sameTail(prev, msgs) ? prev : msgs));
            }
          }
        } catch {
          // כשל ברענון רקע — מתעלמים בשקט; ההודעות הקיימות נשארות, הטיק הבא ינסה שוב
        } finally {
          fetchingRef.current = false;
        }
      };
      const id = setInterval(tick, 4000);
      return () => clearInterval(id);
    }, [initChat, matchId]),
  );

  const send = async () => {
    const t = text.trim();
    if (!t || !matchData?.chatID) return;
    setText("");
    try {
      const saved = await sendChatMessage(matchData.chatID, t, currentUser?.userID);
      setMessages((prev) => [...prev, saved]);
    } catch {
      setText(t); // החזרת הטקסט אם נכשל
      Alert.alert("שגיאה", "לא ניתן לשלוח הודעה");
    }
  };

  // ── אווטר לכותרת ──
  const avatarUri = buildImageUri(matchData?.otherUserImage);
  const initials =
    (matchData?.otherUserName || "")
      .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "";

  // ── תפריט אפשרויות (3 נקודות) — זמין רק כשיש מזהה למשתמש השני ──
  const otherUserId = matchData?.otherUserID;
  const otherName = matchData?.otherUserName || "המשתמש";

  const goToOtherProfile = () => {
    router.push({
      pathname: "/MatchProfileDetails",
      params: {
        user: JSON.stringify({
          userID: otherUserId,
          name: otherName,
          profileImage: matchData?.otherUserImage,
        }),
      },
    });
  };

  const performBlock = async () => {
    try {
      await blockUser(otherUserId);
      Alert.alert(
        "המשתמש נחסם בהצלחה",
        "הוא לא יוכל לשלוח לך הודעות או להופיע בהתאמות שלך.",
        [{ text: "אישור", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert("שגיאה", err.message || "חסימת המשתמש נכשלה");
    }
  };

  const confirmBlock = () => {
    Alert.alert(
      "חסימת משתמש",
      `האם לחסום את ${otherName}?\nלא תוכל/י לשלוח לו הודעות או לראות אותו בהתאמות.`,
      [
        { text: "ביטול", style: "cancel" },
        { text: "חסום", style: "destructive", onPress: performBlock },
      ],
    );
  };

  const menuItems = [
    { label: "הצג פרופיל", onPress: goToOtherProfile },
    { label: "חסום משתמש", destructive: true, onPress: confirmBlock },
  ];

  // ── "יוצאים לדרך יחד" — המעבר מ"מצאנו שותף" ל"מתחילים לתכנן" ──
  // מעביר את הנתונים שכבר בידינו למסך ההצלחה כדי להימנע מטעינה חוזרת ולהתאים אישית מיד.
  const goToSuccess = () => {
    const me = getUser();
    const myName = me?.firstName || (me?.name ? me.name.split(" ")[0] : "") || "";
    // זוכרים מקומית שהצ'אט עבר לשלב תכנון — כדי להציג באנר בחזרה (בלי שרת).
    AsyncStorage.setItem(journeyKey(matchId), "1").catch(() => {});
    setJourneyStarted(true);
    router.push({
      pathname: "/matching/MatchingSuccess",
      params: {
        matchId: String(matchId),
        tripID: matchData?.tripID != null ? String(matchData.tripID) : "",
        destination: matchData?.tripName && matchData.tripName !== "טיול" ? matchData.tripName : "",
        startDate: matchData?.tripStartDate || "",
        otherUserName: otherName,
        otherUserImage: matchData?.otherUserImage || "",
        myName,
        myImage: me?.profileImage || "",
      },
    });
  };

  // מעבר ישיר למתכנן הטיול מהבאנר (אחרי שיצאו לדרך).
  const openPlanner = () => {
    if (matchData?.tripID != null) {
      router.push({
        pathname: "/TripPlanner/[id]",
        params: { id: String(matchData.tripID) },
      });
    }
  };

  const confirmJourney = () => {
    const dest = matchData?.tripName && matchData.tripName !== "טיול" ? matchData.tripName : "";
    Alert.alert(
      "יוצאים לדרך יחד?",
      dest
        ? `אתם ו${otherName} מתחילים לתכנן את הטיול ל${dest}?`
        : `אתם ו${otherName} מתחילים לתכנן את הטיול המשותף?`,
      [
        { text: "עוד לא", style: "cancel" },
        { text: "יוצאים!", onPress: goToSuccess },
      ],
    );
  };

  const renderMessage = ({ item, index }) => {
    const isMine = item.senderID === currentUser?.userID;
    const prev = messages[index - 1];
    const showDate = item.sentAt && (!prev || dayKey(prev.sentAt) !== dayKey(item.sentAt));

    return (
      <View>
        {showDate ? (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDayLabel(item.sentAt)}</Text>
          </View>
        ) : null}

        <View style={[styles.bubbleRow, isMine ? styles.rowMine : styles.rowOther]}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
            <Text style={[styles.bubbleText, isMine && { color: COLORS.onBrand }]}>
              {item.text}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.bubbleTime, isMine ? styles.timeMine : styles.timeOther]}>
                {formatTime(item.sentAt)}
              </Text>
              {isMine ? (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color="rgba(255,255,255,0.85)"
                  style={{ marginRight: 3 }}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>טוען הודעות…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ChatBackground />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={24} color={COLORS.brand} />
        </TouchableOpacity>

        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.avatarFallback]}>
            {initials ? (
              <Text style={styles.avatarInitials}>{initials}</Text>
            ) : (
              <Ionicons name="person" size={20} color={COLORS.onBrand} />
            )}
          </View>
        )}

        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>
            {matchData?.otherUserName || "צ'אט"}
          </Text>
          {matchData?.tripName && matchData.tripName !== "טיול" ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {matchData.tripName}
            </Text>
          ) : null}
        </View>

        {otherUserId ? (
          <TouchableOpacity
            style={styles.headerOptionsBtn}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="אפשרויות"
          >
            <Ionicons name="ellipsis-vertical" size={22} color={COLORS.brand} />
          </TouchableOpacity>
        ) : null}
      </View>

      <HeaderMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={menuItems}
      />

      {/* ── מוצג רק כשיש הקשר של טיול (tripID). לפני האישור: פס פעולה. אחרי: באנר תכנון ── */}
      {matchData?.tripID != null ? (
        journeyStarted ? (
          <View style={styles.journeyBanner}>
            <View style={styles.journeyBannerRow}>
              <View style={styles.journeyBannerIcon}>
                <Ionicons name="flag" size={18} color={COLORS.brand} />
              </View>
              <View style={styles.journeyBannerTexts}>
                <Text style={styles.journeyBannerTitle}>יצאתם לדרך!</Text>
                <Text style={styles.journeyBannerText}>
                  הטיול שלכם נמצא עכשיו בשלב התכנון.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.journeyBannerBtn}
              onPress={openPlanner}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="פתח את מתכנן הטיול"
            >
              <Ionicons name="calendar" size={16} color={COLORS.onBrand} />
              <Text style={styles.journeyBannerBtnText}>פתח את מתכנן הטיול</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.journeyBar}
            onPress={confirmJourney}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="יצאנו לדרך"
          >
            <Ionicons name="flag" size={17} color={COLORS.onBrand} />
            <Text style={styles.journeyBarText}>יצאנו לדרך</Text>
            <Ionicons name="chevron-back" size={17} color={COLORS.onBrand} />
          </TouchableOpacity>
        )
      ) : null}

      {/* ── אזור הצ'אט (עולה עם המקלדת) ── */}
      <Animated.View style={areaStyle}>
        {loadError ? (
          <View style={styles.errorState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cloud-offline-outline" size={40} color={COLORS.brand} />
            </View>
            <Text style={styles.emptyTitle}>לא הצלחנו לטעון הודעות כרגע</Text>
            <Text style={styles.emptySub}>ננסה שוב בקרוב…</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.messageID)}
            renderItem={renderMessage}
            contentContainerStyle={
              messages.length === 0 ? styles.emptyListContent : styles.listContent
            }
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              messages.length > 0 && flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="chatbubbles-outline" size={40} color={COLORS.brand} />
                </View>
                <Text style={styles.emptyTitle}>אין עדיין הודעות</Text>
                <Text style={styles.emptySub}>שלחו הודעה ראשונה כדי לפתוח את השיחה</Text>
              </View>
            }
          />
        )}

        {/* ── שורת ההקלדה ── */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="הודעה"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              multiline
              textAlign="right"
            />
          </View>
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim()}
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="שליחת הודעה"
          >
            <Ionicons name="send" size={20} color={COLORS.onBrand} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const CHAT_BG = "#EDE7DD";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CHAT_BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: CHAT_BG },
  loadingText: { marginTop: 12, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  errorState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },

  // ── Header ──
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.divider },
  avatarFallback: { backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.onBrand },
  headerText: { flex: 1, alignItems: "flex-end" },
  headerName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  headerSub: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
  headerOptionsBtn: { padding: 4 },

  // ── פס "יוצאים לדרך יחד" ──
  journeyBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: COLORS.brand,
  },
  journeyBarText: {
    fontFamily: FONTS.bold,
    fontSize: 14.5,
    color: COLORS.onBrand,
    letterSpacing: 0.2,
  },

  // ── באנר "יצאתם לדרך" (אחרי האישור) ──
  journeyBanner: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  journeyBannerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  journeyBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  journeyBannerTexts: { flex: 1 },
  journeyBannerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.brand,
    textAlign: "right",
  },
  journeyBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 1,
  },
  journeyBannerBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  journeyBannerBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.onBrand,
  },

  // ── Messages ──
  listContent: { paddingHorizontal: 12, paddingVertical: 14 },

  dateSeparator: {
    alignSelf: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 10,
  },
  dateSeparatorText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textSecondary },

  bubbleRow: { flexDirection: "row", marginBottom: 6 },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "78%",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 16,
  },
  bubbleMine: { backgroundColor: COLORS.brand, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 21, color: COLORS.text, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", marginTop: 3 },
  bubbleTime: { fontSize: 10, fontFamily: FONTS.regular },
  timeMine: { color: "rgba(255,255,255,0.7)" },
  timeOther: { color: COLORS.textMuted },

  // ── Empty ──
  emptyListContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: "center", marginTop: 6 },

  // ── Input ──
  inputBar: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  input: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 120,
    paddingVertical: 10,
  },
  sendBtn: {
    backgroundColor: COLORS.brand,
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: COLORS.textMuted },
});

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BASE_URL } from "../src/api/config";
import {
  getCommunityChat,
  getCommunityMembers,
  getCommunityMessages,
  leaveCommunity,
  sendCommunityMessage,
} from "../src/api/communityChatService";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";
import HeaderMenu from "../../components/HeaderMenu";

const SCREEN_H = Dimensions.get("window").height;

// בונה URI לתמונת פרופיל מתוך נתיב יחסי/מלא — אותו עזר שבשאר האפליקציה.
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// השוואת "זנב" הרשימה (אורך + ההודעה האחרונה) — לדילוג על עדכון מיותר ב-polling.
function sameTail(a, b) {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  return String(a[a.length - 1].messageID) === String(b[b.length - 1].messageID);
}

// אווטר עגול קטן ליד כל הודעה (סגנון WhatsApp). נופל בעדינות לאייקון ברירת-מחדל
// כשאין תמונה או כשהטעינה נכשלת — בלי שינוי גודל/קפיצות בפריסה.
function MessageAvatar({ uri, name }) {
  const [failed, setFailed] = useState(false);
  const showImg = uri && !failed;
  return (
    <View style={styles.msgAvatar}>
      {showImg ? (
        <Image
          source={{ uri }}
          style={styles.msgAvatarImg}
          onError={() => setFailed(true)}
          accessibilityLabel={name ? `תמונת הפרופיל של ${name}` : "תמונת פרופיל"}
        />
      ) : (
        <Ionicons name="person-circle" size={32} color={COLORS.textMuted} />
      )}
    </View>
  );
}

// עוטף כל הודעה באנימציית כניסה עדינה (fade + הזזה קלה) — פעם אחת בעת mount.
// משתמש ב-Animated המובנה עם useNativeDriver, ו-transform בלבד כך שלא משפיע על
// גובה התוכן (לא מפעיל onContentSizeChange ולא פוגע בגלילה/בביצועי FlatList).
function AnimatedMessageRow({ style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function CommunityChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { communityID, name } = useLocalSearchParams();
  const currentUser = getUser();
  const myId = currentUser?.userID;

  const [messages, setMessages] = useState([]); // ישן→חדש
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [nameMap, setNameMap] = useState({}); // userID → "First Last"
  const [avatarMap, setAvatarMap] = useState({}); // userID → profileImage URI
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0); // הודעות שהגיעו בזמן שהמשתמש לא בתחתית
  const [menuVisible, setMenuVisible] = useState(false);
  const [kbHeight, setKbHeight] = useState(0); // חפיפת המקלדת — כדי להרים את שורת הקלט

  const flatListRef = useRef(null);
  const seenCountRef = useRef(0); // כמות ההודעות שהמשתמש כבר "ראה" (בסיס לספירת חדשות)
  const chatIdRef = useRef(null); // chatID זמין ל-polling בלי תלות ב-state אסינכרוני
  const fetchingRef = useRef(false); // מונע חפיפת בקשות polling
  const mountedRef = useRef(true); // מונע setState אחרי יציאה מהמסך
  const nearBottomRef = useRef(true); // האם המשתמש קרוב לתחתית (קובע גלילה אוטומטית)
  const forceScrollRef = useRef(false); // אילוץ גלילה (טעינה ראשונית / שליחת הודעה שלי)

  // ניקוי בעת יציאה מהמסך
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // מעקב אחרי המקלדת — מרימים את שורת הקלט מעליה (עובד ב-iOS וב-Android).
  // מחשבים חפיפה לפי ראש המקלדת (screenY), מדויק גם ב-edge-to-edge.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const top = e.endCoordinates?.screenY ?? SCREEN_H;
      setKbHeight(Math.max(SCREEN_H - top, 0));
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // טוען את חברי הקהילה פעם אחת (קריאה אחת, לא N+1) ובונה שתי מפות:
  //   Map<userID → "First Last">  ו-  Map<userID → profileImage URI>.
  useEffect(() => {
    if (!communityID) return;
    let active = true;
    getCommunityMembers(communityID)
      .then((members) => {
        if (!active) return;
        const names = {};
        const avatars = {};
        (members || []).forEach((m) => {
          const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
          if (full) names[m.userID] = full;
          const uri = buildImageUri(m.profileImage);
          if (uri) avatars[m.userID] = uri;
        });
        setNameMap(names);
        setAvatarMap(avatars);
      })
      .catch(() => {}); // שמות/תמונות הם שיפור — כשל לא מפיל את הצ'אט
    return () => {
      active = false;
    };
  }, [communityID]);

  // טעינה ראשונית: chatID לפי communityID → ואז ההודעות.
  const initChat = useCallback(async () => {
    if (!communityID) return;
    try {
      const chat = await getCommunityChat(communityID);
      if (!mountedRef.current) return;
      chatIdRef.current = chat?.communityChatID ?? null;
      const msgs = await getCommunityMessages(chatIdRef.current);
      if (!mountedRef.current) return;
      setMessages(msgs);
      setLoadError(false);
    } catch {
      if (mountedRef.current) setLoadError(true); // הודעה עדינה, בלי raw error
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [communityID]);

  useEffect(() => {
    if (!myId) {
      router.replace("/Login");
      return;
    }
    setLoading(true);
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initChat]);

  // Polling: רענון הודעות כל 4 שניות בזמן שהמסך בפוקוס; עצירה ביציאה.
  useFocusEffect(
    useCallback(() => {
      const tick = async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        try {
          if (!chatIdRef.current) {
            await initChat(); // אם הצ'אט עוד לא נטען/נכשל — ניסיון חוזר
          } else {
            const msgs = await getCommunityMessages(chatIdRef.current);
            if (mountedRef.current) {
              setMessages((prev) => (sameTail(prev, msgs) ? prev : msgs));
            }
          }
        } catch {
          // כשל ברענון רקע — מתעלמים בשקט; ההודעות הקיימות נשארות
        } finally {
          fetchingRef.current = false;
        }
      };
      const id = setInterval(tick, 4000);
      return () => clearInterval(id);
    }, [initChat]),
  );

  const send = async () => {
    const content = text.trim();
    if (!content || !chatIdRef.current || sending) return;

    setSending(true);
    setText("");

    // עדכון אופטימי — מוסיפים מיד ל-UI
    const optimistic = {
      messageID: `temp-${Date.now()}`,
      senderID: myId,
      text: content,
      sentAt: new Date().toISOString(),
    };
    forceScrollRef.current = true; // הודעה שלי תמיד גוללת לתחתית
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendCommunityMessage(chatIdRef.current, myId, content);
      // רענון מהשרת אחרי שליחה (מאחד את ההודעה האופטימית)
      const fresh = await getCommunityMessages(chatIdRef.current);
      if (mountedRef.current) setMessages(fresh);
    } catch {
      if (mountedRef.current) {
        setMessages((prev) => prev.filter((m) => m.messageID !== optimistic.messageID));
        setText(content); // החזרת הטקסט
        Alert.alert("לא ניתן לשלוח", "ההודעה לא נשלחה. נסו שוב בעוד רגע.");
      }
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const renderMessage = useCallback(
    ({ item }) => {
      const isMine = item.senderID === myId;
      const known = !!nameMap[item.senderID];
      const fullName = known ? nameMap[item.senderID] : "משתמש לא ידוע";
      const avatar = (
        <MessageAvatar uri={avatarMap[item.senderID] || null} name={fullName} />
      );
      const bubble = (
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {!isMine ? (
            <Text
              style={[styles.senderLabel, !known && styles.senderLabelUnknown]}
              numberOfLines={1}
            >
              {fullName}
            </Text>
          ) : null}
          <Text style={[styles.bubbleText, isMine && { color: COLORS.onBrand }]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, isMine ? styles.timeMine : styles.timeOther]}>
            {formatTime(item.sentAt)}
          </Text>
        </View>
      );
      // אחרים: [אווטר] בועה  |  שלי: בועה [אווטר]
      return (
        <AnimatedMessageRow style={[styles.bubbleRow, isMine ? styles.rowMine : styles.rowOther]}>
          {isMine ? (
            <>
              {bubble}
              {avatar}
            </>
          ) : (
            <>
              {avatar}
              {bubble}
            </>
          )}
        </AnimatedMessageRow>
      );
    },
    [myId, nameMap, avatarMap],
  );

  // עוקב אחרי מיקום הגלילה — האם המשתמש קרוב לתחתית (כדי לקבוע גלילה אוטומטית).
  const onScroll = useCallback(
    (e) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const near = distanceFromBottom < 120;
      nearBottomRef.current = near;
      if (near) {
        // חזרה לתחתית ידנית — מאפסים את המונה ואת הבסיס ל"נראה"
        seenCountRef.current = messages.length;
        if (showNewMessagesButton) setShowNewMessagesButton(false);
        if (newMessagesCount !== 0) setNewMessagesCount(0);
      }
    },
    [showNewMessagesButton, newMessagesCount, messages.length],
  );

  // נקרא כשגובה התוכן משתנה (הודעה חדשה / טעינה ראשונית).
  // גוללים רק אם המשתמש כבר בתחתית או שאולץ (טעינה/שליחה שלי); אחרת סופרים ומציגים תג.
  const onContentSizeChange = useCallback(() => {
    if (messages.length === 0) return;
    if (forceScrollRef.current || nearBottomRef.current) {
      const animated = !forceScrollRef.current;
      flatListRef.current?.scrollToEnd({ animated });
      forceScrollRef.current = false; // דגל חד-פעמי — מתאפס מיד אחרי שימוש
      nearBottomRef.current = true; // אחרי גלילה לתחתית אנחנו בתחתית (מונע הבהוב כפתור)
      seenCountRef.current = messages.length; // ראינו את הכל
      setShowNewMessagesButton(false);
      setNewMessagesCount(0);
    } else {
      // המשתמש גולל למעלה — סופרים כמה הודעות חדשות הצטברו מאז שעזב את התחתית
      const unread = messages.length - seenCountRef.current;
      setShowNewMessagesButton(true);
      setNewMessagesCount(unread > 0 ? unread : 0);
    }
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    nearBottomRef.current = true;
    seenCountRef.current = messages.length;
    setShowNewMessagesButton(false);
    setNewMessagesCount(0);
  }, [messages.length]);

  // ── תפריט 3 נקודות ──
  const goToMembers = () => {
    router.push({
      pathname: "/community-members/[communityID]",
      params: { communityID, communityName: name || "" },
    });
  };

  const performLeave = async () => {
    try {
      await leaveCommunity(communityID, myId);
      Alert.alert("עזבת את הקהילה", "לא תקבל/י יותר הודעות מהקבוצה.", [
        { text: "אישור", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("שגיאה", "לא ניתן לעזוב את הקהילה כרגע. נסו שוב.");
    }
  };

  const confirmLeave = () => {
    Alert.alert(
      "עזיבת הקהילה",
      `לעזוב את "${name || "הקהילה"}"?\nלא תראה/י יותר את הצ'אט הקבוצתי.`,
      [
        { text: "ביטול", style: "cancel" },
        { text: "עזוב", style: "destructive", onPress: performLeave },
      ],
    );
  };

  const menuItems = [
    { label: "צפייה במשתתפים", onPress: goToMembers },
    { label: "צא מהקבוצה", destructive: true, onPress: confirmLeave },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>טוען הודעות...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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

        <View style={styles.headerIcon}>
          <Ionicons name="people" size={20} color={COLORS.onBrand} />
        </View>

        <TouchableOpacity
          style={styles.headerText}
          activeOpacity={0.7}
          onPress={goToMembers}
          accessibilityRole="button"
          accessibilityLabel="צפייה במשתתפי הקהילה"
        >
          <Text style={styles.headerName} numberOfLines={1}>
            {name || "צ'אט קהילה"}
          </Text>
          <Text style={styles.headerSub}>{"צ'אט קבוצתי"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerOptionsBtn}
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="אפשרויות"
        >
          <Ionicons name="ellipsis-vertical" size={22} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      <HeaderMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={menuItems}
      />

      <View style={[styles.flex, { paddingBottom: kbHeight }]}>
        {loadError ? (
          <View style={styles.stateBox}>
            <View style={styles.stateIconCircle}>
              <Ionicons name="cloud-offline-outline" size={40} color={COLORS.brand} />
            </View>
            <Text style={styles.stateTitle}>לא ניתן לטעון את ההודעות כרגע</Text>
            <Text style={styles.stateSub}>נסו שוב בעוד מספר דקות</Text>
          </View>
        ) : (
          <View style={styles.flex}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => String(item.messageID)}
              renderItem={renderMessage}
              initialNumToRender={15}
              windowSize={10}
              removeClippedSubviews
              contentContainerStyle={
                messages.length === 0 ? styles.emptyListContent : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              onContentSizeChange={onContentSizeChange}
              ListEmptyComponent={
                <View style={styles.stateBox}>
                  <View style={styles.stateIconCircle}>
                    <Ionicons name="chatbubbles-outline" size={40} color={COLORS.brand} />
                  </View>
                  <Text style={styles.stateTitle}>אין הודעות עדיין</Text>
                  <Text style={styles.stateSub}>היו הראשונים להתחיל את השיחה</Text>
                </View>
              }
            />

            {/* תג צף "הודעות חדשות" עם מונה — מופיע כשמגיעות הודעות בזמן שגוללים למעלה */}
            {showNewMessagesButton ? (
              <TouchableOpacity
                style={styles.newMessagesBtn}
                onPress={scrollToBottom}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  newMessagesCount > 0
                    ? `${newMessagesCount} הודעות חדשות, גלילה לתחתית`
                    : "גלילה להודעות חדשות"
                }
              >
                <View style={styles.newMessagesDot} />
                <Text style={styles.newMessagesText}>
                  {newMessagesCount > 1
                    ? `${newMessagesCount} הודעות חדשות`
                    : newMessagesCount === 1
                      ? "הודעה חדשה"
                      : "הודעות חדשות"}
                </Text>
                <Ionicons name="arrow-down" size={16} color={COLORS.onBrand} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── שורת הקלדה ── */}
        <View style={[styles.inputBar, { paddingBottom: kbHeight > 0 ? 8 : insets.bottom + 8 }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="הודעה"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              multiline
              textAlign="right"
              onSubmitEditing={send}
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="שליחת הודעה"
          >
            {sending ? (
              <ActivityIndicator color={COLORS.onBrand} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.onBrand} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const CHAT_BG = "#EDE7DD";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: CHAT_BG },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CHAT_BG,
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

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
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1, alignItems: "flex-end" },
  headerName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  headerSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerOptionsBtn: { padding: 4 },

  // ── Messages ──
  listContent: { paddingHorizontal: 12, paddingVertical: 14 },

  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 6 },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },

  // אווטר עגול קטן ליד הבועה — גודל קבוע כדי למנוע קפיצות בפריסה
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 6,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  msgAvatarImg: { width: 32, height: 32, borderRadius: 16 },

  bubble: {
    maxWidth: "74%",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 16,
  },
  bubbleMine: { backgroundColor: COLORS.brand, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  senderLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 2,
  },
  senderLabelUnknown: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontStyle: "italic",
  },
  bubbleText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.text,
    textAlign: "right",
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    marginTop: 3,
    textAlign: "left",
  },
  timeMine: { color: "rgba(255,255,255,0.7)" },
  timeOther: { color: COLORS.textMuted },

  // ── כפתור "הודעות חדשות" צף ──
  newMessagesBtn: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brand,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  newMessagesText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.onBrand,
  },
  newMessagesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
  },

  // ── State boxes (empty / error) ──
  emptyListContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  stateBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  stateIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  stateTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  stateSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },

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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: COLORS.textMuted },
});

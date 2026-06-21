import React, { useEffect, useRef, useState } from "react";
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

import {
  getChatMessages,
  getMatchById,
  sendChatMessage,
} from "../src/api/chatService";
import { BASE_URL } from "../src/api/config";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

// ── עזרי תצוגה ──
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

// ── רקע צ'אט דמוי-וואטסאפ: דגם עדין של אייקוני טיולים ──
const DOODLES = [
  "airplane-outline", "earth-outline", "boat-outline", "bag-handle-outline",
  "map-outline", "compass-outline", "camera-outline", "umbrella-outline",
];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const DOODLE_GAP = 78;

function ChatBackground() {
  const cols = Math.ceil(SCREEN_W / DOODLE_GAP) + 1;
  const rows = Math.ceil(SCREEN_H / DOODLE_GAP) + 1;
  const icons = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) % DOODLES.length;
      icons.push(
        <Ionicons
          key={`${r}-${c}`}
          name={DOODLES[idx]}
          size={26}
          color={COLORS.brand}
          style={{
            position: "absolute",
            top: r * DOODLE_GAP + 12,
            left: c * DOODLE_GAP + (r % 2 ? DOODLE_GAP / 2 : 0),
            opacity: 0.05,
            transform: [{ rotate: (r + c) % 2 ? "-18deg" : "16deg" }],
          }}
        />,
      );
    }
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {icons}
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams();
  const currentUser = getUser();

  const [messages, setMessages] = useState([]); // ישן→חדש
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);

  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

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

  useEffect(() => {
    if (!currentUser?.userID) {
      router.replace("/Login");
      return;
    }
    loadChat();
  }, []);

  const loadChat = async () => {
    try {
      const match = await getMatchById(matchId);
      setMatchData(match);
      const msgs = await getChatMessages(match.chatID);
      setMessages(msgs);
    } catch (err) {
      Alert.alert("שגיאה", "טעינת הצ'אט נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const t = text.trim();
    if (!t || !matchData?.chatID) return;
    setText("");
    try {
      const saved = await sendChatMessage(matchData.chatID, t, currentUser?.userID);
      setMessages((prev) => [...prev, saved]);
    } catch (err) {
      setText(t); // החזרת הטקסט אם נכשל
      Alert.alert("שגיאה", "לא ניתן לשלוח הודעה");
    }
  };

  // ── אווטר לכותרת ──
  const avatarUri = buildImageUri(matchData?.otherUserImage);
  const initials =
    (matchData?.otherUserName || "")
      .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "";

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
          <Text style={styles.headerSub} numberOfLines={1}>
            {matchData?.tripName || "טיול"}
          </Text>
        </View>
      </View>

      {/* ── אזור הצ'אט (עולה עם המקלדת) ── */}
      <Animated.View style={areaStyle}>
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
              <Text style={styles.emptySub}>שלחו הודעה ראשונה כדי לפתוח את השיחה ✈️</Text>
            </View>
          }
        />

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

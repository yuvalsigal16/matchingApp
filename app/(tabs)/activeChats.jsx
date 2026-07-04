import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "../src/api/config";
import { COLORS, FONTS } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import { getMyMatches } from "../src/api/notificationService";
import { getChatMessages } from "../src/api/chatService";
import BottomNav from "../../components/BottomNav";

// "נקרא לאחרונה" לכל צ'אט — נשמר מקומית (matchID → timestamp במילישניות).
// משמש לספירת הודעות חדשות מהצד השני שהגיעו אחרי הכניסה האחרונה לצ'אט.
const LAST_SEEN_KEY = "chat_last_seen";

async function getLastSeenMap() {
  try {
    const raw = await AsyncStorage.getItem(LAST_SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function markChatSeen(matchID) {
  try {
    const map = await getLastSeenMap();
    map[matchID] = Date.now();
    await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(map));
  } catch {}
}

// בונה URI מלא לתמונת פרופיל
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

// זמן יחסי לרשימת הצ'אטים: היום → HH:MM, אתמול, אחרת DD/MM/YYYY
function formatChatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const k = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (k(d) === k(today)) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  if (k(d) === k(yesterday)) return "אתמול";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// צבעי אווטר פסטליים — צבע יציב לכל משתמש לפי שמו (מראה מודרני כמו במוקאפ).
const AVATAR_COLORS = ["#F5D9E0", "#D9E7F5", "#D6F0E6", "#F5EAD3", "#E7DCF5", "#F5DAD6", "#DCEFF0"];
function avatarColor(name) {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function ActiveChatsScreen() {
  const router = useRouter();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = async (silent = false) => {
    if (!silent) setLoading(true);
    const userId = getUser()?.userID;
    if (!userId) {
      setLoading(false);
      return;
    }

    const data = await getMyMatches(userId);

    // רק צ'אטים פעילים, ממוינים מהאחרון שדובר בו
    const active = (data || [])
      .filter((m) => m.status !== "Closed")
      .sort((a, b) => {
        const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return tb - ta;
      });

    // ספירת הודעות שלא נקראו לכל צ'אט: הודעות מהצד השני שהגיעו אחרי הכניסה האחרונה.
    const lastSeen = await getLastSeenMap();
    const withUnread = await Promise.all(
      active.map(async (c) => {
        if (!c.chatID) return { ...c, unreadCount: 0 };
        try {
          const msgs = await getChatMessages(c.chatID);
          const seenAt = lastSeen[c.matchID] || 0;
          const unreadCount = (msgs || []).filter(
            (m) =>
              String(m.senderID) !== String(userId) &&
              new Date(m.sentAt).getTime() > seenAt,
          ).length;
          return { ...c, unreadCount };
        } catch {
          return { ...c, unreadCount: 0 };
        }
      }),
    );

    setChats(withUnread);
    if (!silent) setLoading(false);
  };

  // טעינה בכל כניסה למסך — מרענן גם אחרי חזרה מצ'אט
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats(true);
    setRefreshing(false);
  };

  const openChat = (matchId) => {
    // מסמנים כנקרא ומנקים את התג מיד (עוד לפני הרענון בחזרה למסך)
    markChatSeen(matchId);
    setChats((prev) =>
      prev.map((c) => (c.matchID === matchId ? { ...c, unreadCount: 0 } : c)),
    );
    router.push({ pathname: "/chat/[matchId]", params: { matchId } });
  };

  const renderAvatar = (chat) => {
    const uri = buildImageUri(chat.otherUserImage);
    if (uri) return <Image source={{ uri }} style={styles.avatar} />;
    const initials =
      (chat.otherUserName || "")
        .split(" ")
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "";
    return (
      <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarColor(chat.otherUserName) }]}>
        {initials ? (
          <Text style={styles.avatarInitials}>{initials}</Text>
        ) : (
          <Ionicons name="person" size={24} color="rgba(0,0,0,0.4)" />
        )}
      </View>
    );
  };

  const renderChat = ({ item }) => {
    const preview = item.lastMessage
      ? item.lastMessage
      : item.tripName
        ? `טיול משותף: ${item.tripName}`
        : "התחילו לשוחח";
    const time = item.lastMessageTime ? formatChatTime(item.lastMessageTime) : "";
    const unread = item.unreadCount || 0; // מוצג רק אם קיים נתון (כרגע השרת לא מספק)

    return (
      <TouchableOpacity
        style={styles.chatRow}
        activeOpacity={0.7}
        onPress={() => openChat(item.matchID)}
      >
        {renderAvatar(item)}

        <View style={styles.chatInfo}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.otherUserName}
          </Text>
          <Text
            style={[styles.chatPreview, unread > 0 && styles.chatPreviewUnread]}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>

        <View style={styles.chatMeta}>
          {time ? <Text style={styles.chatTime}>{time}</Text> : null}
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>{"צ'אטים פעילים"}</Text>

      <FlatList
        data={chats}
        keyExtractor={(item) => String(item.matchID)}
        renderItem={renderChat}
        contentContainerStyle={
          chats.length === 0 ? styles.emptyListContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubbles-outline" size={40} color={COLORS.brand} />
            </View>
            <Text style={styles.emptyTitle}>{"אין צ'אטים עדיין"}</Text>
            <Text style={styles.emptySub}>
              {"כשתאשרו בקשת צ'אט, השיחה תופיע כאן"}
            </Text>
          </View>
        }
      />

      <BottomNav active="notifications" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },

  listContent: { paddingTop: 4, paddingBottom: 20 },

  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginRight: 84, // מתחיל אחרי האווטר (כמו וואטסאפ)
  },

  chatRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.divider,
    marginLeft: 12,
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "rgba(0,0,0,0.5)",
  },

  chatInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  chatName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
  },
  chatPreview: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
  },
  chatPreviewUnread: {
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },

  chatMeta: {
    alignItems: "center",
    gap: 6,
    marginRight: 6,
    minWidth: 40,
  },
  chatTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },

  // ── Empty ──
  emptyListContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
});

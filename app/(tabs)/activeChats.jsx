import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MapPin, MessageCircle } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import { getMyMatches } from "../src/api/notificationService";
import { getChatMessages } from "../src/api/chatService";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";
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

  const renderChat = ({ item }) => {
    // צ'אט שמקורו בטיול — יש לו יעד אמיתי (לא ה-placeholder "טיול"). הצ'יפ מסמן זאת.
    const isTrip = item.tripName && item.tripName !== "טיול";
    const preview = item.lastMessage
      ? item.lastMessage
      : isTrip
        ? "התחילו לתכנן יחד"
        : "התחילו לשוחח";
    const time = item.lastMessageTime ? formatChatTime(item.lastMessageTime) : "";
    const unread = item.unreadCount || 0;

    return (
      <TouchableOpacity
        style={styles.chatRow}
        activeOpacity={0.7}
        onPress={() => openChat(item.matchID)}
        accessibilityRole="button"
        accessibilityLabel={`צ'אט עם ${item.otherUserName}`}
      >
        <Avatar uri={item.otherUserImage} name={item.otherUserName} size="md" />

        <View style={styles.chatInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.otherUserName}
            </Text>
            {/* צ'יפ הקשר-הטיול — שומר על זהות ה-Travel: יעד המסע המשותף לצד השם. */}
            {isTrip ? (
              <View style={styles.tripChip}>
                <MapPin size={11} color={COLORS.brand} strokeWidth={2.2} />
                <Text style={styles.tripChipText} numberOfLines={1}>
                  {item.tripName}
                </Text>
              </View>
            ) : null}
          </View>
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
              <Text style={styles.unreadBadgeText}>
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="צ'אטים פעילים" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
        <BottomNav active="notifications" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="צ'אטים פעילים" onBack={() => router.back()} />

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
          <EmptyState
            Icon={MessageCircle}
            title="אין צ'אטים עדיין"
            subtitle="כשתאשרו בקשת צ'אט השיחה תופיע כאן. בינתיים — מצאו מישהו לצאת איתו לדרך."
            actionLabel="מצאו עם מי לצאת לדרך"
            onAction={() => router.push("/matchesForYou")}
          />
        }
      />

      <BottomNav active="notifications" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  listContent: { paddingTop: SPACING.xs, paddingBottom: SPACING.xl },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // קו-הפרדה מתחיל אחרי האווטר (רשימת-שיחות, כמו iMessage): גוטר + אווטר(52) + gap.
  separator: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginRight: SPACING.xl + 52 + SPACING.md,
  },

  chatRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },

  chatInfo: { flex: 1, justifyContent: "center", gap: SPACING.xs / 2 },
  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.xs + 2,
  },
  chatName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "right",
    flexShrink: 1,
  },
  // צ'יפ הקשר-טיול — גוון מותג עדין, MapPin + יעד. סימון קליל, travel-native.
  tripChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    flexShrink: 0,
    maxWidth: 130,
  },
  tripChipText: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.medium,
    color: COLORS.brand,
  },
  chatPreview: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: "right",
  },
  chatPreviewUnread: { color: COLORS.text, fontFamily: FONTS.bold },

  chatMeta: { alignItems: "center", gap: SPACING.xs + 2, minWidth: 40 },
  chatTime: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs + 2,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadgeText: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },
});

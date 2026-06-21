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

import { BASE_URL } from "../src/api/config";
import { COLORS, FONTS } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import { getMyMatches } from "../src/api/notificationService";
import BottomNav from "../../components/BottomNav";

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

    setChats(active);
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

  const openChat = (matchId) =>
    router.push({ pathname: "/chat/[matchId]", params: { matchId } });

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
      <View style={[styles.avatar, styles.avatarFallback]}>
        {initials ? (
          <Text style={styles.avatarInitials}>{initials}</Text>
        ) : (
          <Ionicons name="person" size={24} color={COLORS.onBrand} />
        )}
      </View>
    );
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity
      style={styles.chatRow}
      activeOpacity={0.7}
      onPress={() => openChat(item.matchID)}
    >
      {renderAvatar(item)}

      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.otherUserName}
          </Text>
          {item.lastMessageTime ? (
            <Text style={styles.chatTime}>{formatChatTime(item.lastMessageTime)}</Text>
          ) : null}
        </View>

        <Text style={styles.chatPreview} numberOfLines={1}>
          {item.lastMessage
            ? item.lastMessage
            : item.tripName
              ? `טיול משותף: ${item.tripName}`
              : "התחילו לשוחח 👋"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.header}>צ'אטים</Text>
        <View style={{ width: 26 }} />
      </View>

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
            <Text style={styles.emptyTitle}>אין צ'אטים עדיין</Text>
            <Text style={styles.emptySub}>
              כשתאשרו בקשת צ'אט, השיחה תופיע כאן
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

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  header: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
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
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.divider,
    marginLeft: 14,
  },
  avatarFallback: {
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },

  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  chatTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
  },
  chatTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  chatPreview: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
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

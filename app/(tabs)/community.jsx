import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Check, Plus, Users } from "lucide-react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";
import {
  getCommunityChat,
  getCommunityMembers,
  getCommunityMessages,
} from "../src/api/communityChatService";
import BottomNav from "../../components/BottomNav";

// "נקרא לאחרונה" לכל קהילה — נשמר מקומית (communityID → timestamp במילישניות).
const COMMUNITY_LAST_SEEN_KEY = "community_last_seen";

async function getCommunityLastSeenMap() {
  try {
    const raw = await AsyncStorage.getItem(COMMUNITY_LAST_SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function markCommunitySeen(communityID) {
  try {
    const map = await getCommunityLastSeenMap();
    map[communityID] = Date.now();
    await AsyncStorage.setItem(COMMUNITY_LAST_SEEN_KEY, JSON.stringify(map));
  } catch {}
}

const ICON_COLORS = [
  { bg: "#DCFCE7", icon: "#16A34A" },
  { bg: "#DBEAFE", icon: "#2563EB" },
  { bg: "#FCE7F3", icon: "#DB2777" },
  { bg: "#FEF3C7", icon: "#D97706" },
  { bg: "#EDE9FE", icon: "#7E76A6" },
  { bg: "#FFE4E6", icon: "#E11D48" },
];

export default function CommunityScreen() {
  const router = useRouter();

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState({});
  // מזהי הקהילות שאני כבר חבר בהן (השרת לא מחזיר isJoined, אז מחשבים בצד לקוח).
  const [joinedIds, setJoinedIds] = useState(new Set());
  // מספר הודעות שלא נקראו לכל קהילה שאני חבר בה (communityID → count).
  const [unreadMap, setUnreadMap] = useState({});

  useEffect(() => {
    loadCommunities();
  }, []);

  // רענון הרשימה בכל חזרה למסך (למשל אחרי יצירת קהילה חדשה).
  useFocusEffect(
    useCallback(() => {
      loadCommunities(true);
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunities(true);
    setRefreshing(false);
  };

  const loadCommunities = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/Community`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = (await res.json()) || [];
        setCommunities(data);
        computeMembership(data);
      }
    } catch (err) {
      console.error("loadCommunities:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // בדיקת חברות לכל קהילה: מושכים את החברים (endpoint קיים) ובודקים אם אני ברשימה.
  // ה-endpoint מחזיר חברים רק לחברי הקהילה, אז לא-חבר מקבל רשימה ריקה → לא מסומן.
  const computeMembership = async (list) => {
    const myId = getUser()?.userID;
    if (!myId) return;
    try {
      const lastSeen = await getCommunityLastSeenMap();
      const joined = new Set();
      const unread = {};
      await Promise.all(
        (list || []).map(async (c) => {
          try {
            const members = await getCommunityMembers(c.communityID);
            const isMember = (members || []).some(
              (m) => String(m.userID) === String(myId),
            );
            if (!isMember) return;
            joined.add(c.communityID);
            // ספירת הודעות שלא נקראו — רק לקהילות שאני חבר בהן (הודעות מאחרים אחרי הכניסה האחרונה).
            try {
              const chat = await getCommunityChat(c.communityID);
              const msgs = await getCommunityMessages(chat?.communityChatID);
              const seenAt = lastSeen[c.communityID] || 0;
              unread[c.communityID] = (msgs || []).filter(
                (m) =>
                  String(m.senderID) !== String(myId) &&
                  new Date(m.sentAt).getTime() > seenAt,
              ).length;
            } catch {
              // כשל בטעינת הודעות של קהילה בודדת לא מפיל את הרשימה
            }
          } catch {
            // כשל בבדיקת חברות של קהילה בודדת לא מפיל את הרשימה
          }
        }),
      );
      setJoinedIds(joined);
      setUnreadMap(unread);
    } catch {
      // כשל בבדיקת חברות לא מפיל את הרשימה
    }
  };

  // פתיחת צ'אט קהילה — מסמן כנקרא ומנקה את התג מיד.
  const openCommunityChat = (c) => {
    markCommunitySeen(c.communityID);
    setUnreadMap((prev) => ({ ...prev, [c.communityID]: 0 }));
    router.push({
      pathname: "/community-chat/[communityID]",
      params: { communityID: c.communityID, name: c.communityName },
    });
  };

  const handleJoin = async (communityId) => {
    const me = getUser();
    if (!me?.userID) {
      Alert.alert("שגיאה", "יש להתחבר כדי להצטרף לקהילה");
      return;
    }
    setJoining((prev) => ({ ...prev, [communityId]: true }));
    try {
      const token = getToken();
      // ההצטרפות נעשית דרך CommunityMember עם פרמטרים ב-query string
      // (ה-controller מקבל communityID + userID כפרמטרים, לא ב-body).
      // ה-route הקודם /Community/{id}/join לא קיים בשרת וגרם לשגיאה.
      const res = await fetch(
        `${BASE_URL}/CommunityMember?communityID=${communityId}&userID=${me.userID}`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (res.ok) {
        setJoinedIds((prev) => new Set(prev).add(communityId));
        setCommunities((prev) =>
          prev.map((c) =>
            c.communityID === communityId
              ? { ...c, membersCount: (c.membersCount || 0) + 1 }
              : c
          )
        );
      } else {
        const msg = await res.text().catch(() => "");
        // אם השרת מדווח שכבר חבר — פשוט לסמן כחבר, בלי שגיאה מבלבלת.
        if (/already/i.test(msg)) {
          setJoinedIds((prev) => new Set(prev).add(communityId));
        } else {
          Alert.alert("שגיאה", msg || "לא הצלחנו להצטרף לקהילה. נסה שוב.");
        }
      }
    } catch {
      Alert.alert("שגיאה", "בעיית תקשורת. נסה שוב.");
    } finally {
      setJoining((prev) => ({ ...prev, [communityId]: false }));
    }
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
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.title}>קהילות</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.subtitle}>בחר קהילה להצטרף אליה</Text>

      {/* כפתור הוספה מעל הרשימה */}
      <View style={styles.addRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/community-create")}
          accessibilityRole="button"
          accessibilityLabel="יצירת קהילה חדשה"
        >
          <Plus size={20} color={COLORS.onBrand} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
      >
        {communities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Users size={40} color={COLORS.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyText}>אין קהילות עדיין</Text>
          </View>
        ) : (
          communities.map((c, index) => {
            const color = ICON_COLORS[index % ICON_COLORS.length];
            const isJoining = joining[c.communityID];
            const isJoined = joinedIds.has(c.communityID);
            const unread = isJoined ? unreadMap[c.communityID] || 0 : 0;

            return (
              <TouchableOpacity
                key={c.communityID}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openCommunityChat(c)}
              >
                {/* חבר בקהילה → חיווי סטטי (לא כפתור). אחרת → כפתור הצטרף. */}
                {isJoined ? (
                  <View style={styles.memberChip}>
                    <Check size={14} color={COLORS.brand} strokeWidth={2.5} />
                    <Text style={styles.memberChipText}>חבר</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoin(c.communityID)}
                    disabled={isJoining}
                    activeOpacity={0.8}
                  >
                    {isJoining ? (
                      <ActivityIndicator size="small" color={COLORS.onBrand} />
                    ) : (
                      <Text style={styles.joinText}>הצטרף</Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* פרטי קהילה */}
                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{c.communityName}</Text>
                  <Text style={styles.cardMembers}>
                    {(c.membersCount || 0).toLocaleString()} חברים
                  </Text>
                </View>

                {/* אייקון + תג הודעות שלא נקראו */}
                <View>
                  <View style={[styles.iconBox, { backgroundColor: color.bg }]}>
                    <Users size={22} color={color.icon} strokeWidth={2} />
                  </View>
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
          })
        )}
      </ScrollView>

      <BottomNav active="discovery" />
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
    paddingTop: 16,
    paddingBottom: 8,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  addRow: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 6,
    alignItems: "flex-start",
  },

  title: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 2,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // תג הודעות שלא נקראו — עיגול קטן בפינת אייקון הקהילה (כמו וואטסאפ)
  unreadBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },

  cardText: {
    flex: 1,
    alignItems: "flex-end",
    paddingHorizontal: 14,
  },

  cardName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 4,
  },

  cardMembers: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
  },

  joinBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },

  joinBtnDone: {
    backgroundColor: COLORS.textSecondary,
  },

  joinText: {
    color: COLORS.onBrand,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  // חיווי "חבר" — לא כפתור, רק אינדיקציה שכבר הצטרפת
  memberChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 72,
    justifyContent: "center",
    backgroundColor: COLORS.brandLight,
  },
  memberChipText: {
    color: COLORS.brand,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
    gap: 12,
  },

  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});

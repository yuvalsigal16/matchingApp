import { useCallback, useEffect, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import { Check, Plus, Users } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import {
  getCommunityChat,
  getCommunityMembers,
  getCommunityMessages,
} from "../src/api/communityChatService";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Card from "../../components/ui/Card";
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";
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
          Alert.alert("שגיאה", msg || "לא הצלחנו להצטרף לקהילה. נסו שוב.");
        }
      }
    } catch {
      Alert.alert("שגיאה", "בעיית תקשורת. נסו שוב.");
    } finally {
      setJoining((prev) => ({ ...prev, [communityId]: false }));
    }
  };

  const renderCommunity = (c) => {
    const isJoining = joining[c.communityID];
    const isJoined = joinedIds.has(c.communityID);
    const unread = isJoined ? unreadMap[c.communityID] || 0 : 0;

    return (
      <Card
        key={c.communityID}
        onPress={() => openCommunityChat(c)}
        accessibilityLabel={`קהילת ${c.communityName}`}
      >
        <View style={styles.cardRow}>
          {/* זהות הקהילה — מונוגרם דרך Avatar (ראשי-תיבות של השם) + תג unread בפינה. */}
          <View>
            <Avatar name={c.communityName} size="md" />
            {unread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardText}>
            <Text style={styles.cardName} numberOfLines={1}>
              {c.communityName}
            </Text>
            <Text style={styles.cardMembers}>
              {(c.membersCount || 0).toLocaleString()} חברים
            </Text>
          </View>

          {/* חבר בקהילה → חיווי סטטי; אחרת → כפתור הצטרף. */}
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
              accessibilityRole="button"
              accessibilityLabel={`הצטרפות לקהילת ${c.communityName}`}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={COLORS.onBrand} />
              ) : (
                <Text style={styles.joinText}>הצטרף</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="קהילות" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
        <BottomNav active="discovery" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="קהילות"
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            onPress={() => router.push("/community-create")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="יצירת קהילה"
          >
            <Plus size={24} color={COLORS.brand} strokeWidth={2.4} />
          </TouchableOpacity>
        }
      />

      {communities.length > 0 ? (
        <Text style={styles.lead}>גלו קהילות מטיילים והצטרפו לשיחה</Text>
      ) : null}

      <ScrollView
        contentContainerStyle={
          communities.length === 0 ? styles.emptyListContent : styles.list
        }
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
          <EmptyState
            Icon={Users}
            title="אין קהילות עדיין"
            subtitle="קהילות הן דרך למצוא שותפים לטיול סביב יעד או תחום עניין. פתחו את הראשונה."
            actionLabel="צרו קהילה ראשונה"
            onAction={() => router.push("/community-create")}
          />
        ) : (
          communities.map(renderCommunity)
        )}
      </ScrollView>

      <BottomNav active="discovery" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  lead: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "right",
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },

  list: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },

  cardRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
  },

  cardText: { flex: 1, alignItems: "flex-end" },
  cardName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 2,
  },
  cardMembers: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "right",
  },

  // תג הודעות שלא נקראו — בפינת האווטר (כמו וואטסאפ).
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs + 1,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  unreadBadgeText: {
    ...TYPOGRAPHY.tiny,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },

  // כפתור "הצטרף" — pill קומפקטי בתוך השורה (Button md גבוה מדי לכאן).
  joinBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  joinText: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },

  // חיווי "חבר" — לא כפתור, רק אינדיקציה שכבר הצטרפת.
  memberChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    minWidth: 72,
    justifyContent: "center",
    backgroundColor: COLORS.brandLight,
  },
  memberChipText: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },
});

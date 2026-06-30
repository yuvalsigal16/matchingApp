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
import { ChevronRight, Plus, Users } from "lucide-react-native";

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";
import BottomNav from "../../components/BottomNav";

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
  const user = getUser();
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState({});

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
        const data = await res.json();
        setCommunities(data || []);
      }
    } catch (err) {
      console.error("loadCommunities:", err);
    } finally {
      if (!silent) setLoading(false);
    }
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
        setCommunities((prev) =>
          prev.map((c) =>
            c.communityID === communityId
              ? { ...c, isJoined: true, membersCount: (c.membersCount || 0) + 1 }
              : c
          )
        );
      } else {
        const msg = await res.text().catch(() => "");
        Alert.alert("שגיאה", msg || "לא הצלחנו להצטרף לקהילה. נסה שוב.");
      }
    } catch (err) {
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
          <ChevronRight size={22} color={COLORS.brand} />
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
            const isJoined = c.isJoined;

            return (
              <TouchableOpacity
                key={c.communityID}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/community-chat/[communityID]",
                    params: { communityID: c.communityID, name: c.communityName },
                  })
                }
              >
                {/* כפתור הצטרף */}
                <TouchableOpacity
                  style={[styles.joinBtn, isJoined && styles.joinBtnDone]}
                  onPress={() => !isJoined && handleJoin(c.communityID)}
                  disabled={isJoining || isJoined}
                  activeOpacity={0.8}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color={COLORS.onBrand} />
                  ) : (
                    <Text style={styles.joinText}>
                      {isJoined ? "חבר" : "הצטרף"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* פרטי קהילה */}
                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{c.communityName}</Text>
                  <Text style={styles.cardMembers}>
                    {(c.membersCount || 0).toLocaleString()} חברים
                  </Text>
                </View>

                {/* אייקון */}
                <View style={[styles.iconBox, { backgroundColor: color.bg }]}>
                  <Users size={22} color={color.icon} strokeWidth={2} />
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

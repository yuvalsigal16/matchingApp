import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Users } from "lucide-react-native";

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { FONTS } from "../src/theme/fonts";
import BottomNav from "../../components/BottomNav";

const ICON_COLORS = [
  { bg: "#DCFCE7", icon: "#16A34A" },
  { bg: "#DBEAFE", icon: "#2563EB" },
  { bg: "#FCE7F3", icon: "#DB2777" },
  { bg: "#FEF3C7", icon: "#D97706" },
  { bg: "#EDE9FE", icon: "#7C3AED" },
  { bg: "#FFE4E6", icon: "#E11D48" },
];

export default function CommunityScreen() {
  const router = useRouter();
  const user = getUser();
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState({});

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleJoin = async (communityId) => {
    setJoining((prev) => ({ ...prev, [communityId]: true }));
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/Community/${communityId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.communityID === communityId
              ? { ...c, isJoined: true, membersCount: (c.membersCount || 0) + 1 }
              : c
          )
        );
      } else {
        Alert.alert("שגיאה", "לא הצלחנו להצטרף לקהילה. נסה שוב.");
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
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* שורת ראש */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#1A3C40" />
        </TouchableOpacity>
        {initials ? (
          <View style={styles.initialsBox}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* כותרת */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>קהילות</Text>
        <Text style={styles.subtitle}>בחר קהילה להצטרף אליה</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {communities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Users size={40} color="#ccc" strokeWidth={1.5} />
            <Text style={styles.emptyText}>אין קהילות עדיין</Text>
          </View>
        ) : (
          communities.map((c, index) => {
            const color = ICON_COLORS[index % ICON_COLORS.length];
            const isJoining = joining[c.communityID];
            const isJoined = c.isJoined;

            return (
              <View key={c.communityID} style={styles.card}>
                {/* כפתור הצטרף */}
                <TouchableOpacity
                  style={[styles.joinBtn, isJoined && styles.joinBtnDone]}
                  onPress={() => !isJoined && handleJoin(c.communityID)}
                  disabled={isJoining || isJoined}
                  activeOpacity={0.8}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color="#fff" />
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
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="discovery" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
  },

  topRow: {
    flexDirection: "row",
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
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  initialsBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E3EFE5",
    justifyContent: "center",
    alignItems: "center",
  },

  initialsText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  titleBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },

  title: {
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    color: "#1A1A1A",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#888",
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
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
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
    color: "#1A1A1A",
    textAlign: "right",
    marginBottom: 4,
  },

  cardMembers: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#999",
    textAlign: "right",
  },

  joinBtn: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },

  joinBtnDone: {
    backgroundColor: "#6B7280",
  },

  joinText: {
    color: "#fff",
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
    color: "#888",
    fontFamily: FONTS.regular,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getBlockedUsers, unblockUser } from "./src/api/blockService";
import { BASE_URL } from "./src/api/config";
import { COLORS, FONTS } from "./src/theme";

// בונה URI מלא לתמונה (השרת עשוי להחזיר נתיב יחסי)
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

// פורמט תאריך פשוט: DD/MM/YYYY
function formatDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function BlockedUsersScreen() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // מזהה ה-user שכרגע מבצעים עליו unblock - כדי להציג spinner על השורה הספציפית.
  const [unblockingId, setUnblockingId] = useState(null);

  // טעינה בכל כניסה למסך - useFocusEffect מרענן גם אחרי חזרה ממסך אחר.
  useFocusEffect(
    useCallback(() => {
      loadBlocked();
    }, []),
  );

  const loadBlocked = async () => {
    setLoading(true);
    const data = await getBlockedUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleUnblock = (user) => {
    const name = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const displayName = name || `משתמש #${user.blockedUserID}`;

    Alert.alert(
      "ביטול חסימה",
      `לבטל את החסימה של ${displayName}?`,
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "בטל חסימה",
          onPress: () => performUnblock(user.blockedUserID),
        },
      ],
      { cancelable: true },
    );
  };

  const performUnblock = async (blockedUserId) => {
    setUnblockingId(blockedUserId);
    try {
      await unblockUser(blockedUserId);
      // הסרה אופטימית מהרשימה - בלי לחכות לקריאה נוספת לשרת.
      setUsers((prev) => prev.filter((u) => u.blockedUserID !== blockedUserId));
    } catch (err) {
      Alert.alert("שגיאה", err.message || "ביטול החסימה נכשל");
    } finally {
      setUnblockingId(null);
    }
  };

  // רנדור שורה של משתמש חסום.
  const renderUser = (user) => {
    const name = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const imageUri = buildImageUri(user.profileImage);
    const isUnblocking = unblockingId === user.blockedUserID;

    return (
      <View key={user.blockID} style={styles.card}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={24} color={COLORS.onBrand} />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name}>
            {name || `משתמש #${user.blockedUserID}`}
          </Text>
          <Text style={styles.date}>נחסם ב-{formatDate(user.blockedAt)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.unblockBtn, isUnblocking && { opacity: 0.6 }]}
          onPress={() => handleUnblock(user)}
          disabled={isUnblocking}
          activeOpacity={0.85}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={COLORS.brand} />
          ) : (
            <Text style={styles.unblockText}>בטל חסימה</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.header}>משתמשים חסומים</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : users.length === 0 ? (
        // מצב ריק - אייקון + הסבר ידידותי.
        <View style={styles.centerBox}>
          <Ionicons name="shield-checkmark-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>אין משתמשים חסומים</Text>
          <Text style={styles.emptyText}>
            כשתחסום משתמש, הוא יופיע כאן ויהיה אפשר לבטל את החסימה בכל רגע.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subTitle}>
            המשתמשים האלה לא יוכלו לראות את הפרופיל שלך או ליצור איתך קשר.
          </Text>
          {users.map(renderUser)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

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

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  subTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: "right",
    marginBottom: 14,
    lineHeight: 20,
  },

  // ====== מצב ריק / טעינה ======
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    marginTop: 14,
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },

  // ====== כרטיס משתמש ======
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.divider,
    marginLeft: 12,
  },

  avatarFallback: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  info: {
    flex: 1,
    alignItems: "flex-end",
  },

  name: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  date: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    marginTop: 3,
  },

  unblockBtn: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 84,
    alignItems: "center",
  },

  unblockText: {
    color: COLORS.brand,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
});

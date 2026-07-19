import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ShieldCheck } from "lucide-react-native";

import { getBlockedUsers, unblockUser } from "./src/api/blockService";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";

// פורמט תאריך פשוט: DD/MM/YYYY
function formatDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// BlockedRow — שורת משתמש חסום (מקומית): אווטר + שם/תאריך + כפתור ביטול-חסימה.
// ListRow לא מתאים (דורש אווטר במקום עיגול-אייקון + פעולת trailing מותאמת).
function BlockedRow({ user, unblocking, onUnblock }) {
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    `משתמש #${user.blockedUserID}`;

  return (
    <View style={styles.row}>
      <Avatar uri={user.profileImage} name={name} size="md" />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.date}>נחסם ב-{formatDate(user.blockedAt)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.unblockBtn, unblocking && styles.unblockOff]}
        onPress={onUnblock}
        disabled={unblocking}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`ביטול חסימה של ${name}`}
      >
        {unblocking ? (
          <ActivityIndicator size="small" color={COLORS.brand} />
        ) : (
          <Text style={styles.unblockText}>ביטול חסימה</Text>
        )}
      </TouchableOpacity>
    </View>
  );
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
          text: "אישור",
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

      // עקביות חסימה: מסלול "חסימה מפרופיל" מוסיף את המשתמש ל-dismissed_matches
      // המקומי (הסתרה מיידית מההתאמות). בלי הניקוי כאן, משתמש שבוטלה חסימתו
      // יישאר מוסתר מההתאמות במכשיר הזה לצמיתות. best-effort — כשל כאן לא
      // מפריע לביטול החסימה עצמו (שכבר הצליח בשרת).
      try {
        const raw = await AsyncStorage.getItem("dismissed_matches");
        if (raw) {
          const ids = JSON.parse(raw);
          if (Array.isArray(ids)) {
            const next = ids.filter((id) => String(id) !== String(blockedUserId));
            if (next.length !== ids.length) {
              await AsyncStorage.setItem("dismissed_matches", JSON.stringify(next));
            }
          }
        }
      } catch {}
    } catch (err) {
      Alert.alert("שגיאה", err.message || "ביטול החסימה נכשל");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="משתמשים חסומים" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centerBox}>
          <EmptyState
            Icon={ShieldCheck}
            title="אין משתמשים חסומים"
            subtitle="כשתחסום משתמש, הוא יופיע כאן ויהיה אפשר לבטל את החסימה בכל רגע."
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subTitle}>
            המשתמשים האלה לא יוכלו לראות את הפרופיל שלך או ליצור איתך קשר.
          </Text>
          {users.map((u) => (
            <BlockedRow
              key={u.blockID}
              user={u}
              unblocking={unblockingId === u.blockedUserID}
              onUnblock={() => handleUnblock(u)}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  subTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },

  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── שורת משתמש חסום ──
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  info: { flex: 1, alignItems: "flex-end" },
  name: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.semibold,
    color: COLORS.text,
    textAlign: "right",
  },
  date: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  unblockBtn: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    minWidth: 84,
    alignItems: "center",
  },
  unblockOff: { opacity: 0.6 },
  unblockText: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },
});

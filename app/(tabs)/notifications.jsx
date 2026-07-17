import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Bell, Check, MessageCircle, Send, UserPlus, X } from "lucide-react-native";

import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import {
  getNotifications,
  markNotificationRead,
} from "../src/api/notificationService";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import EmptyState from "../../components/ui/EmptyState";
import ListRow from "../../components/ui/ListRow";
import BottomNav from "../../components/BottomNav";

// אייקון + גוון סמנטי לפי סוג ההתראה (lucide בלבד, צבעי סטטוס מהשפה).
function typeIcon(type) {
  switch (type) {
    case "RequestReceived":
      return { Icon: UserPlus, color: COLORS.brand, bg: COLORS.brandLight };
    case "RequestApproved":
      return { Icon: Check, color: COLORS.success, bg: COLORS.successLight };
    case "RequestRejected":
      return { Icon: X, color: COLORS.danger, bg: COLORS.dangerLight };
    case "NewMessage":
      return { Icon: MessageCircle, color: COLORS.brand, bg: COLORS.brandLight };
    default:
      return { Icon: Bell, color: COLORS.textMuted, bg: COLORS.divider };
  }
}

// NotificationRow — שורת התראה native-style (מקומית למסך זה, לא ListRow):
// עיגול-אייקון בגוון-הסוג + כותרת/גוף, unread = כותרת מודגשת + נקודת brand עדינה.
function NotificationRow({ notif, onPress }) {
  const ic = typeIcon(notif.type);
  const Icon = ic.Icon;
  const unread = !notif.isRead;

  return (
    <TouchableOpacity
      style={styles.notifRow}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notif.title}
    >
      <View style={[styles.notifIcon, { backgroundColor: ic.bg }]}>
        <Icon size={20} color={ic.color} strokeWidth={2} />
      </View>

      <View style={styles.notifText}>
        <Text
          style={[styles.notifTitle, unread && styles.notifTitleUnread]}
          numberOfLines={1}
        >
          {notif.title}
        </Text>
        {notif.body ? (
          <Text style={styles.notifBody} numberOfLines={2}>
            {notif.body}
          </Text>
        ) : null}
      </View>

      {unread ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);

  // קישורים מהירים בראש המסך — שורות ניווט (ListRow).
  const links = [
    { title: "סטטוס בקשות ששלחתי", Icon: Send, route: "/requestStatus" },
    { title: "צ'אטים פעילים", Icon: MessageCircle, route: "/activeChats" },
  ];

  // טעינה בכל כניסה למסך - useFocusEffect מרענן כשחוזרים אליו
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    const userId = getUser()?.userID;
    if (!userId) return;
    const data = await getNotifications(userId);
    setNotifications(data);
  };

  const handleTap = async (notif) => {
    if (!notif.isRead) {
      await markNotificationRead(notif.notificationID);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationID === notif.notificationID ? { ...n, isRead: true } : n,
        ),
      );
    }
    // ניווט לפי סוג
    if (notif.type === "RequestReceived") router.push("/matchesForYou");
    else if (notif.type === "RequestApproved") router.push("/activeChats");
    else if (notif.type === "RequestRejected") router.push("/requestStatus");
    else if (notif.type === "NewMessage" && notif.relatedID != null)
      router.push(`/chat/${notif.relatedID}`);
  };

  return (
    <Screen>
      <ScreenHeader title="התראות" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* קישורים מהירים */}
        <View style={styles.links}>
          {links.map((item) => (
            <ListRow
              key={item.route}
              Icon={item.Icon}
              title={item.title}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>

        <SectionLabel
          title="ההתראות שלי"
          count={notifications.length}
          style={styles.sectionLabel}
        />

        {notifications.length === 0 ? (
          <EmptyState
            Icon={Bell}
            title="אין התראות עדיין"
            subtitle="עדכונים על בקשות, אישורים והודעות בצ'אט יופיעו כאן."
            style={styles.empty}
          />
        ) : (
          notifications.map((n, i) => (
            <View key={n.notificationID}>
              <NotificationRow notif={n} onPress={() => handleTap(n)} />
              {i < notifications.length - 1 ? (
                <View style={styles.separator} />
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <BottomNav active="notifications" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: SPACING.md, paddingBottom: SPACING.xxl },

  links: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },

  sectionLabel: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },

  empty: { marginTop: SPACING.xxl },

  // ── שורת התראה (רשימה שטוחה native-style) ──
  notifRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  notifText: { flex: 1, alignItems: "flex-end", gap: SPACING.xs / 2 },
  notifTitle: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.semibold,
    color: COLORS.text,
    textAlign: "right",
  },
  notifTitleUnread: { fontFamily: FONTS.bold },
  notifBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
  // חיווי unread עדין ועקבי — נקודת brand (לא ענבר).
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brand,
  },
  // מפריד עדין, מוזח אל מעבר לעיגול-האייקון (native list).
  separator: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginRight: SPACING.xl + 40 + SPACING.md,
  },
});

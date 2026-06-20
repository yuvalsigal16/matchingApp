import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONTS } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import {
  getNotifications,
  markNotificationRead,
} from "../src/api/notificationService";
import BottomNav from "../../components/BottomNav";

// אייקון לפי סוג ההתראה
function iconForType(type) {
  if (type === "RequestReceived") return { name: "person-add-outline", color: COLORS.brand };
  if (type === "RequestApproved") return { name: "checkmark-circle-outline", color: COLORS.success };
  if (type === "RequestRejected") return { name: "close-circle-outline", color: COLORS.danger };
  return { name: "notifications-outline", color: COLORS.textMuted };
}

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);

  // קישורים מהירים בראש המסך
  const links = [
    { title: "סטטוס בקשות ששלחתי", icon: "send-outline", route: "/requestStatus" },
    { title: "צ'אטים פעילים", icon: "chatbubbles-outline", route: "/activeChats" },
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
  };

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
        <Text style={styles.header}>התראות ופעולות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* קישורים מהירים */}
        {links.map((item, index) => (
          <TouchableOpacity
            key={`link-${index}`}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(item.route)}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.brand} />
            <Text style={styles.cardText}>{item.title}</Text>
            <View style={styles.iconBox}>
              <Ionicons name={item.icon} size={22} color={COLORS.brand} />
            </View>
          </TouchableOpacity>
        ))}

        {/* כותרת ההתראות */}
        <Text style={styles.sectionTitle}>ההתראות שלי</Text>

        {notifications.length === 0 ? (
          <Text style={styles.emptyText}>אין התראות חדשות</Text>
        ) : (
          notifications.map((n) => {
            const ic = iconForType(n.type);
            return (
              <TouchableOpacity
                key={n.notificationID}
                style={[styles.notifCard, !n.isRead && styles.notifUnread]}
                activeOpacity={0.85}
                onPress={() => handleTap(n)}
              >
                <Ionicons name={ic.name} size={26} color={ic.color} />
                <View style={styles.notifText}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  {!!n.body && <Text style={styles.notifBody}>{n.body}</Text>}
                </View>
                {!n.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="notifications" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

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

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  cardText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginHorizontal: 12,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginTop: 18,
    marginBottom: 10,
  },

  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    marginTop: 20,
  },

  notifCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },

  notifUnread: {
    backgroundColor: COLORS.brandLight,
  },

  notifText: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "flex-end",
  },

  notifTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
  },

  notifBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginTop: 3,
    textAlign: "right",
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.amber,
  },
});

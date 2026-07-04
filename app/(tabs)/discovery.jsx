import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONTS } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import BottomNav from "../../components/BottomNav";

export default function DiscoveryScreen() {
  const router = useRouter();
  const user = getUser();
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();

  const items = [
    {
      title: "יצירת קהילה / הצטרפות",
      sub: "לפי תחומי עניין",
      icon: "people",
      iconBg: COLORS.primaryLight,
      iconColor: COLORS.primary,
      route: "/community",
    },
    {
      title: "המלצות של אחרים",
      sub: "על מקומות ואטרקציות",
      icon: "star",
      iconBg: COLORS.coralLight,
      iconColor: COLORS.coral,
      route: "/recommendations",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
          >
            <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
          </TouchableOpacity>
          <Text style={styles.title}>גילוי וקהילה</Text>
          {initials ? (
            <View style={styles.initialsBox}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        <Text style={styles.subtitle}>התחבר/י לאנשים עם אהבה לטיולים</Text>

        {/* כרטיסים */}
        <View style={styles.list}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(item.route)}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.sub}</Text>
              </View>
              <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={24} color={item.iconColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <BottomNav active="discovery" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  inner: { flex: 1 },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  initialsBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },

  initialsText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
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
    marginBottom: 20,
  },

  list: {
    paddingHorizontal: 20,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  cardText: {
    flex: 1,
    alignItems: "flex-end",
    paddingHorizontal: 14,
  },

  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 4,
  },

  cardSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "right",
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});

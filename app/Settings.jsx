import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONTS } from "./src/theme";

// מסך הגדרות חשבון. מציג רשימת אפשרויות שכל אחת מנווטת למסך משלה.
// כרגע רק "שינוי סיסמה" פעיל - שאר ההגדרות יתווספו בעתיד.
export default function SettingsScreen() {
  const router = useRouter();

  const items = [
    {
      title: "שינוי סיסמה",
      icon: "lock-closed-outline",
      route: "/ChangePassword",
    },
    {
      title: "משתמשים חסומים",
      icon: "ban-outline",
      route: "/BlockedUsers",
    },
    {
      title: "תנאי שימוש",
      icon: "document-text-outline",
      route: "/TermsOfService",
    },
    {
      title: "מדיניות פרטיות",
      icon: "shield-checkmark-outline",
      route: "/PrivacyPolicy",
    },
    {
      title: "אודות האפליקציה",
      icon: "information-circle-outline",
      route: "/About",
    },
    {
      title: "מחיקת חשבון",
      icon: "trash-outline",
      route: "/DeleteAccount",
      danger: true,
    },
  ];

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
        <Text style={styles.header}>הגדרות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(item.route)}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
            <Text
              style={[styles.cardText, item.danger && styles.cardTextDanger]}
            >
              {item.title}
            </Text>
            <View style={[styles.iconBox, item.danger && styles.iconBoxDanger]}>
              <Ionicons
                name={item.icon}
                size={22}
                color={item.danger ? COLORS.danger : COLORS.brand}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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

  // וריאציות לפריט "מסוכן" (מחיקת חשבון) - אדום כדי שיתבלט.
  cardTextDanger: {
    color: COLORS.danger,
  },

  iconBoxDanger: {
    backgroundColor: COLORS.dangerLight,
  },
});

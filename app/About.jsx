import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FONTS } from "./src/theme/fonts";

// שליפת מספר גרסה אוטומטית מ-app.json. אם לא קיים - נציג "1.0.0".
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

// פרטי הצוות המפתח. ניתן לערוך כאן בקלות בעתיד.
const TEAM = [
  "ליאל רובינוב",
  "בר מיכאלי",
  "יובל סיגל",
  "טלי מקוביצקי",
];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>אודות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero - לוגו + שם + סלוגן */}
        <View style={styles.hero}>
          <Image
            source={require("../assets/images/onlyLogo-removebg-preview.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>צמד חמד</Text>
          <Text style={styles.tagline}>החצי השני שלך לטיול הבא</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>גרסה {APP_VERSION}</Text>
          </View>
        </View>

        {/* תיאור האפליקציה */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>על האפליקציה</Text>
          <Text style={styles.bodyText}>
            צמד חמד היא אפליקציה לחיבור בין אנשים המחפשים פרטנר לטיול הבא. האפליקציה
            מתאימה בין משתמשים על בסיס תחומי עניין משותפים, אורח חיים והעדפות אישיות,
            ומאפשרת תקשורת ישירה לתכנון הטיול יחד.
          </Text>
        </View>

        {/* צוות הפיתוח */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>צוות הפיתוח</Text>
          {TEAM.map((name, index) => (
            <View key={index} style={styles.teamRow}>
              <Ionicons name="person-circle-outline" size={20} color="#1A3C40" />
              <Text style={styles.teamName}>{name}</Text>
            </View>
          ))}
        </View>

        {/* פרטי הפרויקט */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>פרויקט גמר</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>מסלול</Text>
            <Text style={styles.metaValue}>מערכות מידע</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>שנה</Text>
            <Text style={styles.metaValue}>2026</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>טכנולוגיות</Text>
            <Text style={styles.metaValue}>
              React Native, ASP.NET Core, SQL Server
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>© 2026 צמד חמד</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },

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
    color: "#1A3C40",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ====== Hero ======
  hero: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 18,
  },

  logo: {
    width: 110,
    height: 110,
    marginBottom: 8,
  },

  appName: {
    fontSize: 28,
    fontFamily: FONTS.extraBold,
    color: "#1A3C40",
    marginTop: 4,
  },

  tagline: {
    fontSize: 14,
    color: "#6E6E6E",
    fontFamily: FONTS.regular,
    marginTop: 6,
  },

  versionBadge: {
    marginTop: 12,
    backgroundColor: "#E7F3FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },

  versionText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  // ====== Cards ======
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },

  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
    marginBottom: 10,
  },

  bodyText: {
    fontSize: 14,
    color: "#444",
    fontFamily: FONTS.regular,
    textAlign: "right",
    lineHeight: 22,
  },

  // ====== Team ======
  teamRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },

  teamName: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#1A3C40",
  },

  // ====== Project meta ======
  metaRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  metaLabel: {
    fontSize: 13,
    color: "#888",
    fontFamily: FONTS.regular,
  },

  metaValue: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    maxWidth: "70%",
    textAlign: "left",
  },

  // ====== Footer ======
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#888",
    fontFamily: FONTS.regular,
    marginTop: 8,
  },
});

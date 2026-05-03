import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BASE_URL } from "../src/api/config";
import { getToken } from "../src/auth/authStore";
import { FONTS } from "../src/theme/fonts";
import BottomNav from "../../components/BottomNav";

// מסך הקהילות - מציג את כל הקהילות הקיימות במערכת
export default function CommunityScreen() {
  const router = useRouter();

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  // טעינת הקהילות מהשרת בעת כניסה למסך
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

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header עם חץ חזרה */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>קהילות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {communities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={40} color="#aaa" />
            <Text style={styles.emptyText}>אין קהילות עדיין</Text>
          </View>
        ) : (
          communities.map((c) => (
            <TouchableOpacity
              key={c.communityID}
              style={styles.card}
              activeOpacity={0.85}
              // לחיצה תיקח לפרטי הקהילה (ייווצר בעתיד)
              onPress={() => console.log("Open community:", c.communityID)}
            >
              {/* אייקון */}
              <View style={styles.iconBox}>
                <Ionicons name="people" size={22} color="#1A3C40" />
              </View>

              {/* פרטים */}
              <View style={styles.cardText}>
                <Text style={styles.title}>{c.communityName}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {c.description || "אין תיאור"}
                </Text>
                <Text style={styles.members}>
                  {c.membersCount || 0} חברים
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* כפתור צף ליצירת קהילה חדשה */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => console.log("Create new community")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <BottomNav active="discovery" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F0E8",
  },

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
    paddingBottom: 100,
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0D5E8",
    justifyContent: "center",
    alignItems: "center",
  },

  cardText: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#666",
    marginTop: 2,
    textAlign: "right",
  },

  members: {
    fontSize: 12,
    color: "#999",
    fontFamily: FONTS.regular,
    marginTop: 4,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
    fontFamily: FONTS.regular,
  },

  fab: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: "#1A3C40",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});

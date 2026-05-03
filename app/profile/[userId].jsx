import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";
import { FONTS } from "../../src/theme/fonts";

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // חישוב גיל
  const calcAge = (birthDate) => {
    if (!birthDate) return "";
    const d = new Date(birthDate);
    const diff = Date.now() - d.getTime();
    const age = new Date(diff).getUTCFullYear() - 1970;
    return age;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = getToken();

        const res = await fetch(`${BASE_URL}/Users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.log("profile error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>לא נמצא משתמש</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* שם */}
        <Text style={styles.name}>
          {user.firstName} {user.lastName}
        </Text>

        {/* גיל + מגדר */}
        <Text style={styles.info}>
          גיל: {calcAge(user.birthDate)} | מגדר: {user.gender}
        </Text>

        {/* עיר */}
        <Text style={styles.info}>
          עיר: {user.city}
        </Text>

        {/* אורח חיים */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>אורח חיים</Text>

          <Text style={styles.item}>
            🚬 מעשן: {user.isSmoker ? "כן" : "לא"}
          </Text>

          <Text style={styles.item}>
            🌙 שומר שבת: {user.keepsShabbat ? "כן" : "לא"}
          </Text>

          <Text style={styles.item}>
            🍽️ שומר כשרות: {user.keepsKosher ? "כן" : "לא"}
          </Text>
        </View>

        {/* תחומי עניין */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>תחומי עניין</Text>

          {user.interests?.length > 0 ? (
            user.interests.map((i, idx) => (
              <Text key={idx} style={styles.item}>
                • {i}
              </Text>
            ))
          ) : (
            <Text style={styles.item}>אין תחומי עניין</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
  },

  content: {
    padding: 20,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  name: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 6,
    color: "#1A3C40",
  },

  info: {
    fontSize: 15,
    textAlign: "center",
    color: "#555",
    marginBottom: 4,
  },

  section: {
    marginTop: 25,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginBottom: 10,
    color: "#1A3C40",
  },

  item: {
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
    textAlign: "right",
  },
});
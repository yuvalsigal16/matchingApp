import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, MapPin, Plane } from "lucide-react-native";
import { BASE_URL } from "../src/api/config";
import { getToken } from "../src/auth/authStore";
import { FONTS } from "../src/theme/fonts";

const GENDER_DB_TO_HE = { Male: "זכר", Female: "נקבה", Other: "אחר" };

const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return new Date(diff).getUTCFullYear() - 1970;
};

const formatDate = (d) => {
  if (!d) return "";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()}`;
};

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [userRes, tripsRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/Users/${userId}`, { headers }),
          fetch(`${BASE_URL}/Trip/user/${userId}`, { headers }),
        ]);

        if (userRes.status === "fulfilled" && userRes.value.ok) {
          setUser(await userRes.value.json());
        }
        if (tripsRes.status === "fulfilled" && tripsRes.value.ok) {
          const all = await tripsRes.value.json();
          setTrips((all || []).filter((t) => t.status === "Active" || t.Status === "Active"));
        }
      } catch (err) {
        console.log("profile error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
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
        <Text style={styles.notFound}>לא נמצא משתמש</Text>
      </SafeAreaView>
    );
  }

  const age = calcAge(user.birthDate);
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  const lifestyleTags = [
    user.isSmoker != null && { label: user.isSmoker ? "מעשן/ת" : "לא מעשן/ת", icon: user.isSmoker ? "🚬" : "🚭" },
    user.keepsKosher != null && { label: user.keepsKosher ? "שומר/ת כשרות" : "לא שומר/ת כשרות", icon: "🍽️" },
    user.keepsShabbat != null && { label: user.keepsShabbat ? "שומר/ת שבת" : "לא שומר/ת שבת", icon: "🕍" },
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      {/* כפתור חזרה */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ChevronRight size={22} color="#1A3C40" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── אזור הפרופיל העליון ── */}
        <View style={styles.heroSection}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}

          <Text style={styles.name}>{user.firstName} {user.lastName}</Text>

          {(age || user.gender) ? (
            <Text style={styles.ageLine}>
              {age ? `בן/בת ${age}` : ""}
              {age && user.gender ? " · " : ""}
              {GENDER_DB_TO_HE[user.gender] || ""}
            </Text>
          ) : null}

          {user.city ? (
            <View style={styles.cityRow}>
              <MapPin size={14} color="#7A8B8E" />
              <Text style={styles.cityText}>{user.city}</Text>
            </View>
          ) : null}
        </View>

        {/* ── טיולים פעילים ── */}
        {trips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Plane size={17} color="#1A3C40" />
              <Text style={styles.sectionTitle}>טיולים מתוכננים</Text>
            </View>
            {trips.map((t, i) => (
              <View key={i} style={styles.tripCard}>
                <Text style={styles.tripDest}>{t.destination ?? t.Destination}</Text>
                {(t.startDate || t.endDate) && (
                  <Text style={styles.tripDates}>
                    {formatDate(t.startDate)}
                    {t.endDate ? ` – ${formatDate(t.endDate)}` : " · כרטיס לכיוון אחד"}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── אורח חיים ── */}
        {lifestyleTags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>אורח חיים</Text>
            <View style={styles.tagsRow}>
              {lifestyleTags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.icon} {tag.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── תחומי עניין ── */}
        {user.interests?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>תחומי עניין</Text>
            <View style={styles.tagsRow}>
              {user.interests.map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFound: { fontSize: 16, color: "#888", fontFamily: FONTS.regular },

  backBtn: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  content: { paddingBottom: 40 },

  heroSection: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    marginBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: "#E8F0F0",
  },

  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1A3C40",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  avatarInitials: {
    fontSize: 34,
    fontFamily: FONTS.bold,
    color: "#fff",
  },

  name: {
    fontSize: 22,
    fontFamily: FONTS.extraBold || FONTS.bold,
    color: "#1A1A1A",
    marginBottom: 4,
  },

  ageLine: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#666",
    marginBottom: 6,
  },

  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  cityText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#7A8B8E",
  },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
    marginBottom: 12,
  },

  tripCard: {
    backgroundColor: "#F0F8F8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: "#1A3C40",
    alignItems: "flex-end",
  },

  tripDest: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
  },

  tripDates: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#7A8B8E",
    marginTop: 3,
    textAlign: "right",
  },

  tagsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  tag: {
    backgroundColor: "#EEF6F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  tagText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#1A3C40",
  },

  interestTag: {
    backgroundColor: "#F3EFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  interestText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#7C3AED",
  },
});

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChevronLeft, Settings, FileText, Heart } from "lucide-react-native";

import { FONTS } from "../theme/fonts";
import { getToken, getUser } from "../auth/authStore";
import { BASE_URL } from "../api/config";
import BottomNav from "../Components/BottomNav";


// 👇 אותו helper כמו במסך הבית
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

export default function ProfileScreen() {
  const cachedUser = getUser();

  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: cachedUser?.email || "",
    profileImage: "",
  });

  const [stats, setStats] = useState({
    matches: 0,
    trips: 0,
    friends: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = getToken();
        const userId = getUser()?.userID;

        if (!token || !userId) return;

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [profileRes, imageRes, matchesRes, tripsRes] =
          await Promise.all([
            fetch(`${BASE_URL}/UserProfile/${userId}`, { headers }),
            fetch(`${BASE_URL}/UserProfile/image/${userId}`, { headers }),
            fetch(`${BASE_URL}/Matches/user/${userId}`, { headers }),
            fetch(`${BASE_URL}/Trips/user/${userId}`, { headers }),
          ]);

        let firstName = "";
        let lastName = "";
        let profileImage = "";

        if (profileRes.ok) {
          const data = await profileRes.json();
          firstName = data.firstName || data.FirstName || "";
          lastName = data.lastName || data.LastName || "";
          profileImage = data.profileImage || data.ProfileImage || "";
        }

        if (imageRes.ok) {
          const img = await imageRes.json();
          if (img?.imagePath) profileImage = img.imagePath;
        }

        let matches = 0;
        let trips = 0;

        if (matchesRes.ok) {
          const m = await matchesRes.json();
          matches = m.length || 0;
        }

        if (tripsRes.ok) {
          const t = await tripsRes.json();
          trips = t.length || 0;
        }

        setUserData({
          firstName,
          lastName,
          email: cachedUser?.email || "",
          profileImage,
        });

        setStats({
          matches,
          trips,
          friends: matches, // בינתיים
        });
      } catch (e) {
        console.error("Profile load error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const imageUri = buildImageUri(userData.profileImage);

  const renderAvatar = () => {
    if (loading) {
      return (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <ActivityIndicator color="#fff" />
        </View>
      );
    }

    if (imageUri) {
      return <Image source={{ uri: imageUri }} style={styles.avatar} />;
    }

    return (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Ionicons name="person" size={40} color="#fff" />
      </View>
    );
  };

  const MENU = [
    {
      title: "הגדרות",
      Icon: Settings,
    },
    {
      title: "עדכון שאלון היכרות",
      Icon: FileText,
    },
    {
      title: "העדפות טיול",
      Icon: Heart,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity>
            <Ionicons name="arrow-forward" size={24} />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {renderAvatar()}

          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Name + Email */}
        <Text style={styles.name}>
          {userData.firstName} {userData.lastName}
        </Text>
        <Text style={styles.email}>{userData.email}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.friends}</Text>
            <Text style={styles.statLabel}>חברים</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.matches}</Text>
            <Text style={styles.statLabel}>התאמות</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.trips}</Text>
            <Text style={styles.statLabel}>טיולים</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuList}>
          {MENU.map((item, index) => {
            const Icon = item.Icon;
            return (
              <TouchableOpacity key={index} style={styles.menuItem}>
                <ChevronLeft size={20} color="#999" />
                <Text style={styles.menuText}>{item.title}</Text>
                <View style={styles.menuIcon}>
                  <Icon size={20} color="#1A3C40" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

     <BottomNav navigation={navigation} active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  content: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 60,
  },

  avatarFallback: {
    backgroundColor: "#E5B7B0",
    justifyContent: "center",
    alignItems: "center",
  },

  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 120,
    backgroundColor: "#000",
    borderRadius: 20,
    padding: 6,
  },

  name: {
    textAlign: "center",
    fontSize: 22,
    fontFamily: FONTS?.bold,
  },

  email: {
    textAlign: "center",
    color: "#888",
    marginBottom: 20,
  },

  statsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 5,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
  },

  statLabel: {
    fontSize: 12,
    color: "#777",
  },

  menuList: {
    marginTop: 10,
  },

  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },

  menuText: {
    flex: 1,
    textAlign: "right",
    fontFamily: FONTS?.medium,
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
});
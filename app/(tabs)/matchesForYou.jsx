import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { getUser } from "../../auth/authStore";

import { getAllUsers } from "../../api/userService";

import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../components/BottomNav";
import { FONTS } from "../../theme/fonts";

export default function MatchesScreen() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);

  const [users, setUsers] = useState([]);

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  // =========================
  // LOAD USERS FROM DB
  // =========================

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // המשתמש המחובר
      const loggedInUser = getUser();

      setCurrentUser(loggedInUser);

      // כל המשתמשים מהשרת
      const allUsers = await getAllUsers();

      // לא להציג את המשתמש עצמו
      const filteredUsers = allUsers.filter(
        (u) => u.userID !== loggedInUser.userID,
      );

      setUsers(filteredUsers);
    } catch (err) {
      console.log("Failed loading users:", err);
    } finally {
      setLoading(false);
    }
  };
  // =========================================
  // 🧠 SMART MATCHING ALGORITHM
  // =========================================

  const smartMatches = useMemo(() => {
    if (!currentUser || users.length === 0) {
      return [];
    }

    return users
      .map((user) => {
        let score = 0;

        // =========================
        // גיל
        // =========================

        if (user.age && currentUser.age) {
          const ageDiff = Math.abs(user.age - currentUser.age);

          if (ageDiff <= 2) score += 20;
          else if (ageDiff <= 5) score += 10;
        }

        // =========================
        // תחומי עניין
        // =========================

        const sharedInterests =
          user.interests?.filter((interest) =>
            currentUser.interests?.includes(interest),
          ) || [];

        score += sharedInterests.length * 15;

        // =========================
        // התאמה לפי שאלון העדפות
        // =========================

        if (user.preferredMinAge && user.preferredMaxAge && currentUser.age) {
          if (
            currentUser.age >= user.preferredMinAge &&
            currentUser.age <= user.preferredMaxAge
          ) {
            score += 20;
          }
        }

        // =========================
        // תחומי עניין רצויים
        // =========================

        const preferredShared =
          user.preferredInterests?.filter((interest) =>
            currentUser.interests?.includes(interest),
          ) || [];

        score += preferredShared.length * 20;

        // =========================
        // אלגוריתם התנהגותי
        // =========================

        if (user.viewedProfiles?.includes(currentUser.userID)) {
          score += 15;
        }

        if (user.likedProfiles?.includes(currentUser.userID)) {
          score += 30;
        }

        return {
          ...user,
          matchScore: score,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [users, currentUser]);

  // ✔ אישור בקשה
  const handleAccept = (id) => {
    setRequests((prev) => prev.filter((item) => item.id !== id));

    console.log("accepted:", id);
  };

  // ✖ דחייה
  const handleReject = (id) => {
    setRequests((prev) => prev.filter((item) => item.id !== id));

    console.log("rejected:", id);
  };

  //שמירת הציפייה בטבלת ההיסטוריה ומעבר לעמוד הצפייה בפרופיל
  const openProfile = async (user) => {
    await saveProfileView(currentUser.userID, user.userID);

    router.push({
      pathname: "/MatchProfileDetails",
      params: {
        user: JSON.stringify(user),
      },
    });
  };

  if (loading || !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text>טוען התאמות...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>התאמות עבורך</Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* בקשות */}
        <Text style={styles.sectionTitle}>בקשות לשיחה</Text>

        {requests.length === 0 ? (
          <Text style={styles.placeholder}>אין בקשות חדשות</Text>
        ) : (
          requests.map((item) => (
            <View key={item.id} style={styles.requestCard}>
              <Image source={{ uri: item.image }} style={styles.avatar} />

              <TouchableOpacity
                onPress={() => openProfile(item)}
                style={{ flex: 1 }}
              >
                <Text style={styles.name}>{item.name}</Text>

                <Text style={styles.age}>גיל {item.age}</Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleAccept(item.id)}>
                  <Ionicons name="checkmark-circle" size={28} color="green" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleReject(item.id)}>
                  <Ionicons name="close-circle" size={28} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* התאמות חכמות */}
        <Text style={styles.sectionTitle}>התאמות חכמות עבורך</Text>

        {smartMatches.map((user) => (
          <TouchableOpacity
            key={user.UserID}
            style={styles.matchCard}
            onPress={() => openProfile(user)}
          >
            <Image
              source={
                user.ProfileImage
                  ? { uri: user.ProfileImage }
                  : require("../../assets/default-avatar.png")
              }
              style={styles.matchAvatar}
            />

            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>{user.name}</Text>

              <Text style={styles.matchDetails}>גיל {user.age}</Text>

              <Text style={styles.matchDetails}>
                {user.interests?.slice(0, 3).join(" • ") || "אין תחומי עניין"}
              </Text>
            </View>

            {/* ציון התאמה */}
            <View style={styles.scoreContainer}>
              <Ionicons name="sparkles" size={18} color="#D4AF37" />

              <Text style={styles.scoreText}>
                {user.matchScore || user.similarityScore}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <BottomNav active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    marginTop: 18,
    marginBottom: 10,
    textAlign: "right",
    color: "#1A3C40",
  },

  requestCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#D9D9D9",
    marginLeft: 10,
  },

  name: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    textAlign: "right",
    color: "#1A3C40",
  },

  age: {
    fontSize: 13,
    color: "#666",
    textAlign: "right",
    marginTop: 2,
    fontFamily: FONTS.regular,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  placeholder: {
    color: "#888",
    textAlign: "center",
    marginTop: 10,
    fontFamily: FONTS.regular,
  },

  // =========================
  // SMART MATCHES
  // =========================

  matchCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  matchAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#D9D9D9",
    marginLeft: 12,
  },

  matchInfo: {
    flex: 1,
    alignItems: "flex-end",
  },

  matchName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  matchDetails: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
    fontFamily: FONTS.regular,
    textAlign: "right",
  },

  scoreContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF6D6",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 60,
  },

  scoreText: {
    marginTop: 2,
    fontSize: 14,
    color: "#B8860B",
    fontFamily: FONTS.bold,
  },
});

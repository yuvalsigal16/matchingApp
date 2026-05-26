import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

  // 👤 המשתמש הנוכחי
  const currentUser = {
    id: "100",
    name: "Bar",
    age: 24,
    interests: ["music", "travel", "books", "coffee"],
    personality: ["calm", "social"],
    lifeTags: ["student", "family"],
  };

  // 🔹 משתמשים באפליקציה
  const users = [
    {
      id: "1",
      name: "דניאל כהן",
      age: 27,
      image: null,
      interests: ["music", "travel", "sports"],
      personality: ["social", "funny"],
      lifeTags: ["student"],
      likedUsers: ["5", "6"],
    },

    {
      id: "2",
      name: "נועה לוי",
      age: 24,
      image: null,
      interests: ["books", "coffee", "music"],
      personality: ["calm", "social"],
      lifeTags: ["family"],
      likedUsers: ["3", "5"],
    },

    {
      id: "3",
      name: "רוני אברהם",
      age: 25,
      image: null,
      interests: ["travel", "music", "art"],
      personality: ["calm"],
      lifeTags: ["student"],
      likedUsers: [],
    },

    {
      id: "4",
      name: "שירה דוד",
      age: 23,
      image: null,
      interests: ["sports", "nature"],
      personality: ["active"],
      lifeTags: ["army"],
      likedUsers: [],
    },

    {
      id: "5",
      name: "עמית לוי",
      age: 26,
      image: null,
      interests: ["coffee", "books", "music"],
      personality: ["social"],
      lifeTags: ["family"],
      likedUsers: [],
    },

    {
      id: "6",
      name: "יובל ישראלי",
      age: 24,
      image: null,
      interests: ["music", "travel", "movies"],
      personality: ["funny", "social"],
      lifeTags: ["student"],
      likedUsers: [],
    },
  ];

  // 🔹 בקשות צ'אט
  const [requests, setRequests] = useState([
    {
      id: "1",
      name: "דניאל כהן",
      age: 27,
      image: null,
    },

    {
      id: "2",
      name: "נועה לוי",
      age: 24,
      image: null,
    },
  ]);

  // =========================================
  // 🧠 SMART MATCHING ALGORITHM
  // =========================================

  // חישוב דמיון בין שני משתמשים
  const calculateSimilarity = (userA, userB) => {
    let score = 0;

    // גיל
    const ageDifference = Math.abs(userA.age - userB.age);

    if (ageDifference <= 2) score += 20;
    else if (ageDifference <= 5) score += 10;

    // תחומי עניין משותפים
    const sharedInterests = userA.interests.filter((interest) =>
      userB.interests.includes(interest),
    );

    score += sharedInterests.length * 15;

    // אישיות
    const sharedPersonality = userA.personality.filter((trait) =>
      userB.personality.includes(trait),
    );

    score += sharedPersonality.length * 20;

    // תגיות חיים
    const sharedTags = userA.lifeTags.filter((tag) =>
      userB.lifeTags.includes(tag),
    );

    score += sharedTags.length * 25;

    return score;
  };

  // יצירת התאמות חכמות
  const smartMatches = useMemo(() => {
    // שלב 1 - למצוא משתמשים דומים למשתמש הנוכחי
    const similarUsers = users
      .map((user) => ({
        ...user,
        similarityScore: calculateSimilarity(currentUser, user),
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore);

    // שלב 2 - למצוא פרופילים שמשתמשים דומים אהבו
    const recommendedIds = new Set();

    similarUsers.forEach((user) => {
      if (user.similarityScore >= 40) {
        user.likedUsers.forEach((likedId) => {
          recommendedIds.add(likedId);
        });
      }
    });

    // שלב 3 - ליצור רשימת התאמות
    const recommendations = users
      .filter(
        (user) => recommendedIds.has(user.id) && user.id !== currentUser.id,
      )
      .map((user) => ({
        ...user,
        matchScore: calculateSimilarity(currentUser, user),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    // fallback - אם אין מספיק המלצות
    if (recommendations.length === 0) {
      return similarUsers
        .filter((user) => user.id !== currentUser.id)
        .slice(0, 5);
    }

    return recommendations;
  }, []);

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

  const removeMatch = (userId) => {
  setSmartMatches((prev) =>
    prev.filter((u) => u.id !== userId)
  );
};

  // 👤 מעבר לפרופיל
  const openProfile = (user) => {
  router.push({
    pathname: "/MatchProfileDetails",
    params: {
      user: JSON.stringify(user),
    },
  });
};

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
    key={user.id}
    style={styles.matchCard}
    onPress={() => openProfile(user)}
  >
    <Image
      source={{ uri: user.image }}
      style={styles.matchAvatar}
    />

    <View style={styles.matchInfo}>
      <Text style={styles.matchName}>
        {user.name}
      </Text>

      <Text style={styles.matchDetails}>
        גיל {user.age}
      </Text>

      <Text style={styles.matchDetails}>
        {user.interests.slice(0, 3).join(" • ")}
      </Text>
    </View>

    {/* ציון התאמה */}
    <View style={styles.scoreContainer}>
      <Ionicons
        name="sparkles"
        size={18}
        color="#D4AF37"
      />

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

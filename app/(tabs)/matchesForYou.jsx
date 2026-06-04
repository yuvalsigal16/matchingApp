import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { BASE_URL } from "../src/api/config";
import { getUserInterests } from "../src/api/interestService";
import {
  approveRequest,
  getPendingRequests,
  rejectRequest,
} from "../src/api/notificationService";
import { getQuestionnaire } from "../src/api/questionnaireService";
import { getUserProfile } from "../src/api/userProfileService";
import { getAllUsers } from "../src/api/userService";
import { getUser } from "../src/auth/authStore";

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

// חישוב גיל מתאריך לידה (ISO string או Date)
function computeAge(birthDate) {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// בונה URI מלא לתמונה (השרת עשוי להחזיר נתיב יחסי)
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

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

  // ממיר אובייקט פרופיל+תחומים+שאלון לאובייקט אחיד שהאלגוריתם משתמש בו.
  // basicUser = מה ש-/User מחזיר (userID, email, profileImage בלבד).
  const buildEnrichedUser = (basicUser, profile, interests, quest) => ({
    ...basicUser,
    userID: basicUser.userID,
    name: [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim(),
    age: computeAge(profile?.birthDate),
    profileImage: profile?.profileImage ?? basicUser.profileImage ?? null,
    interests: (interests || []).map((i) => i?.interestName).filter(Boolean),
    isSmoker: quest?.isSmoker ?? null,
    keepsKosher: quest?.keepsKosher ?? null,
    keepsShabbat: quest?.keepsShabbat ?? null,
    spontaneityLevel: quest?.spontaneityLevel ?? null,
    lifestyleLevel: quest?.lifestyleLevel ?? null,
  });

  // מעשיר משתמש בודד ע"י 3 קריאות מקבילות לפרופיל/תחומים/שאלון.
  // הערה: בעתיד, כשה-controller יקרא ל-SP GetAllUsers, אפשר להוריד את זה
  // ולחזור ל-getAllUsers בלבד (האנדפוינט יחזיר הכל בקריאה אחת).
  const enrichUser = async (basicUser) => {
    const [p, i, q] = await Promise.allSettled([
      getUserProfile(basicUser.userID),
      getUserInterests(basicUser.userID),
      getQuestionnaire(basicUser.userID),
    ]);
    return buildEnrichedUser(
      basicUser,
      p.status === "fulfilled" ? p.value : null,
      i.status === "fulfilled" ? i.value || [] : [],
      q.status === "fulfilled" ? q.value : null,
    );
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      const loggedInUser = getUser();
      if (!loggedInUser?.userID) {
        console.warn("[MatchesScreen] אין משתמש מחובר");
        return;
      }
      const myId = loggedInUser.userID;

      // 1) טוענים במקביל: משתמשים, פרופיל שלי, תחומים, שאלון, בקשות ממתינות
      const [
        allUsersRes,
        myProfileRes,
        myInterestsRes,
        myQuestRes,
        pendingRes,
      ] = await Promise.allSettled([
        getAllUsers(),
        getUserProfile(myId),
        getUserInterests(myId),
        getQuestionnaire(myId),
        getPendingRequests(myId),
      ]);

      const basicUsers =
        allUsersRes.status === "fulfilled" ? allUsersRes.value || [] : [];

      const me = buildEnrichedUser(
        loggedInUser,
        myProfileRes.status === "fulfilled" ? myProfileRes.value : null,
        myInterestsRes.status === "fulfilled" ? myInterestsRes.value || [] : [],
        myQuestRes.status === "fulfilled" ? myQuestRes.value : null,
      );

      setCurrentUser(me);

      // 2) מסננים אותי, ומעשירים כל משתמש במקביל
      const others = basicUsers.filter((u) => u.userID !== myId);
      const enriched = await Promise.all(others.map(enrichUser));

      setUsers(enriched);

      // 3) בקשות נכנסות בלבד (אני הנמען)
      const allPending =
        pendingRes.status === "fulfilled" ? pendingRes.value || [] : [];
      const incoming = allPending.filter((r) => r.toUserID === myId);
      setRequests(incoming);
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

    return (
      users
        // מציגים רק משתמשים שיש להם פרופיל (שם) — לא מציגים רשומות חלקיות
        .filter((user) => user.name && user.name.trim().length > 0)
        .map((user) => {
          let score = 0;

          // גיל — קרבה בגילים
          if (user.age && currentUser.age) {
            const ageDiff = Math.abs(user.age - currentUser.age);
            if (ageDiff <= 2) score += 20;
            else if (ageDiff <= 5) score += 10;
          }

          // תחומי עניין משותפים (השוואה case-insensitive)
          const myInterests = (currentUser.interests || []).map((s) =>
            String(s).toLowerCase(),
          );
          const theirInterests = (user.interests || []).map((s) =>
            String(s).toLowerCase(),
          );
          const shared = theirInterests.filter((i) => myInterests.includes(i));
          score += shared.length * 15;

          // שאלון — התאמת אורח חיים
          if (
            user.isSmoker !== null &&
            currentUser.isSmoker !== null &&
            user.isSmoker === currentUser.isSmoker
          ) {
            score += 10;
          }
          if (
            user.keepsKosher !== null &&
            currentUser.keepsKosher !== null &&
            user.keepsKosher === currentUser.keepsKosher
          ) {
            score += 10;
          }
          if (
            user.keepsShabbat !== null &&
            currentUser.keepsShabbat !== null &&
            user.keepsShabbat === currentUser.keepsShabbat
          ) {
            score += 10;
          }

          // רמת ספונטניות — ככל שקרוב יותר, ניקוד גבוה יותר (טווח 1-5)
          if (
            user.spontaneityLevel != null &&
            currentUser.spontaneityLevel != null
          ) {
            const diff = Math.abs(
              user.spontaneityLevel - currentUser.spontaneityLevel,
            );
            if (diff === 0) score += 15;
            else if (diff === 1) score += 8;
          }

          // רמת אורח חיים — דומה
          if (
            user.lifestyleLevel != null &&
            currentUser.lifestyleLevel != null
          ) {
            const diff = Math.abs(
              user.lifestyleLevel - currentUser.lifestyleLevel,
            );
            if (diff === 0) score += 15;
            else if (diff === 1) score += 8;
          }

          return { ...user, matchScore: Math.min(score, 100) };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
    );
  }, [users, currentUser]);





  // ✔ אישור בקשה - יוצר Match בשרת ופותח צ'אט
  const handleAccept = async (requestId) => {
    const result = await approveRequest(requestId);
    setRequests((prev) => prev.filter((r) => r.requestID !== requestId));
    if (result?.matchID) {
      router.push({
        pathname: "/chat/[matchId]",
        params: { matchId: result.matchID },
      });
    }
  };

  // ✖ דחייה
  const handleReject = async (requestId) => {
    const ok = await rejectRequest(requestId);
    if (ok) {
      setRequests((prev) => prev.filter((r) => r.requestID !== requestId));
    }
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
          requests.map((req) => {
            const name =
              [req.fromFirstName, req.fromLastName]
                .filter(Boolean)
                .join(" ")
                .trim() || `משתמש #${req.fromUserID}`;
            const age = computeAge(req.fromBirthDate);
            const imageUri = buildImageUri(req.fromProfileImage);

            return (
              <View key={req.requestID} style={styles.requestCard}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={24} color="#fff" />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  {age != null && <Text style={styles.age}>גיל {age}</Text>}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleAccept(req.requestID)}>
                    <Ionicons name="checkmark-circle" size={28} color="green" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleReject(req.requestID)}>
                    <Ionicons name="close-circle" size={28} color="red" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* התאמות חכמות */}
        <Text style={styles.sectionTitle}>התאמות חכמות עבורך</Text>

        {smartMatches.length === 0 ? (
          <Text style={styles.placeholder}>אין משתמשים להציג כרגע</Text>
        ) : (
          smartMatches.map((user) => {
            const imageUri = buildImageUri(user.profileImage);
            return (
              <TouchableOpacity
                key={user.userID}
                style={styles.matchCard}
                onPress={() => openProfile(user)}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.matchAvatar}
                  />
                ) : (
                  <View style={[styles.matchAvatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={32} color="#fff" />
                  </View>
                )}

                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{user.name}</Text>

                  {user.age != null && (
                    <Text style={styles.matchDetails}>גיל {user.age}</Text>
                  )}

                  <Text style={styles.matchDetails}>
                    {user.interests.length > 0
                      ? user.interests.slice(0, 3).join(" • ")
                      : "אין תחומי עניין"}
                  </Text>
                </View>

                {/* ציון התאמה */}
                <View style={styles.scoreContainer}>
                  <Ionicons name="sparkles" size={18} color="#D4AF37" />
                  <Text style={styles.scoreText}>{user.matchScore}%</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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

  avatarFallback: {
    backgroundColor: "#7BBDBF",
    justifyContent: "center",
    alignItems: "center",
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

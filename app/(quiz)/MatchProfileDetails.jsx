import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronRight,
  Flame,
  Gem,
  MapPin,
  Moon,
  Plane,
  Utensils,
  Zap,
} from "lucide-react-native";
import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { sendChatRequest } from "../src/api/notificationService";
import { blockUser } from "../src/api/blockService";
import { COLORS, FONTS } from "../src/theme";

const GENDER_DB_TO_HE = { Male: "זכר", Female: "נקבה", Other: "אחר" };

// "בן"/"בת" לפי מגדר — נקבה→בת, זכר→בן, אחר/לא ידוע→בן/בת.
const ageWordByGender = (gender) =>
  gender === "Female" ? "בת" : gender === "Male" ? "בן" : "בן/בת";

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

function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

export default function MatchProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const matchUser = JSON.parse(params.user);

  const [profile, setProfile] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const userId = matchUser.userID;

        const [userRes, tripsRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/User/${userId}`, { headers }),
          fetch(`${BASE_URL}/Trip/user/${userId}`, { headers }),
        ]);

        if (userRes.status === "fulfilled" && userRes.value.ok) {
          setProfile(await userRes.value.json());
        }
        if (tripsRes.status === "fulfilled" && tripsRes.value.ok) {
          const all = await tripsRes.value.json();
          setTrips(
            (all || []).filter(
              (t) => t.status === "Active" || t.Status === "Active"
            )
          );
        }
      } catch (err) {
        console.log("MatchProfileDetails load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSendRequest = async () => {
    const me = getUser();
    if (!me?.userID) {
      if (Platform.OS === "web") window.alert("לא מחובר");
      else Alert.alert("שגיאה", "לא מחובר");
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      await sendChatRequest(me.userID, matchUser.userID);
      if (Platform.OS === "web") window.alert("הבקשה נשלחה בהצלחה");
      else Alert.alert("נשלח", "הבקשה נשלחה בהצלחה");
      router.back();
    } catch (err) {
      if (Platform.OS === "web") window.alert(err.message || "שליחת הבקשה נכשלה");
      else Alert.alert("שגיאה", err.message || "שליחת הבקשה נכשלה");
    } finally {
      setSending(false);
    }
  };

  const doRemove = async () => {
    try {
      const raw = await AsyncStorage.getItem("dismissed_matches");
      const ids = raw ? JSON.parse(raw) : [];
      if (!ids.includes(matchUser.userID)) ids.push(matchUser.userID);
      await AsyncStorage.setItem("dismissed_matches", JSON.stringify(ids));
    } catch {}
    router.back();
  };

  const handleRemove = () => {
    if (Platform.OS === "web") {
      if (window.confirm("להסיר משתמש זה מהצעות ההתאמה?")) doRemove();
    } else {
      Alert.alert("הסרה", "האם להסיר משתמש זה מהצעות ההתאמה?", [
        { text: "ביטול", style: "cancel" },
        { text: "הסר", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  // חסימת המשתמש דרך ה-API הקיים (blockUser). אחרי הצלחה — חזרה למסך הקודם.
  const performBlock = async () => {
    if (blocking) return;
    setBlocking(true);
    try {
      await blockUser(matchUser.userID);
      // הסתרה מיידית מ-matchesForYou דרך מנגנון ה-dismissed הקיים
      // (אותו מנגנון של "הסר מההצעות", שנטען מחדש ב-useFocusEffect).
      try {
        const raw = await AsyncStorage.getItem("dismissed_matches");
        const ids = raw ? JSON.parse(raw) : [];
        if (!ids.includes(matchUser.userID)) ids.push(matchUser.userID);
        await AsyncStorage.setItem("dismissed_matches", JSON.stringify(ids));
      } catch {}
      if (Platform.OS === "web") {
        window.alert(
          "המשתמש נחסם בהצלחה.\nהוא לא יוכל לשלוח לך הודעות או להופיע בהתאמות שלך.",
        );
        router.back();
      } else {
        Alert.alert(
          "המשתמש נחסם בהצלחה",
          "הוא לא יוכל לשלוח לך הודעות או להופיע בהתאמות שלך.",
          [{ text: "אישור", onPress: () => router.back() }],
        );
      }
    } catch (err) {
      if (Platform.OS === "web") window.alert(err.message || "חסימת המשתמש נכשלה");
      else Alert.alert("שגיאה", err.message || "חסימת המשתמש נכשלה");
    } finally {
      setBlocking(false);
    }
  };

  const handleBlock = () => {
    const name = matchUser.name || "המשתמש הזה";
    const msg = `האם לחסום את ${name}?\nלא תוכל/י לשלוח לו הודעות או לראות אותו בהתאמות.`;
    if (Platform.OS === "web") {
      if (window.confirm(msg)) performBlock();
    } else {
      Alert.alert("חסימת משתמש", msg, [
        { text: "ביטול", style: "cancel" },
        { text: "חסום", style: "destructive", onPress: performBlock },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  // matchUser (מרשימת ההתאמות) הוא המקור העשיר — כולל שם, תמונה ושדות השאלון.
  // /User/{id} מחזיר אובייקט דל שבו כל שדות השאלון הם null, ולכן חייב להתמזג *מתחת*
  // ל-matchUser כדי שה-null-ים שלו לא ידרסו את הערכים האמיתיים.
  const user = { ...(profile || {}), ...matchUser };
  const firstName = user.firstName || matchUser.name?.split(" ")[0] || "";
  const lastName =
    user.lastName || matchUser.name?.split(" ").slice(1).join(" ") || "";
  const initials =
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";
  // התמונה נמצאת על UserProfile ולא על טבלת Users, אז ה-fetch של /User עשוי להחזירה ריקה.
  // נופלים ל-matchUser.profileImage — התמונה שכבר הוצגה ברשימת ההתאמות.
  const imageUri = buildImageUri(
    user.profileImage || user.ProfileImage || matchUser.profileImage,
  );
  const age = calcAge(user.birthDate) || matchUser.age;
  const interests = user.interests || matchUser.interests || [];

  // רמות 1–5 → תיאור מילולי קצר (לפי הניסוח בשאלון ההעדפות).
  const spontaneityWord = (v) =>
    v <= 2 ? "מתכנן/ת מראש" : v === 3 ? "מאוזן/ת" : "הרפתקן/ית";
  const lifestyleWord = (v) =>
    v <= 2 ? "פשוט וחסכוני" : v === 3 ? "מאוזן" : "יוקרתי ומפנק";

  const lifestyleTags = [
    user.isSmoker != null && {
      label: user.isSmoker ? "מעשן/ת" : "לא מעשן/ת",
      Icon: Flame,
    },
    user.keepsKosher != null && {
      label: user.keepsKosher ? "שומר/ת כשרות" : "לא שומר/ת כשרות",
      Icon: Utensils,
    },
    user.keepsShabbat != null && {
      label: user.keepsShabbat ? "שומר/ת שבת" : "לא שומר/ת שבת",
      Icon: Moon,
    },
    user.spontaneityLevel != null && {
      label: `ספונטניות: ${spontaneityWord(user.spontaneityLevel)}`,
      Icon: Zap,
    },
    user.lifestyleLevel != null && {
      label: `אורח חיים: ${lifestyleWord(user.lifestyleLevel)}`,
      Icon: Gem,
    },
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      {/* כפתור חזרה */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="חזרה"
      >
        <ChevronRight size={22} color={COLORS.brand} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── הירו ── */}
        <View style={styles.heroSection}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}

          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>

          {age || user.gender ? (
            <Text style={styles.ageLine}>
              {age
                ? `${ageWordByGender(user.gender)} ${age}`
                : GENDER_DB_TO_HE[user.gender] || ""}
            </Text>
          ) : null}

          {user.city ? (
            <View style={styles.cityRow}>
              <MapPin size={14} color={COLORS.textMuted} />
              <Text style={styles.cityText}>{user.city}</Text>
            </View>
          ) : null}

          {matchUser.matchScore != null && (
            <View style={styles.matchBox}>
              <Text style={styles.matchText}>
                {matchUser.matchScore}% התאמה
              </Text>
            </View>
          )}
        </View>

        {/* ── טיולים פעילים ── */}
        {trips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Plane size={17} color={COLORS.brand} />
              <Text style={styles.sectionTitle}>טיולים מתוכננים</Text>
            </View>
            {trips.map((t, i) => (
              <View key={i} style={styles.tripCard}>
                <Text style={styles.tripDest}>
                  {t.destination ?? t.Destination}
                </Text>
                {(t.startDate || t.endDate) && (
                  <Text style={styles.tripDates}>
                    {formatDate(t.startDate)}
                    {t.endDate
                      ? ` – ${formatDate(t.endDate)}`
                      : " · כרטיס לכיוון אחד"}
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
                  <tag.Icon size={15} color={COLORS.brand} strokeWidth={2} />
                  <Text style={styles.tagText}>{tag.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── תחומי עניין ── */}
        {interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>תחומי עניין</Text>
            <View style={styles.tagsRow}>
              {interests.map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── כפתורים ── */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.chatBtn, sending && { opacity: 0.6 }]}
            onPress={handleSendRequest}
            disabled={sending}
          >
            <Text style={styles.chatBtnText}>
              {sending ? "שולח..." : "שלח בקשה לצ׳אט"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={handleRemove}
          >
            <Text style={styles.removeBtnText}>הסר מההצעות</Text>
          </TouchableOpacity>
        </View>

        {/* חסימת משתמש */}
        <TouchableOpacity
          style={[styles.blockBtn, blocking && { opacity: 0.6 }]}
          onPress={handleBlock}
          disabled={blocking}
          accessibilityRole="button"
          accessibilityLabel="חסום משתמש"
        >
          <Text style={styles.blockBtnText}>
            {blocking ? "חוסם..." : "חסום משתמש"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },

  backBtn: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
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
    backgroundColor: COLORS.surface,
    marginBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: COLORS.shadow,
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
    borderColor: COLORS.brandLight,
  },

  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  avatarInitials: {
    fontSize: 34,
    fontFamily: FONTS.bold,
    color: COLORS.onBrand,
  },

  name: {
    fontSize: 22,
    fontFamily: FONTS.extraBold || FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },

  ageLine: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
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
    color: COLORS.textMuted,
  },

  matchBox: {
    backgroundColor: COLORS.amberLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },

  matchText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.amberDark,
  },

  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 18,
    shadowColor: COLORS.shadow,
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
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 12,
  },

  tripCard: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: COLORS.brand,
    alignItems: "flex-end",
  },

  tripDest: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
  },

  tripDates: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: "right",
  },

  tagsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  tag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brandLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  tagText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.brand,
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
    color: "#7E76A6",
  },

  buttonsRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  chatBtn: {
    flex: 1,
    backgroundColor: COLORS.brand,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  chatBtnText: {
    color: COLORS.onBrand,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  removeBtn: {
    flex: 1,
    backgroundColor: COLORS.divider,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  removeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  blockBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  blockBtnText: {
    color: COLORS.danger,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
});

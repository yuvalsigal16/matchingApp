import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Bell, ChevronLeft, MapPin, MessageCircle, Users } from "lucide-react-native";
import { FONTS } from "../src/theme/fonts";
import { getToken, getUser } from "../src/auth/authStore";
import { BASE_URL } from "../src/api/config";
import BottomNav from "../../components/BottomNav";

// בונה URI שלם לתמונת פרופיל. השרת עשוי להחזיר URL מלא, נתיב יחסי, או שם קובץ —
// במקרים האחרונים חייבים להוסיף את שורש השרת (ללא ה-"/api") כדי ש-<Image> יוכל לטעון.
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

export default function Home() {
  const router = useRouter();
  // אתחול מיידי מ-authStore כדי שהשם יוצג בלי המתנה לרשת
  const cachedUser = getUser();
  const [userData, setUserData] = useState({
    firstName: cachedUser?.firstName || "",
    profileImage: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = getToken();
        const userId = getUser()?.userID;

        if (!token || !userId) {
          console.warn("[HomeScreen] משתמש לא מחובר — אין userID/token");
          setLoading(false);
          return;
        }

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // קריאה במקביל: פרטי פרופיל, תמונה ושאלון היכרות — שלוש קריאות נפרדות
        // כדי שכל אחד יוכל להצליח/להיכשל לחוד מבלי לחסום את השני.
        const [profileRes, imageRes, questionnaireRes] = await Promise.all([
          fetch(`${BASE_URL}/UserProfile/${userId}`, { method: "GET", headers }),
          fetch(`${BASE_URL}/UserProfile/image/${userId}`, { method: "GET", headers }),
          fetch(`${BASE_URL}/Questionnaire/${userId}`, { method: "GET", headers }),
        ]);

        let firstName = "";
        let profileImage = "";

        if (profileRes.ok) {
          const data = await profileRes.json();
          console.log("[HomeScreen] תשובת פרופיל:", data);
          firstName = data.firstName || data.FirstName || "";
          // fallback: אם endpoint התמונה ייכשל, ניקח את הנתיב מתוך הפרופיל
          profileImage = data.profileImage || data.ProfileImage || "";
        } else {
          console.warn(`[HomeScreen] קריאת פרופיל החזירה ${profileRes.status}`);
        }

        if (imageRes.ok) {
          const imgData = await imageRes.json();
          console.log("[HomeScreen] תשובת תמונה:", imgData);
          if (imgData?.imagePath) {
            profileImage = imgData.imagePath;
          }
        } else if (imageRes.status !== 404) {
          console.warn(`[HomeScreen] קריאת תמונה החזירה ${imageRes.status}`);
        }

        setUserData({ firstName, profileImage });

        // בדיקה האם המשתמש השלים את שאלון ההיכרות.
        // אם לא — מציגים הודעה ידידותית ומפנים אותו לשאלון.
        // 404 = אין שאלון, וזו הסיבה ש-PUT למסך עדכון נכשל.
        const hasProfile = profileRes.ok;
        const hasQuestionnaire = questionnaireRes.ok;

        if (!hasProfile || !hasQuestionnaire) {
          Alert.alert(
            "השלמת פרטי היכרות",
            "שמנו לב שעדיין לא השלמת את שאלון ההיכרות. מילוי השאלון יעזור לנו למצוא לך פרטנרים שמתאימים לך באמת.",
            [
              { text: "אחר כך", style: "cancel" },
              {
                text: "מילוי השאלון",
                onPress: () => router.replace("/QuizStartScreen"),
              },
            ],
            { cancelable: true },
          );
        }
      } catch (error) {
        console.error("[HomeScreen] שגיאה בטעינת פרופיל:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const profileImageUri = buildImageUri(userData.profileImage);

  const renderAvatar = () => {
    if (loading) {
      return (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      );
    }

    if (profileImageUri) {
      return (
        <Image
          source={{ uri: profileImageUri }}
          style={styles.avatar}
          onError={(e) =>
            console.warn("[HomeScreen] טעינת תמונה נכשלה:", profileImageUri, e.nativeEvent?.error)
          }
        />
      );
    }

    return (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Ionicons name="person" size={28} color="#fff" />
      </View>
    );
  };

  const MENU_ITEMS = [
    {
      key: "matches",
      title: "התאמות עבורך",
      Icon: MessageCircle,
      bg: "#E7F3FF",
      iconBorder: "#1877F2",
      route: "/matchesForYou",
    },
    {
      key: "trips",
      title: "הטיולים שלי",
      Icon: MapPin,
      bg: "#FAF1E0",
      iconBorder: "#B88A4C",
      route: "/myTrips",
    },
    {
      key: "notifications",
      title: "התראות ופעולות",
      Icon: Bell,
      bg: "#F4E4E1",
      iconBorder: "#B57A6F",
      route: "/notifications",
    },
    {
      key: "community",
      title: "גילוי וקהילה",
      Icon: Users,
      bg: "#E3EFE5",
      iconBorder: "#5F8E73",
      route: "/discovery",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>{`שלום, ${userData.firstName || "אורח"}`}</Text>
            <Text style={styles.mainTitle}>ברוך הבא לצמד חמד</Text>
          </View>
          {renderAvatar()}
        </View>

        <View style={styles.introSection}>
          <Text style={styles.introText}>מוכנ/ה למצוא את פרטנר הטיול הבא שלך?</Text>
          <View style={styles.introIcon}>
          </View>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => {
            const IconComponent = item.Icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tile, { backgroundColor: item.bg }]}
                activeOpacity={0.85}
                onPress={() => router.push(item.route)}
              >
                <View style={styles.tileTextContainer}>
                  <Text style={styles.tileTitle}>{item.title}</Text>
                  <Text style={styles.tileSub}>{item.sub}</Text>
                </View>
                <View style={[styles.iconContainer, { borderColor: item.iconBorder }]}>
                  <IconComponent size={22} color="#1A3C40" strokeWidth={2.2} />
                </View>
                <ChevronLeft size={22} color="#9A9A9A" strokeWidth={2.2} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <BottomNav active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 36,
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  headerTextContainer: {
    alignItems: "flex-end",
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: "#8A8A8A",
    fontFamily: FONTS.regular,
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    color: "#1A1A1A",
    letterSpacing: 0.2,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    backgroundColor: "#1877F2",
    justifyContent: "center",
    alignItems: "center",
  },

  introSection: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 36,
  },
  introText: {
    flex: 1,
    fontSize: 15,
    color: "#6E6E6E",
    fontFamily: FONTS.regular,
    textAlign: "right",
    paddingHorizontal: 4,
    lineHeight: 22,
  },

  menuList: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 24,
  },
  tile: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tileTextContainer: {
    flex: 1,
    alignItems: "flex-end",
    paddingHorizontal: 14,
  },
  tileTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  tileSub: {
    fontSize: 13,
    color: "#7A7A7A",
    fontFamily: FONTS.regular,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingBottom: 14,
    backgroundColor: "#F0F2F5",
    borderTopWidth: 1,
    borderTopColor: "#DADDE1",
  },
  navItem: {
    width: 56,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navItemActive: {},
});

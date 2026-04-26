import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Bell, ChevronLeft, MapPin, MessageCircle, Users } from "lucide-react-native";
import { FONTS } from "../theme/fonts";
import { getToken, getUser } from "../auth/authStore";
import { BASE_URL } from "../api/config";
import BottomNav from "../Components/BottomNav";

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

export default function HomeScreen({ navigation }) {
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

        // קריאה במקביל: פרטי פרופיל ותמונה — שתי קריאות נפרדות לשני endpoints
        // כדי שכל אחד יוכל להצליח/להיכשל לחוד מבלי לחסום את השני.
        const [profileRes, imageRes] = await Promise.all([
          fetch(`${BASE_URL}/UserProfile/${userId}`, { method: "GET", headers }),
          fetch(`${BASE_URL}/UserProfile/image/${userId}`, { method: "GET", headers }),
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
      sub: "3 התאמות חדשות",
      Icon: MessageCircle,
      bg: "#D4E8E6",
      iconBorder: "#7BBDBF",
    },
    {
      key: "trips",
      title: "הטיולים שלי",
      sub: "2 טיולים פעילים",
      Icon: MapPin,
      bg: "#EADFCB",
      iconBorder: "#C9A876",
    },
    {
      key: "notifications",
      title: "התראות ופעילויות",
      sub: "5 התראות",
      Icon: Bell,
      bg: "#F4D9D9",
      iconBorder: "#D88B8B",
    },
    {
      key: "community",
      title: "גילוי וקהילה",
      sub: "בקרב המטיילים",
      Icon: Users,
      bg: "#E0D5E8",
      iconBorder: "#9A7BBE",
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

      <BottomNav navigation={navigation} active="home" />
      {/* <View style={styles.bottomNav}>
        <TouchableOpacity 
        style={styles.navItem} 
        activeOpacity={0.7}
          onPress={() => navigation.navigate("PersonalProfile")}
        >
          <Ionicons name="person-outline" size={26} color="#1A3C40" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={26} color="#1A3C40" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <Ionicons name="compass-outline" size={26} color="#1A3C40" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.7}>
          <Ionicons name="home" size={26} color="#1A3C40" />
        </TouchableOpacity>
      </View> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  headerTextContainer: {
    alignItems: "flex-end",
    flex: 1,
  },
  greetingText: {
    fontSize: 13,
    color: "#8A8A8A",
    fontFamily: FONTS?.medium || "System",
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 22,
    fontFamily: FONTS?.extraBold || "System",
    color: "#1A1A1A",
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    backgroundColor: "#F5C7B8",
    justifyContent: "center",
    alignItems: "center",
  },

  introSection: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 24,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: "#7A7A7A",
    fontFamily: FONTS?.medium || "System",
    textAlign: "right",
    paddingHorizontal: 8,
    lineHeight: 20,
  },

  menuList: {
    flex: 1,
  },
  tile: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 12,
  },
  tileTextContainer: {
    flex: 1,
    alignItems: "flex-end",
    paddingHorizontal: 12,
  },
  tileTitle: {
    fontSize: 16,
    fontFamily: FONTS?.bold || "System",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  tileSub: {
    fontSize: 12,
    color: "#7A7A7A",
    fontFamily: FONTS?.regular || "System",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    backgroundColor: "#F5F0E8",
    borderTopWidth: 1,
    borderTopColor: "#E5DBC7",
  },
  navItem: {
    width: 56,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navItemActive: {},
});

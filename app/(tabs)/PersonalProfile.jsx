import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ChevronLeft, FileText, Heart, LogOut, Settings, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../src/api/config";
import { deleteProfileImage, uploadProfileImage } from "../src/api/userProfileService";
import { clearAuth, getToken, getUser } from "../src/auth/authStore";
import { FONTS } from "../src/theme/fonts";
import BottomNav from "../../components/BottomNav";


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
  const router = useRouter();
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
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // העלאה אופטימית: מציג את התמונה החדשה מיד, ושולח לשרת ברקע.
  // אם ההעלאה נכשלת — חוזרים לתמונה הקודמת ומתריעים למשתמש.
  const handleImageSelected = async (uri) => {
    const previousImage = userData.profileImage;
    setUserData((prev) => ({ ...prev, profileImage: uri }));
    setUploading(true);
    try {
      const userId = getUser()?.userID;
      if (!userId) throw new Error("משתמש לא מחובר");
      await uploadProfileImage(userId, uri);
    } catch (err) {
      setUserData((prev) => ({ ...prev, profileImage: previousImage }));
      Alert.alert("שגיאה", err.message || "העלאת התמונה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    setImagePickerVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("נדרשת הרשאה", "נא לאשר גישה לגלריה כדי לבחור תמונה");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      await handleImageSelected(result.assets[0].uri);
    }
  };

  // מחיקת תמונת פרופיל קיימת. אופטימי: מנקים מיד מה-state כדי שיוצג אייקון ברירת המחדל.
  // אם השרת מחזיר שגיאה — משחזרים את הערך הקודם.
  const handleDeleteImage = async () => {
    setImagePickerVisible(false);
    if (!userData.profileImage) return;
    const previousImage = userData.profileImage;
    setUserData((prev) => ({ ...prev, profileImage: "" }));
    setUploading(true);
    try {
      const userId = getUser()?.userID;
      if (!userId) throw new Error("משתמש לא מחובר");
      await deleteProfileImage(userId);
    } catch (err) {
      setUserData((prev) => ({ ...prev, profileImage: previousImage }));
      Alert.alert("שגיאה", err.message || "מחיקת התמונה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    setImagePickerVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("נדרשת הרשאה", "נא לאשר גישה למצלמה כדי לצלם תמונה");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      await handleImageSelected(result.assets[0].uri);
    }
  };

  // מנתק את המשתמש: מציג Alert לאישור, מנקה את ה-token ואת פרטי המשתמש מהזיכרון,
  // ומחזיר אותו למסך ההתחברות. משתמשים ב-replace כדי שלא יהיה אפשר לחזור אחורה
  // למסך הפרופיל אחרי ההתנתקות.
  const handleLogout = () => {
    if (Platform.OS === "web") {
      // ב-web אין Alert נייטיב — משתמשים ב-confirm של הדפדפן
      if (window.confirm("האם להתנתק מהחשבון?")) {
        clearAuth();
        router.replace("/Login");
      }
      return;
    }
    Alert.alert(
      "התנתקות",
      "האם להתנתק מהחשבון?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "התנתק",
          style: "destructive",
          onPress: () => {
            clearAuth();
            router.replace("/Login");
          },
        },
      ],
      { cancelable: true },
    );
  };

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

  // route = ה-path אליו הכפתור מנווט (null = לא לחיץ עדיין)
  const MENU = [
    {
      title: "גילוי וקהילה",
      sub: "בקרב המטיילים",
      Icon: Users,
      route: "/discovery",
      iconBg: "#E3EFE5",
    },
    {
      title: "הגדרות",
      Icon: Settings,
      route: "/Settings",
    },
    {
      title: "עדכון פרטים אישיים",
      Icon: FileText,
      route: "/UpdateIntroQuiz",
    },
    {
      title: "עדכון העדפות טיול",
      Icon: Heart,
      route: "/UpdateTravelPreferences",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Header — רק חץ חזרה ל-Home (אייקון ההגדרות הוסר כי הוא קיים בתפריט למטה) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace("/Home")}>
            <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
          </TouchableOpacity>
        </View>

        {/* Avatar — לחיץ לפתיחת בורר תמונה */}
        <View style={styles.avatarContainer}>
          <Pressable onPress={() => setImagePickerVisible(true)}>
            {renderAvatar()}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </Pressable>

          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => setImagePickerVisible(true)}
            disabled={uploading}
          >
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
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                disabled={!item.route}
                onPress={() => item.route && router.push(item.route)}
              >
                <ChevronLeft size={20} color="#999" />
                <View style={styles.menuTextBlock}>
                  <Text style={styles.menuText}>{item.title}</Text>
                  {item.sub ? (
                    <Text style={styles.menuSub}>{item.sub}</Text>
                  ) : null}
                </View>
                <View style={[styles.menuIcon, item.iconBg ? { backgroundColor: item.iconBg } : null]}>
                  <Icon size={20} color="#1A3C40" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* כפתור התנתקות — מובדל ויזואלית מהתפריט הרגיל ע"י צבע אדום וגוון רקע ורדרד */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={20} color="#C0392B" />
          <Text style={styles.logoutText}>התנתקות</Text>
        </TouchableOpacity>
      </ScrollView>

     <BottomNav active="profile" />

      {/* Modal לבחירת מקור התמונה — מצלמה / גלריה */}
      <Modal
        transparent
        visible={imagePickerVisible}
        animationType="fade"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setImagePickerVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>בחירת תמונת פרופיל</Text>

            <Pressable style={styles.modalBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={22} color="#1A3C40" />
              <Text style={styles.modalBtnText}>צילום במצלמה</Text>
            </Pressable>

            <Pressable style={styles.modalBtn} onPress={pickFromGallery}>
              <Ionicons name="images" size={22} color="#1A3C40" />
              <Text style={styles.modalBtnText}>בחירה מהגלריה</Text>
            </Pressable>

            {userData.profileImage ? (
              <Pressable
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={handleDeleteImage}
              >
                <Ionicons name="trash-outline" size={22} color="#C0392B" />
                <Text style={[styles.modalBtnText, styles.modalBtnDangerText]}>
                  מחיקת התמונה
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={() => setImagePickerVisible(false)}
            >
              <Text style={styles.modalBtnCancelText}>ביטול</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  // ScrollView contentContainerStyle: לא משתמשים ב-flex:1 כי זה משבית גלילה.
  // paddingBottom נותן אוויר מתחת לכפתור ההתנתקות לפני ה-BottomNav.
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 30 },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 24,
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
    backgroundColor: "#1877F2",
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

  menuTextBlock: {
    flex: 1,
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },

  menuText: {
    textAlign: "right",
    fontFamily: FONTS.regular,
    color: "#1A1A1A",
  },

  menuSub: {
    textAlign: "right",
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#B88A4C",
    marginTop: 2,
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
  },

  // כפתור התנתקות — אדום עדין, מופרד מהתפריט הרגיל ע"י marginTop גדול
  logoutBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FBE9E7",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#F5C9C2",
  },
  logoutText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#C0392B",
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "center",
    marginBottom: 18,
  },
  modalBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F0F2F5",
    marginBottom: 10,
    gap: 12,
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },
  modalBtnCancel: {
    backgroundColor: "transparent",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 0,
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#888",
  },
  modalBtnDanger: {
    backgroundColor: "#FBE9E7",
  },
  modalBtnDangerText: {
    color: "#C0392B",
  },
});
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, FileText, Heart, Images, LogOut, Settings, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNav from "../../components/BottomNav";
import Avatar from "../../components/ui/Avatar";
import Card from "../../components/ui/Card";
import ListRow from "../../components/ui/ListRow";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { BASE_URL } from "../src/api/config";
import { deleteProfileImage, uploadProfileImage } from "../src/api/userProfileService";
import { clearExpoPushToken, getMyMatches } from "../src/api/notificationService";
import { clearAuth, getToken, getUser } from "../src/auth/authStore";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";

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
    journeyStarted: 0,
    trips: 0,
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

        // getMyMatches = מקור האמת של ההתאמות (זהה למסך הצ'אטים/התאמות).
        const [profileRes, imageRes, tripsRes, myMatches] =
          await Promise.all([
            fetch(`${BASE_URL}/UserProfile/${userId}`, { headers }),
            fetch(`${BASE_URL}/UserProfile/image/${userId}`, { headers }),
            fetch(`${BASE_URL}/Trip/user/${userId}`, { headers }),
            getMyMatches(userId),
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

        let trips = 0;
        if (tripsRes.ok) {
          const t = await tripsRes.json();
          trips = t.length || 0;
        }

        // מקור אמת יחיד: getMyMatches.
        // התאמות = כל ההתאמות הפעילות (לא Closed); יצאנו לדרך = JourneyStarted מהשרת.
        const list = myMatches || [];
        const matches = list.filter((m) => m.status !== "Closed").length;
        const journeyStarted = list.filter((m) => m.journeyStarted).length;

        setUserData({
          firstName,
          lastName,
          email: cachedUser?.email || "",
          profileImage,
        });

        setStats({ matches, journeyStarted, trips });
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
  const handleLogout = async () => {
    if (Platform.OS === "web") {
      // ב-web אין Alert נייטיב — משתמשים ב-confirm של הדפדפן
      if (window.confirm("האם להתנתק מהחשבון?")) {
        // קודם ניקוי ה-Push Token בשרת (כשל לא חוסם logout), ואז ניקוי מקומי.
        try { await clearExpoPushToken(); } catch (e) { console.warn("[push] ניקוי token בשרת נכשל:", e?.message); }
        await clearAuth();
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
          onPress: async () => {
            // קודם ניקוי ה-Push Token בשרת (כשל לא חוסם logout), ואז ניקוי מקומי.
            try { await clearExpoPushToken(); } catch (e) { console.warn("[push] ניקוי token בשרת נכשל:", e?.message); }
            await clearAuth();
            router.replace("/Login");
          },
        },
      ],
      { cancelable: true },
    );
  };

  const fullName = `${userData.firstName} ${userData.lastName}`.trim();

  // route = ה-path אליו הכפתור מנווט
  const MENU = [
    { title: "הגדרות", Icon: Settings, route: "/Settings" },
    { title: "עדכון פרטים אישיים", Icon: FileText, route: "/UpdateIntroQuiz" },
    { title: "עדכון העדפות טיול", Icon: Heart, route: "/UpdateTravelPreferences" },
  ];

  return (
    <Screen>
      <ScreenHeader onBack={() => router.replace("/Home")} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── זהות: אווטר גדול, שם, אימייל — מרוכז, נקי, אישי ── */}
        <View style={styles.identity}>
          <View style={styles.avatarWrapper}>
            <Avatar
              uri={userData.profileImage}
              name={fullName}
              size={104}
              onPress={() => setImagePickerVisible(true)}
              accessibilityLabel="שינוי תמונת פרופיל"
            />
            {(loading || uploading) && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={COLORS.onBrand} />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setImagePickerVisible(true)}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="שינוי תמונת פרופיל"
            >
              <Camera size={16} color={COLORS.onBrand} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {fullName}
          </Text>
          {userData.email ? (
            <Text style={styles.email} numberOfLines={1}>
              {userData.email}
            </Text>
          ) : null}
        </View>

        {/* ── סטטיסטיקות: רצועה אחת שקטה (במקום שלושה כרטיסים נפרדים) ── */}
        <Card style={styles.statsCard} padded={false}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{stats.matches}</Text>
              <Text style={styles.statLabel}>התאמות</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{stats.journeyStarted}</Text>
              <Text style={styles.statLabel}>יצאנו לדרך</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{stats.trips}</Text>
              <Text style={styles.statLabel}>טיולים</Text>
            </View>
          </View>
        </Card>

        {/* ── תפריט ── */}
        <View style={styles.menu}>
          {MENU.map((item) => (
            <ListRow
              key={item.route}
              Icon={item.Icon}
              title={item.title}
              onPress={() => router.push(item.route)}
              style={styles.menuRow}
            />
          ))}
        </View>

        {/* ── התנתקות — מובדלת ויזואלית ומאשרת לפני פעולה ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="התנתקות"
        >
          <LogOut size={20} color={COLORS.danger} strokeWidth={2} />
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
              <Camera size={22} color={COLORS.brand} strokeWidth={2} />
              <Text style={styles.modalBtnText}>צילום במצלמה</Text>
            </Pressable>

            <Pressable style={styles.modalBtn} onPress={pickFromGallery}>
              <Images size={22} color={COLORS.brand} strokeWidth={2} />
              <Text style={styles.modalBtnText}>בחירה מהגלריה</Text>
            </Pressable>

            {userData.profileImage ? (
              <Pressable
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={handleDeleteImage}
              >
                <Trash2 size={22} color={COLORS.danger} strokeWidth={2} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },

  // ── זהות ──
  identity: { alignItems: "center", marginBottom: SPACING.xl },
  avatarWrapper: { width: 104, height: 104, marginBottom: SPACING.md },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.pill,
    padding: 7,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  name: { ...TYPOGRAPHY.h2, color: COLORS.text, textAlign: "center" },
  email: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
  },

  // ── סטטיסטיקות ──
  statsCard: { marginBottom: SPACING.xl },
  statsRow: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    paddingVertical: SPACING.lg,
  },
  stat: { flex: 1, alignItems: "center", justifyContent: "center" },
  statNumber: { ...TYPOGRAPHY.h2, color: COLORS.text },
  statLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
    marginVertical: SPACING.sm,
  },

  // ── תפריט ──
  menu: { gap: SPACING.sm + 2 },
  menuRow: {},

  // ── התנתקות ──
  logoutBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.dangerLight,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  logoutText: { ...TYPOGRAPHY.button, color: COLORS.danger },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xxl + SPACING.xs,
  },
  modalCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  modalBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  modalBtnText: { ...TYPOGRAPHY.bodyBold, color: COLORS.brand },
  modalBtnCancel: {
    backgroundColor: "transparent",
    justifyContent: "center",
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  modalBtnCancelText: { ...TYPOGRAPHY.body, color: COLORS.textMuted },
  modalBtnDanger: { backgroundColor: COLORS.dangerLight },
  modalBtnDangerText: { color: COLORS.danger },
});

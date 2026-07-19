import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CircleX, TriangleAlert, Trash2 } from "lucide-react-native";

import { apiDeleteAccount } from "./src/api/authService";
import { clearAuth, getUser } from "./src/auth/authStore";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import Button from "../components/ui/Button";

// רשימת הדברים שיימחקו - כדי שהמשתמש יבין מה הוא עומד לאבד.
const ITEMS_TO_DELETE = [
  "פרטי הפרופיל והתמונה",
  "כל תחומי העניין ותשובות השאלון",
  "כל הטיולים שנוצרו",
  "כל הבקשות לצ'אט שנשלחו או התקבלו",
  "כל הצ'אטים וההודעות",
  "ההתראות וההיסטוריה",
];

export default function DeleteAccountScreen() {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (deleting) return;

    // אישור סופי לפני שליחה לשרת.
    Alert.alert(
      "מחיקת חשבון",
      "מחיקת החשבון היא פעולה בלתי הפיכה. כל הנתונים יימחקו לצמיתות.",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחיקת החשבון",
          style: "destructive",
          onPress: performDelete,
        },
      ],
      { cancelable: true },
    );
  };

  const performDelete = async () => {
    const user = getUser();
    if (!user?.userID) {
      Alert.alert("שגיאה", "המשתמש לא מחובר");
      return;
    }

    setDeleting(true);
    try {
      await apiDeleteAccount(user.userID);

      // מחיקת הנתונים מקומית והעברה ל-Login.
      // המעבר ל-Login הוא האישור הברור שהמחיקה בוצעה.
      clearAuth();
      router.replace("/Login");
    } catch (err) {
      Alert.alert("שגיאה במחיקה", err.message || "מחיקת החשבון נכשלה");
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="מחיקת חשבון" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* כרטיס אזהרה */}
        <View style={styles.warningCard}>
          <TriangleAlert size={32} color={COLORS.danger} strokeWidth={2} />
          <Text style={styles.warningTitle}>פעולה בלתי הפיכה</Text>
          <Text style={styles.warningText}>
            מחיקת החשבון תמחק את כל הנתונים מהאפליקציה לצמיתות. לא ניתן
            לשחזר חשבון אחרי המחיקה.
          </Text>
        </View>

        {/* רשימת הפריטים שיימחקו */}
        <Text style={styles.sectionTitle}>מה יימחק?</Text>
        <View style={styles.itemsList}>
          {ITEMS_TO_DELETE.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <CircleX size={18} color={COLORS.danger} strokeWidth={2} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* כפתור מחיקה — solid danger מכוון: פעולה בלתי-הפיכה, חזק מהוריאנט הרך. */}
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && styles.deleteBtnOff]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="מחיקת החשבון לצמיתות"
        >
          {deleting ? (
            <ActivityIndicator color={COLORS.onBrand} />
          ) : (
            <>
              <Trash2 size={20} color={COLORS.onBrand} strokeWidth={2} />
              <Text style={styles.deleteBtnText}>מחיקת החשבון לצמיתות</Text>
            </>
          )}
        </TouchableOpacity>

        {/* כפתור ביטול */}
        <Button
          label="ביטול - חזרה להגדרות"
          onPress={() => router.back()}
          variant="ghost"
          size="md"
          disabled={deleting}
          style={styles.cancelBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },

  warningCard: {
    backgroundColor: COLORS.dangerLight,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  warningTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.danger,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs + 2,
  },
  warningText: {
    ...TYPOGRAPHY.body,
    color: COLORS.danger,
    textAlign: "center",
  },

  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: SPACING.sm,
  },
  itemsList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
  },
  itemText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    color: COLORS.text,
    textAlign: "right",
  },

  deleteBtn: {
    backgroundColor: COLORS.danger,
    height: 54,
    borderRadius: RADIUS.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  deleteBtnOff: { opacity: 0.6 },
  deleteBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onBrand,
  },

  cancelBtn: { marginTop: SPACING.xs },
});

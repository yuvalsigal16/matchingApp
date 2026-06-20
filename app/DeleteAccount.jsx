import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiDeleteAccount } from "./src/api/authService";
import { clearAuth, getUser } from "./src/auth/authStore";
import { COLORS, FONTS } from "./src/theme";

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
          text: "מחק את החשבון",
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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={deleting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.header}>מחיקת חשבון</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* כרטיס אזהרה */}
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={32} color={COLORS.danger} />
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
              <Ionicons name="close-circle" size={18} color={COLORS.danger} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* כפתור מחיקה - תמיד פעיל. האישור מתבצע ב-Alert. */}
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator color={COLORS.onBrand} />
          ) : (
            <>
              <Ionicons name="trash" size={20} color={COLORS.onBrand} />
              <Text style={styles.deleteBtnText}>מחק את החשבון לצמיתות</Text>
            </>
          )}
        </TouchableOpacity>

        {/* כפתור ביטול */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          disabled={deleting}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>ביטול - חזרה להגדרות</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  header: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },

  warningCard: {
    backgroundColor: COLORS.dangerLight,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
  },

  warningTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
    marginTop: 8,
    marginBottom: 6,
  },

  warningText: {
    fontSize: 14,
    color: COLORS.danger,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 22,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 10,
    marginTop: 8,
  },

  itemsList: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
  },

  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },

  itemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.brand,
    fontFamily: FONTS.regular,
    textAlign: "right",
  },

  deleteBtn: {
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },

  deleteBtnText: {
    color: COLORS.surface,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  cancelBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },

  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
});

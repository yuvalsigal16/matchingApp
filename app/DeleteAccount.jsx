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
import { FONTS } from "./src/theme/fonts";

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
        <TouchableOpacity onPress={() => router.back()} disabled={deleting}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>מחיקת חשבון</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* כרטיס אזהרה */}
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={32} color="#C0392B" />
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
              <Ionicons name="close-circle" size={18} color="#C0392B" />
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
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#fff" />
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
  container: { flex: 1, backgroundColor: "#F0F2F5" },

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
    color: "#1A3C40",
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },

  warningCard: {
    backgroundColor: "#FBE9E7",
    borderColor: "#F5C9C2",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
  },

  warningTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#C0392B",
    marginTop: 8,
    marginBottom: 6,
  },

  warningText: {
    fontSize: 14,
    color: "#5D2E2E",
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 22,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "right",
    marginBottom: 10,
    marginTop: 8,
  },

  itemsList: {
    backgroundColor: "#fff",
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
    color: "#1A3C40",
    fontFamily: FONTS.regular,
    textAlign: "right",
  },

  deleteBtn: {
    backgroundColor: "#C0392B",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },

  deleteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  cancelBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },

  cancelBtnText: {
    color: "#666",
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
});

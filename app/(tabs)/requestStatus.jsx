import React, { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONTS } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import { cancelRequest, getPendingRequests } from "../src/api/notificationService";
import BottomNav from "../../components/BottomNav";

// מסך הצגת סטטוס הבקשות שהמשתמש שלח
export default function RequestStatusScreen() {
  const router = useRouter();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // טעינה ראשונית של הבקשות מהשרת
  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const userId = getUser()?.userID;
    if (!userId) {
      setLoading(false);
      return;
    }

    // משיכת רשימת הבקשות הממתינות
    const all = await getPendingRequests(userId);

    // מסננים רק את הבקשות שאני שלחתי (יוצאות)
    const myOutgoing = all.filter((r) => r.fromUserID === userId);

    setRequests(myOutgoing);
    setLoading(false);
  };

  // ביטול בקשה ששלחתי
  const handleCancel = (requestId) => {
    Alert.alert("ביטול בקשה", "האם לבטל את הבקשה?", [
      { text: "לא", style: "cancel" },
      {
        text: "כן, בטל",
        style: "destructive",
        onPress: async () => {
          const ok = await cancelRequest(requestId);
          if (ok) {
            // אחרי ביטול מוצלח - מעדכנים את הרשימה
            setRequests((prev) => prev.filter((r) => r.requestID !== requestId));
          } else {
            Alert.alert("שגיאה", "לא ניתן היה לבטל את הבקשה");
          }
        },
      },
    ]);
  };

  // החזרת אייקון וצבע לפי סטטוס הבקשה
  const renderStatus = (status) => {
    if (status === "Pending") {
      return { icon: "time-outline", color: COLORS.amber, label: "ממתין" };
    }
    if (status === "Approved") {
      return { icon: "checkmark-circle-outline", color: COLORS.success, label: "אושר" };
    }
    if (status === "Rejected") {
      return { icon: "close-circle-outline", color: COLORS.danger, label: "נדחה" };
    }
    return { icon: "ellipse-outline", color: COLORS.textMuted, label: status || "—" };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header עם חץ חזרה */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
        <Text style={styles.header}>סטטוס בקשות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="paper-plane-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>אין בקשות פעילות</Text>
          </View>
        ) : (
          requests.map((req) => {
            const s = renderStatus(req.status);
            return (
              <View key={req.requestID} style={styles.card}>
                {/* אייקון סטטוס */}
                <Ionicons name={s.icon} size={26} color={s.color} />

                {/* פרטי בקשה */}
                <View style={styles.cardText}>
                  <Text style={styles.title}>
                    {[req.toFirstName, req.toLastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || `משתמש #${req.toUserID}`}
                  </Text>
                  <Text style={styles.subtitle}>סטטוס: {s.label}</Text>
                </View>

                {/* כפתור ביטול - רק לבקשות בהמתנה */}
                {req.status === "Pending" && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(req.requestID)}
                  >
                    <Text style={styles.cancelText}>בטל</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="notifications" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  cardText: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
  },

  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  cancelBtn: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },

  cancelText: {
    color: COLORS.danger,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});

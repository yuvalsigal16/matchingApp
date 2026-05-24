import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import BottomNav from "../../components/BottomNav";
import { FONTS } from "../../theme/fonts";
import {
    cancelRequest,
    getPendingRequests,
} from "../src/api/notificationService";
import { getUser } from "../src/auth/authStore";

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
            setRequests((prev) =>
              prev.filter((r) => r.requestID !== requestId),
            );
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
      return { icon: "time-outline", color: "#E08E45", label: "ממתין" };
    }
    if (status === "Approved") {
      return {
        icon: "checkmark-circle-outline",
        color: "#4CAF50",
        label: "אושר",
      };
    }
    if (status === "Rejected") {
      return { icon: "close-circle-outline", color: "#C0392B", label: "נדחה" };
    }
    return { icon: "ellipse-outline", color: "#888", label: status || "—" };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header עם חץ חזרה */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.header}>סטטוס בקשות</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="paper-plane-outline" size={40} color="#aaa" />
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
                  <Text style={styles.title}>בקשה למשתמש #{req.toUserID}</Text>
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
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  header: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
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
    color: "#1A3C40",
  },

  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#666",
    marginTop: 4,
  },

  cancelBtn: {
    backgroundColor: "#FBE9E7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5C9C2",
  },

  cancelText: {
    color: "#C0392B",
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
    color: "#888",
    fontFamily: FONTS.regular,
  },
});

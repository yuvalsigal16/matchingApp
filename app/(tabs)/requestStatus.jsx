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
import { useRouter } from "expo-router";
import { Check, Circle, Clock, Send, X } from "lucide-react-native";

import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import { getUser } from "../src/auth/authStore";
import { cancelRequest, getPendingRequests } from "../src/api/notificationService";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import EmptyState from "../../components/ui/EmptyState";
import BottomNav from "../../components/BottomNav";

// RequestRow — שורת בקשה (מקומית למסך זה): מראה וריווח זהים ל-NotificationRow —
// עיגול-אייקון בגוון-הסטטוס + שם הנמען + תווית סטטוס, וכפתור "בטל" לבקשה בהמתנה.
function RequestRow({ req, status, onCancel }) {
  const Icon = status.Icon;
  const name =
    [req.toFirstName, req.toLastName].filter(Boolean).join(" ").trim() ||
    `משתמש #${req.toUserID}`;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: status.bg }]}>
        <Icon size={20} color={status.color} strokeWidth={2} />
      </View>

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {status.label}
        </Text>
      </View>

      {req.status === "Pending" ? (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={`ביטול הבקשה ל-${name}`}
        >
          <Text style={styles.cancelText}>בטל</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

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

  // החזרת אייקון, גוון סמנטי ותווית לפי סטטוס הבקשה (lucide בלבד; Pending = brand).
  const renderStatus = (status) => {
    if (status === "Pending") {
      return { Icon: Clock, color: COLORS.brand, bg: COLORS.brandLight, label: "ממתין" };
    }
    if (status === "Approved") {
      return { Icon: Check, color: COLORS.success, bg: COLORS.successLight, label: "אושר" };
    }
    if (status === "Rejected") {
      return { Icon: X, color: COLORS.danger, bg: COLORS.dangerLight, label: "נדחה" };
    }
    return { Icon: Circle, color: COLORS.textMuted, bg: COLORS.divider, label: status || "—" };
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="סטטוס בקשות" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
        <BottomNav active="notifications" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="סטטוס בקשות" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={
          requests.length === 0 ? styles.emptyContent : styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        {requests.length === 0 ? (
          <EmptyState
            Icon={Send}
            title="אין בקשות פעילות"
            subtitle="הבקשות ששלחת יופיעו כאן עם הסטטוס שלהן."
            actionLabel="מצאו עם מי לצאת לדרך"
            onAction={() => router.push("/matchesForYou")}
          />
        ) : (
          requests.map((req, i) => {
            const s = renderStatus(req.status);
            return (
              <View key={req.requestID}>
                <RequestRow
                  req={req}
                  status={s}
                  onCancel={() => handleCancel(req.requestID)}
                />
                {i < requests.length - 1 ? (
                  <View style={styles.separator} />
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="notifications" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  content: { paddingTop: SPACING.sm, paddingBottom: SPACING.xxl },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },

  // שורת בקשה — ריווח/מבנה זהים ל-NotificationRow (שפה עקבית).
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  text: { flex: 1, alignItems: "flex-end", gap: SPACING.xs / 2 },
  title: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.semibold,
    color: COLORS.text,
    textAlign: "right",
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "right",
  },

  // כפתור ביטול — pill מקומי מטוקן (danger), עקבי בצורתו עם ה-pill-ים באפליקציה.
  cancelBtn: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  cancelText: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
  },

  // מפריד עדין, מוזח אל מעבר לעיגול-האייקון (זהה ל-notifications).
  separator: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginRight: SPACING.xl + 40 + SPACING.md,
  },
});

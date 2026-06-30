import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BASE_URL } from "../src/api/config";
import { getCommunityMembers } from "../src/api/communityChatService";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

// בונה URI לתמונת פרופיל מנתיב יחסי/מלא — אותו עזר שבשאר האפליקציה.
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

function formatJoinedAt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// אווטר עגול עם נפילה עדינה לאייקון ברירת-מחדל.
function MemberAvatar({ uri, name }) {
  const [failed, setFailed] = useState(false);
  const showImg = uri && !failed;
  return (
    <View style={styles.avatar}>
      {showImg ? (
        <Image
          source={{ uri }}
          style={styles.avatarImg}
          onError={() => setFailed(true)}
          accessibilityLabel={name ? `תמונת הפרופיל של ${name}` : "תמונת פרופיל"}
        />
      ) : (
        <Ionicons name="person-circle" size={48} color={COLORS.textMuted} />
      )}
    </View>
  );
}

export default function CommunityMembersScreen() {
  const router = useRouter();
  const { communityID, communityName } = useLocalSearchParams();
  const myId = getUser()?.userID;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // טעינה חד-פעמית של חברי הקהילה (ללא polling).
  useEffect(() => {
    if (!communityID) return;
    setLoading(true);
    getCommunityMembers(communityID)
      .then((list) => {
        if (!mountedRef.current) return;
        setMembers(Array.isArray(list) ? list : []);
        setLoadError(false);
      })
      .catch(() => {
        if (mountedRef.current) setLoadError(true);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [communityID]);

  const renderMember = useCallback(
    ({ item }) => {
      const fullName =
        [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
        `משתמש #${item.userID}`;
      const isMe = item.userID === myId;
      const joined = formatJoinedAt(item.joinedAt);
      return (
        <View style={styles.row}>
          <MemberAvatar uri={buildImageUri(item.profileImage)} name={fullName} />
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName}
              {isMe ? <Text style={styles.youTag}> (את/ה)</Text> : null}
            </Text>
            {joined ? <Text style={styles.joined}>הצטרף/ה בתאריך {joined}</Text> : null}
          </View>
        </View>
      );
    },
    [myId],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={24} color={COLORS.brand} />
        </TouchableOpacity>

        <View style={styles.headerIcon}>
          <Ionicons name="people" size={20} color={COLORS.onBrand} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>
            {communityName || "משתתפי הקהילה"}
          </Text>
          <Text style={styles.headerSub}>{members.length} משתתפים</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.stateSub}>טוען משתתפים...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.stateBox}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="cloud-offline-outline" size={40} color={COLORS.brand} />
          </View>
          <Text style={styles.stateTitle}>לא ניתן לטעון את המשתתפים כרגע</Text>
          <Text style={styles.stateSub}>נסו שוב בעוד מספר דקות</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.userID)}
          renderItem={renderMember}
          initialNumToRender={15}
          removeClippedSubviews
          contentContainerStyle={
            members.length === 0 ? styles.emptyListContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.stateBox}>
              <View style={styles.stateIconCircle}>
                <Ionicons name="people-outline" size={40} color={COLORS.brand} />
              </View>
              <Text style={styles.stateTitle}>אין משתתפים בקהילה</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const SCREEN_BG = "#EDE7DD";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

  // ── Header ──
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1, alignItems: "flex-end" },
  headerName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  headerSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // ── List ──
  listContent: { paddingVertical: 6 },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: SCREEN_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  rowText: { flex: 1, alignItems: "flex-end" },
  name: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, textAlign: "right" },
  youTag: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  joined: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },

  // ── State boxes ──
  emptyListContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  stateBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  stateIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  stateTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, textAlign: "center" },
  stateSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
});

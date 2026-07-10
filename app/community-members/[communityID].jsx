import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { buildImageUri } from "../src/utils/image";
import { getCommunityMembers } from "../src/api/communityChatService";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

function formatJoinedAt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// צבעי אווטר פסטליים — צבע יציב לכל משתמש לפי שמו (מראה מודרני).
const AVATAR_COLORS = ["#F5D9E0", "#D9E7F5", "#D6F0E6", "#F5EAD3", "#E7DCF5", "#F5DAD6", "#DCEFF0"];
function avatarColor(name) {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

// אווטר עגול: תמונה, ואם אין — עיגול פסטלי עם ראשי-תיבות.
function MemberAvatar({ uri, name }) {
  const [failed, setFailed] = useState(false);
  const showImg = uri && !failed;
  if (showImg) {
    return (
      <View style={styles.avatar}>
        <Image
          source={{ uri }}
          style={styles.avatarImg}
          onError={() => setFailed(true)}
          accessibilityLabel={name ? `תמונת הפרופיל של ${name}` : "תמונת פרופיל"}
        />
      </View>
    );
  }
  const initials = (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
      {initials ? (
        <Text style={styles.avatarInitials}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={22} color="rgba(0,0,0,0.4)" />
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

  // המשתמש הנוכחי מוצג ראשון (כמו ב-WhatsApp).
  const sortedMembers = useMemo(() => {
    if (!myId) return members;
    const me = members.filter((m) => m.userID === myId);
    const others = members.filter((m) => m.userID !== myId);
    return [...me, ...others];
  }, [members, myId]);

  const renderMember = useCallback(
    ({ item }) => {
      const fullName =
        [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
        `משתמש #${item.userID}`;
      const isMe = item.userID === myId;
      const joined = formatJoinedAt(item.joinedAt);
      return (
        <View style={[styles.row, isMe && styles.rowMe]}>
          <MemberAvatar uri={buildImageUri(item.profileImage)} name={fullName} />
          <View style={styles.rowText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {fullName}
              </Text>
              {isMe ? (
                <View style={styles.youChip}>
                  <Text style={styles.youChipText}>את/ה</Text>
                </View>
              ) : null}
            </View>
            {joined ? <Text style={styles.joined}>הצטרפ/ה ב-{joined}</Text> : null}
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
          data={sortedMembers}
          keyExtractor={(item) => String(item.userID)}
          renderItem={renderMember}
          initialNumToRender={15}
          removeClippedSubviews
          contentContainerStyle={
            members.length === 0 ? styles.emptyListContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  listContent: { paddingVertical: 8 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginRight: 76, // מתחיל אחרי האווטר
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  rowMe: { backgroundColor: COLORS.brandLight },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarInitials: { fontSize: 17, fontFamily: FONTS.bold, color: "rgba(0,0,0,0.5)" },
  rowText: { flex: 1, alignItems: "flex-end", gap: 2 },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  name: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, textAlign: "right" },
  youChip: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  youChipText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.onBrand },
  joined: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "right",
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

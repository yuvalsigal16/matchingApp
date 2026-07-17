import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CloudOff, Users } from "lucide-react-native";

import { getCommunityMembers } from "../src/api/communityChatService";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";
import SectionLabel from "../../components/ui/SectionLabel";

function formatJoinedAt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// MemberRow — שורת משתתף (מקומית): אווטר + שם/תאריך-הצטרפות + צ'יפ "את/ה".
// מקומי מותר כי יש avatar + joined date + chip (ListRow לא מתאים).
function MemberRow({ member, isMe }) {
  const fullName =
    [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
    `משתמש #${member.userID}`;
  const joined = formatJoinedAt(member.joinedAt);

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <Avatar uri={member.profileImage} name={fullName} size="md" />
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
    ({ item }) => <MemberRow member={item} isMe={item.userID === myId} />,
    [myId],
  );

  return (
    <Screen>
      <ScreenHeader
        title={communityName || "משתתפי הקהילה"}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>טוען משתתפים...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <EmptyState
            Icon={CloudOff}
            title="לא ניתן לטעון את המשתתפים כרגע"
            subtitle="נסו שוב בעוד מספר דקות"
          />
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
          ListHeaderComponent={
            members.length > 0 ? (
              <SectionLabel
                title="משתתפים"
                count={members.length}
                style={styles.sectionLabel}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState Icon={Users} title="אין משתתפים בקהילה" />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: "center" },

  listContent: { paddingBottom: SPACING.xl },
  emptyListContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },

  sectionLabel: { paddingHorizontal: SPACING.xl, marginTop: SPACING.sm },

  // קו-הפרדה מתחיל אחרי האווטר (רשימה native): גוטר + אווטר(52) + gap.
  separator: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginRight: SPACING.xl + 52 + SPACING.md,
  },

  // ── שורת משתתף ──
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  rowMe: { backgroundColor: COLORS.brandLight },
  rowText: { flex: 1, alignItems: "flex-end", gap: SPACING.xs / 2 },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: SPACING.sm },
  name: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.semibold,
    color: COLORS.text,
    textAlign: "right",
  },
  youChip: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  youChipText: { ...TYPOGRAPHY.tiny, fontFamily: FONTS.bold, color: COLORS.onBrand },
  joined: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textAlign: "right" },
});

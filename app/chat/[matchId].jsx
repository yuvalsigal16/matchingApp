import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  getChatByMatchId,
  getMatchById,
  sendChatMessage,
  triggerMatching,
} from "../src/api/chatService";

import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

export default function ChatScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams();

  const currentUser = getUser();

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [matchingStatus, setMatchingStatus] = useState("none");

  const flatListRef = useRef(null);

  useEffect(() => {
    // אם המשתמש לא מחובר - להחזיר ל-Login במקום לקרוס.
    // יכול לקרות אם מישהו פותח קישור לצ'אט אחרי logout.
    if (!currentUser?.userID) {
      router.replace("/Login");
      return;
    }
    loadChat();
  }, []);

  const loadChat = async () => {
    try {
      const match = await getMatchById(matchId);
      const msgs = await getChatByMatchId(matchId);

      setMatchData(match);
      setMatchingStatus(match.matchingStatus || "none");
      setMessages(msgs);
    } catch (err) {
      Alert.alert("שגיאה", "טעינת הצ'אט נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      const saved = await sendChatMessage(
        matchId,
        messageText.trim(),
        currentUser?.userID
      );

      setMessages((prev) => [...prev, saved]);
      setMessageText("");

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    } catch (err) {
      Alert.alert("שגיאה", "לא ניתן לשלוח הודעה");
    }
  };

  const handleMatching = async () => {
    try {
      const data = await triggerMatching(matchId);

      setMatchingStatus(data.status);

      if (data.status === "matched") {
        Alert.alert(
          "🎉 It's a Match!",
          "הטיול המשותף נוצר בהצלחה",
          [
            {
              text: "המשך",
              onPress: () =>
                router.push({
                  pathname: "/matching/MatchingSuccess",
                  params: { matchId },
                }),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert("שגיאה", "הפעולה נכשלה");
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderID === currentUser?.userID;

    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isMine && { color: COLORS.onBrand },
          ]}
        >
          {item.text}
        </Text>
      </View>
    );
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

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.chatName}>
            {matchData?.otherUserName || "צ'אט"}
          </Text>
          <Text style={styles.tripName}>
            {matchData?.tripName || "טיול"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.matchBtn}
          onPress={handleMatching}
        >
          <Text style={styles.matchText}>
            {matchingStatus === "none"
              ? "יצירת התאמה"
              : matchingStatus === "pending"
              ? "ממתין"
              : "הותאמתם"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) =>
          item.messageID.toString()
        }
        renderItem={renderMessage}
        contentContainerStyle={
          messages.length === 0
            ? styles.emptyListContent
            : { padding: 16 }
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>אין עדיין הודעות</Text>
            <Text style={styles.emptySub}>
              שלחו הודעה ראשונה כדי לפתוח את השיחה ✈️
            </Text>
          </View>
        }
      />

      {/* INPUT */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inputContainer}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="כתוב הודעה..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            multiline
            textAlign="right"
          />

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!messageText.trim()}
            style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="שליחת הודעה"
          >
            <Ionicons name="send" size={18} color={COLORS.onBrand} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerCenter: {
    alignItems: "center",
  },

  chatName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },

  tripName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },

  matchBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  matchText: {
    color: COLORS.onBrand,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },

  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    maxWidth: "75%",
  },

  // הודעות שלי — ימין (RTL), בצבע המותג.
  myMessage: {
    backgroundColor: COLORS.brand,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },

  // הודעות הצד השני — שמאל, לבן.
  otherMessage: {
    backgroundColor: COLORS.surface,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },

  messageText: {
    color: COLORS.text,
    fontFamily: FONTS.regular,
    fontSize: 15,
    textAlign: "right",
  },

  // מצב ריק — אין הודעות עדיין.
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4,
  },

  inputContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
  },

  sendBtn: {
    backgroundColor: COLORS.brand,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  sendBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
});
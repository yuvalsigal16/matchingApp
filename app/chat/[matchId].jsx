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
import { FONTS } from "../src/theme/fonts";

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
        currentUser.userID
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
    const isMine = item.senderID === currentUser.userID;

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
            isMine && { color: "#fff" },
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
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
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
              ? "Matching"
              : matchingStatus === "pending"
              ? "ממתין"
              : "Matched"}
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
        contentContainerStyle={{ padding: 16 }}
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
            style={styles.input}
          />

          <TouchableOpacity
            onPress={sendMessage}
            style={styles.sendBtn}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fff",
  },

  headerCenter: {
    alignItems: "center",
  },

  chatName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  tripName: {
    fontSize: 12,
    color: "#777",
  },

  matchBtn: {
    backgroundColor: "#1A3C40",
    padding: 8,
    borderRadius: 20,
  },

  matchText: {
    color: "#fff",
    fontSize: 12,
  },

  messageBubble: {
    padding: 10,
    marginBottom: 8,
    borderRadius: 12,
    maxWidth: "75%",
  },

  myMessage: {
    backgroundColor: "#1A3C40",
    alignSelf: "flex-start",
  },

  otherMessage: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
  },

  messageText: {
    color: "#222",
  },

  inputContainer: {
    flexDirection: "row-reverse",
    padding: 10,
    backgroundColor: "#fff",
  },

  input: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 20,
    paddingHorizontal: 10,
  },

  sendBtn: {
    backgroundColor: "#1A3C40",
    padding: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
});
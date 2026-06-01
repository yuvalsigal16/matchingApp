import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../src/api/config";
import { sendChatRequest } from "../src/api/notificationService";
import { getUser } from "../src/auth/authStore";

// בונה URI מלא לתמונה (השרת עשוי להחזיר נתיב יחסי)
function buildImageUri(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

export default function MatchProfile() {
  const router = useRouter();

  const params = useLocalSearchParams();

  // הנתונים שמגיעים מהעמוד הקודם
  const user = JSON.parse(params.user);
  const imageUri = buildImageUri(user.profileImage);

  const [sending, setSending] = useState(false);

  // שליחת בקשת צ'אט למשתמש
  const handleSendRequest = async () => {
    const me = getUser();
    if (!me?.userID) {
      Alert.alert("שגיאה", "לא מחובר");
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      await sendChatRequest(me.userID, user.userID);
      Alert.alert("נשלח", "הבקשה נשלחה בהצלחה");
      router.back();
    } catch (err) {
      Alert.alert("שגיאה", err.message || "שליחת הבקשה נכשלה");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-forward"
            size={26}
            color="#1A3C40"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          פרופיל התאמה
        </Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* תמונת משתמש */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="person" size={90} color="#fff" />
          </View>
        )}

        {/* שם וגיל */}
        <Text style={styles.name}>
          {user.name}, {user.age}
        </Text>

        {/* אחוז התאמה */}
        <View style={styles.matchBox}>
          <Ionicons
            name="sparkles"
            size={20}
            color="#D4AF37"
          />

          <Text style={styles.matchText}>{user.matchScore}% התאמה</Text>
        </View>

        {/* תחומי עניין */}
        <Text style={styles.sectionTitle}>תחומי עניין</Text>

        <View style={styles.tagsContainer}>
          {user.interests && user.interests.length > 0 ? (
            user.interests.map((interest, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>לא הוגדרו תחומי עניין</Text>
          )}
        </View>

        {/* כפתורים */}
        <View style={styles.buttonsRow}>
          
          {/* שליחת בקשה */}
          <TouchableOpacity
            style={[styles.chatBtn, sending && { opacity: 0.6 }]}
            onPress={handleSendRequest}
            disabled={sending}
          >
            <Text style={styles.chatBtnText}>
              {sending ? "שולח..." : "שלח בקשה לצ׳אט"}
            </Text>
          </TouchableOpacity>

          {/* הסרה */}
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.removeBtnText}>
              הסר מההצעות
            </Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8EDEF",
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A3C40",
  },

  content: {
    alignItems: "center",
    paddingBottom: 40,
  },

  image: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginTop: 20,
  },

  imageFallback: {
    backgroundColor: "#7BBDBF",
    justifyContent: "center",
    alignItems: "center",
  },

  name: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 18,
    color: "#1A1A1A",
  },

  matchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginTop: 14,
  },

  matchText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A3C40",
  },

  sectionTitle: {
    alignSelf: "flex-end",
    marginTop: 30,
    marginBottom: 12,
    marginRight: 24,
    fontSize: 20,
    fontWeight: "700",
    color: "#1A3C40",
  },

  tagsContainer: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },

  tag: {
    backgroundColor: "#1A3C40",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  tagText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  emptyText: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
  },

  buttonsRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 40,
    width: "88%",
  },

  chatBtn: {
    flex: 1,
    backgroundColor: "#1A3C40",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  chatBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  removeBtn: {
    flex: 1,
    backgroundColor: "#F1F3F4",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  removeBtnText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "700",
  },
});
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function MatchProfile() {
  const router = useRouter();

  const params = useLocalSearchParams();

  // הנתונים שמגיעים מהעמוד הקודם
  const user = JSON.parse(params.user);

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
        <Image
          source={{ uri: user.image }}
          style={styles.image}
        />

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

          <Text style={styles.matchText}>
            {user.matchScore || user.similarityScore}% התאמה
          </Text>
        </View>

        {/* תחומי עניין */}
        <Text style={styles.sectionTitle}>
          תחומי עניין
        </Text>

        <View style={styles.tagsContainer}>
          {user.interests.map((interest, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>
                {interest}
              </Text>
            </View>
          ))}
        </View>

        {/* תיאור */}
        <Text style={styles.sectionTitle}>
          קצת עליי
        </Text>

        <Text style={styles.bio}>
          {user.bio ||
            "אוהב לטייל, להכיר אנשים חדשים ולחוות מקומות מיוחדים בעולם 🌍"}
        </Text>

        {/* כפתורים */}
        <View style={styles.buttonsRow}>
          
          {/* שליחת בקשה */}
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => alert("בקשה נשלחה")}
          >
            <Text style={styles.chatBtnText}>
              שלח בקשה לצ׳אט
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

  bio: {
    fontSize: 16,
    lineHeight: 28,
    color: "#444",
    textAlign: "center",
    paddingHorizontal: 28,
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
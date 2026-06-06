import React from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { FONTS } from "../src/theme/fonts";

export default function MatchingSuccess() {

  const router = useRouter();

  const { matchId } =
    useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>

      {/* אייקון */}
      <View style={styles.iconContainer}>
        <Ionicons
          name="heart"
          size={90}
          color="#fff"
        />
      </View>

      {/* כותרת */}
      <Text style={styles.title}>
        🎉 It's a Match!
      </Text>

      {/* תיאור */}
      <Text style={styles.subtitle}>
        החיבור ביניכם אושר בהצלחה
      </Text>

      <Text style={styles.description}>
        עכשיו אפשר להתחיל לתכנן
        את הטיול המשותף ✈️
      </Text>

      {/* כפתור מעבר */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() =>
          router.push({
            pathname:
              "/sharedTrip/[matchId]",
            params: { matchId },
          })
        }
      >
        <Text style={styles.primaryText}>
          מעבר לטיול המשותף
        </Text>
      </TouchableOpacity>

      {/* חזרה לצ'אט */}
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() =>
          router.replace(
            `/chat/${matchId}`
          )
        }
      >
        <Text style={styles.secondaryText}>
          חזרה לצ׳אט
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#2E8B57",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },

  title: {
    fontSize: 34,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    marginBottom: 14,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#2E8B57",
    marginBottom: 10,
    textAlign: "center",
  },

  description: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
    fontFamily: FONTS.regular,
  },

  primaryBtn: {
    width: "100%",
    backgroundColor: "#1A3C40",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },

  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  secondaryBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#1A3C40",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryText: {
    color: "#1A3C40",
    fontSize: 15,
    fontFamily: FONTS.bold,
  },

});
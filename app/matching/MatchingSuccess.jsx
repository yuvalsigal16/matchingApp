import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { getMatchById } from "../src/api/chatService";

import { COLORS, FONTS } from "../src/theme";

export default function MatchingSuccess() {
  const router = useRouter();

  const { matchId } =
    useLocalSearchParams();

  const [loading, setLoading] =
    useState(true);

  const [match, setMatch] =
    useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data =
        await getMatchById(
          matchId
        );

      setMatch(data);

    } catch (err) {
      console.log(err);

    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(
      date
    ).toLocaleDateString(
      "he-IL"
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.brand}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
      >

        {/* הצלחה */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="heart"
            size={90}
            color={COLORS.onBrand}
          />
        </View>

        <Text style={styles.title}>
          {"🎉 It's a Match!"}
        </Text>

        <Text style={styles.subtitle}>
          החיבור ביניכם אושר
        </Text>

        <Text style={styles.description}>
          עכשיו אפשר להתחיל
          לתכנן את הטיול יחד ✈️
        </Text>

        {/* פרטי טיול */}
        <View style={styles.infoCard}>

          <View style={styles.row}>
            <Text style={styles.value}>
              {
                match?.otherUserName
                || "לא ידוע"
              }
            </Text>

            <Text style={styles.label}>
              פרטנר
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.value}>
              {
                match?.tripName
                || "-"
              }
            </Text>

            <Text style={styles.label}>
              יעד
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.value}>
              {
                formatDate(
                  match?.tripStartDate
                )
              }
            </Text>

            <Text style={styles.label}>
              יציאה
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.value}>
              {
                formatDate(
                  match?.tripEndDate
                )
              }
            </Text>

            <Text style={styles.label}>
              חזרה
            </Text>
          </View>

        </View>

        {/* בית */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            router.replace(
              "/Home"
            )
          }
        >
          <Text style={styles.primaryText}>
            חזרה למסך הבית
          </Text>
        </TouchableOpacity>

        {/* צאט */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() =>
            router.replace({
              pathname:
                "/chat/[matchId]",
              params: {
                matchId,
              },
            })
          }
        >
          <Text style={styles.secondaryText}>
            חזרה לצ׳אט
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles =
StyleSheet.create({

container:{
flex:1,
backgroundColor:COLORS.background,
padding:24,
},

center:{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:COLORS.background,
},

iconContainer:{
alignSelf:"center",
width:150,
height:150,
borderRadius:75,
backgroundColor:COLORS.success,
justifyContent:"center",
alignItems:"center",
marginBottom:24,
},

title:{
fontSize:34,
textAlign:"center",
fontFamily:FONTS.bold,
color:COLORS.brand,
},

subtitle:{
fontSize:18,
textAlign:"center",
color:COLORS.success,
marginTop:8,
fontFamily:FONTS.bold,
},

description:{
textAlign:"center",
marginTop:12,
marginBottom:30,
fontFamily:FONTS.regular,
color:COLORS.textSecondary,
},

infoCard:{
backgroundColor:COLORS.surface,
padding:20,
borderRadius:18,
marginBottom:20,
},

row:{
flexDirection:"row-reverse",
justifyContent:"space-between",
marginBottom:14,
},

label:{
color:COLORS.textSecondary,
fontFamily:FONTS.regular,
},

value:{
fontFamily:FONTS.bold,
color:COLORS.text,
},

primaryBtn:{
backgroundColor:COLORS.brand,
padding:18,
borderRadius:18,
marginTop:20,
},

primaryText:{
color:COLORS.onBrand,
textAlign:"center",
fontFamily:FONTS.bold,
},

secondaryBtn:{
marginTop:12,
padding:18,
borderWidth:1,
borderColor:COLORS.brand,
borderRadius:18,
},

secondaryText:{
textAlign:"center",
fontFamily:FONTS.bold,
color:COLORS.brand,
},

});
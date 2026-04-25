import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../theme/fonts";

const WHEEL_SIZE = 300;
const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#1A3C40",
  "#A5C99E",
  "#E5A9A9",
  "#7FB3B3",
  "#F4A261",
];

const DESTINATIONS_POOL = [
  { name: "ניו יורק", partner: "אלון, 28", info: "אוהב קולינריה וחיי לילה" },
  { name: "טוקיו", partner: "מיה, 24", info: "חובבת אנימה ותרבות יפן" },
  { name: "פריז", partner: "נועה, 31", info: "צלמת, מחפשת פינות נסתרות" },
  { name: "לונדון", partner: "עידו, 27", info: "חובב היסטוריה וכדורגל" },
  { name: "תאילנד", partner: "איתי, 26", info: "מחפש בטן-גב וצלילות באיים" },
  { name: "רומא", partner: "יובל, 26", info: "חובבת איטלקית ופיצה" },
  { name: "ברלין", partner: "תומר, 29", info: "מחפש מסיבות טכנו ואמנות" },
  { name: "מדריד", partner: "דניאל, 25", info: "חובב כדורגל וטאפאס" },
];

export default function WheelScreen({ navigation }) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const [result, setResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDeg, setCurrentDeg] = useState(0);

  const numberOfSectors = DESTINATIONS_POOL.length; // תמיד יהיה 8
  const sectorAngle = 360 / numberOfSectors; // 45 מעלות בדיוק

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    const numberOfRounds = 10;
    const randomIndex = Math.floor(Math.random() * numberOfSectors);

    // חישוב לעצירה מדויקת במרכז הפלח שנבחר בראש הגלגל
    const targetDegree = 360 - randomIndex * sectorAngle - sectorAngle / 2;
    const totalRotation =
      currentDeg + numberOfRounds * 360 + targetDegree - (currentDeg % 360);

    Animated.timing(spinValue, {
      toValue: totalRotation,
      duration: 5000,
      easing: Easing.out(Easing.back(0.5)),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      setCurrentDeg(totalRotation);
      setResult(DESTINATIONS_POOL[randomIndex]);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backBtnText}>⬅ חזרה</Text>
      </TouchableOpacity>

      <Text style={styles.header}>לאן הגורל ייקח אותך?</Text>

      <View style={styles.wheelWrapper}>
        <View style={styles.pointer} />

        <Animated.View
          style={[
            styles.wheelContainer,
            {
              transform: [
                {
                  rotate: spinValue.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        >
          {DESTINATIONS_POOL.map((item, i) => (
            <View key={i} style={styles.sectorWrapper}>
              <View
                style={[
                  styles.sector,
                  {
                    backgroundColor: COLORS[i % COLORS.length],
                    transform: [{ rotate: `${i * sectorAngle}deg` }],
                  },
                ]}
              />
              <View
                style={[
                  styles.labelContainer,
                  {
                    transform: [
                      { rotate: `${i * sectorAngle + sectorAngle / 2}deg` },
                    ],
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sliceText,
                    { color: i === 2 ? "#1A3C40" : "#fff" },
                  ]}
                >
                  {item.name}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
        <View style={styles.centerDot} />
      </View>

      <View style={styles.bubbleArea}>
        {result && (
          <View style={styles.bubble}>
            <Text style={styles.bubbleTitle}>התאמה ב{result.name}!</Text>
            <View style={styles.bubbleRow}>
              <Text style={styles.bubbleContent}>
                <Text style={styles.bold}>{result.partner}</Text>
                {"\n"}
                {result.info}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.spinBtn}
          onPress={spinWheel}
          disabled={isSpinning}
        >
          <Text style={styles.btnText}>
            {isSpinning ? "מסתובב..." : "סובב אותי!"}
          </Text>
        </TouchableOpacity>

        {result && !isSpinning && (
          <TouchableOpacity
            style={[styles.spinBtn, styles.nextBtn]}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.btnText}>זה השותף שלי!</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0E7E9",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backBtn: { alignSelf: "flex-start", marginTop: 10 },
  backBtnText: {
    color: "#1A3C40",
    fontFamily: FONTS.bold,
    textDecorationLine: "underline",
  },
  header: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    marginVertical: 15,
  },
  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    borderWidth: 4,
    borderColor: "#1A3C40",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#fff",
  },
  sectorWrapper: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  sector: {
    position: "absolute",
    width: WHEEL_SIZE / 2,
    height: WHEEL_SIZE / 2,
    left: WHEEL_SIZE / 2,
    top: WHEEL_SIZE / 2,
    transformOrigin: "0% 0%",
  },
labelContainer: {
  position: 'absolute',
  width: WHEEL_SIZE,
  height: WHEEL_SIZE,
  left: 0,
  top: 0,
  justifyContent: 'center',
  alignItems: 'center',
},
  sliceText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    textAlign: "center",
    width: 80,
  },
  centerDot: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#1A3C40",
    zIndex: 10,
  },
  pointer: {
    position: "absolute",
    top: -15,
    zIndex: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 30,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF6B6B",
  },
  bubbleArea: {
    height: 130,
    justifyContent: "center",
    width: "100%",
    marginVertical: 15,
  },
  bubble: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 20,
    width: "90%",
    alignSelf: "center",
    elevation: 5,
  },
  bubbleTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#1A3C40",
    textAlign: "right",
    marginBottom: 5,
  },
  bubbleContent: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#444",
  },
  bold: { fontFamily: FONTS.bold, color: "#1A3C40" },
  footer: { width: "100%", alignItems: "center", gap: 10 },
  spinBtn: {
    backgroundColor: "#1A3C40",
    paddingVertical: 14,
    borderRadius: 25,
    width: "85%",
    alignItems: "center",
  },
  nextBtn: { backgroundColor: "#7FB3B3" },
  btnText: { color: "#fff", fontSize: 17, fontFamily: FONTS.bold },
});

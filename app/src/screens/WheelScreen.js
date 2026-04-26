import {
  ChevronRight,
  RotateCw,
  Sparkles,
  MapPin,
  User,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../theme/fonts";

const WHEEL_SIZE = 290;

// פלטה רכה ועקבית עם שפת העיצוב של האפליקציה
const COLORS = [
  "#1A3C40",
  "#7FB3B3",
  "#E5A9A9",
  "#F4C77B",
  "#A5C99E",
  "#B89BC9",
  "#FF8B8B",
  "#4ECDC4",
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
  const spinBtnScale = useRef(new Animated.Value(1)).current;
  const [result, setResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDeg, setCurrentDeg] = useState(0);

  const numberOfSectors = DESTINATIONS_POOL.length;
  const sectorAngle = 360 / numberOfSectors;

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    const numberOfRounds = 10;
    const randomIndex = Math.floor(Math.random() * numberOfSectors);

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

  const onSpinPressIn = () => {
    if (isSpinning) return;
    Animated.spring(spinBtnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };
  const onSpinPressOut = () => {
    Animated.spring(spinBtnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.5 },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ChevronRight size={26} color="#1A3C40" strokeWidth={2} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <View style={styles.headerTitleRow}>
            <Sparkles size={20} color="#1A3C40" strokeWidth={2} />
            <Text style={styles.headerTitle}>גלגל המזל</Text>
          </View>
          <Text style={styles.headerSubtitle}>לאן הגורל ייקח אותך?</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Wheel area */}
      <View style={styles.wheelArea}>
        <View style={styles.wheelWrapper}>
          <View style={styles.pointer} />
          <View style={styles.pointerShadow} />

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
                      {
                        color:
                          COLORS[i % COLORS.length] === "#F4C77B"
                            ? "#1A3C40"
                            : "#fff",
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>

          <View style={styles.centerHub}>
            <View style={styles.centerDot} />
          </View>
        </View>
      </View>

      {/* Result card */}
      <View style={styles.bubbleArea}>
        {result ? (
          <View style={styles.bubble}>
            <View style={styles.bubbleHeader}>
              <View style={styles.bubbleIconCircle}>
                <MapPin size={18} color="#fff" strokeWidth={2.2} />
              </View>
              <Text style={styles.bubbleTitle}>נוסעים ל{result.name}!</Text>
            </View>
            <View style={styles.bubbleDivider} />
            <View style={styles.bubblePartnerRow}>
              <User size={16} color="#1A3C40" strokeWidth={1.8} />
              <Text style={styles.bubblePartner}>{result.partner}</Text>
            </View>
            <Text style={styles.bubbleInfo}>{result.info}</Text>
          </View>
        ) : (
          <View style={styles.placeholderBubble}>
            <Text style={styles.placeholderText}>
              סובבי את הגלגל וגלי את היעד שלך
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Animated.View
          style={[
            styles.spinBtnWrapper,
            { transform: [{ scale: spinBtnScale }] },
          ]}
        >
          <Pressable
            style={[styles.spinBtn, isSpinning && styles.spinBtnDisabled]}
            onPress={spinWheel}
            onPressIn={onSpinPressIn}
            onPressOut={onSpinPressOut}
            disabled={isSpinning}
          >
            <RotateCw
              size={18}
              color="#fff"
              strokeWidth={2.2}
              style={isSpinning && { opacity: 0.7 }}
            />
            <Text style={styles.spinBtnText}>
              {isSpinning
                ? "מסתובב..."
                : result
                  ? "סובב שוב"
                  : "סובב את הגלגל"}
            </Text>
          </Pressable>
        </Animated.View>

        {result && !isSpinning ? (
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => navigation.replace("Home")}
          >
            <Text style={styles.confirmBtnText}>זה היעד שלי!</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.skipBtn,
            pressed && { opacity: 0.5 },
          ]}
          onPress={() => navigation.replace("Home")}
          disabled={isSpinning}
        >
          <Text style={styles.skipText}>דלגי בלי לבחור יעד</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8EDEF",
    paddingHorizontal: 18,
  },

  // ── Header ──
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    width: "100%",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW,
    shadowOpacity: 0.06,
  },
  headerSpacer: {
    width: 38,
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: "#1A3C40",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#7A8B8E",
    marginTop: 2,
  },

  // ── Wheel area ──
  wheelArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
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
    borderWidth: 6,
    borderColor: "#fff",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#fff",
    ...SHADOW,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
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
    position: "absolute",
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    left: 0,
    top: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  sliceText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    textAlign: "center",
    width: 80,
    paddingTop: 22,
  },
  centerHub: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    ...SHADOW,
  },
  centerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1A3C40",
  },
  pointer: {
    position: "absolute",
    top: -6,
    zIndex: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 26,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#1A3C40",
  },
  pointerShadow: {
    position: "absolute",
    top: -3,
    zIndex: 19,
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 28,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(0,0,0,0.1)",
  },

  // ── Bubble (result card) ──
  bubbleArea: {
    width: "100%",
    minHeight: 110,
    justifyContent: "center",
    marginVertical: 14,
  },
  bubble: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    width: "100%",
    ...SHADOW,
    shadowOpacity: 0.12,
  },
  bubbleHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  bubbleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1A3C40",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    color: "#1A3C40",
    textAlign: "right",
    flex: 1,
  },
  bubbleDivider: {
    height: 1,
    backgroundColor: "#EEF1F2",
    marginVertical: 10,
  },
  bubblePartnerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  bubblePartner: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: "#1A3C40",
  },
  bubbleInfo: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "right",
    color: "#5F6F72",
    lineHeight: 20,
  },
  placeholderBubble: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#9AABAD",
    textAlign: "center",
  },

  // ── Footer ──
  footer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 20,
    gap: 10,
  },
  spinBtnWrapper: {
    width: "100%",
  },
  spinBtn: {
    backgroundColor: "#1A3C40",
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...SHADOW,
    shadowOpacity: 0.2,
  },
  spinBtnDisabled: {
    backgroundColor: "#7FB3B3",
  },
  spinBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  confirmBtn: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1A3C40",
  },
  confirmBtnText: {
    color: "#1A3C40",
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    color: "#7A8B8E",
    fontSize: 14,
    fontFamily: FONTS.regular,
    textDecorationLine: "underline",
  },
});

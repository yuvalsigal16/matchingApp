import { Ionicons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, View } from "react-native";

import { COLORS } from "../app/src/theme";

// רקע צ'אט דמוי-וואטסאפ: דגם עדין של אייקוני טיולים. משותף לצ'אט האישי והקהילתי
// כדי שהמראה יהיה זהה בשניהם.
const DOODLES = [
  "airplane-outline", "earth-outline", "boat-outline", "bag-handle-outline",
  "map-outline", "compass-outline", "camera-outline", "umbrella-outline",
];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const DOODLE_GAP = 78;

export default function ChatBackground() {
  const cols = Math.ceil(SCREEN_W / DOODLE_GAP) + 1;
  const rows = Math.ceil(SCREEN_H / DOODLE_GAP) + 1;
  const icons = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) % DOODLES.length;
      icons.push(
        <Ionicons
          key={`${r}-${c}`}
          name={DOODLES[idx]}
          size={26}
          color={COLORS.brand}
          style={{
            position: "absolute",
            top: r * DOODLE_GAP + 12,
            left: c * DOODLE_GAP + (r % 2 ? DOODLE_GAP / 2 : 0),
            opacity: 0.05,
            transform: [{ rotate: (r + c) % 2 ? "-18deg" : "16deg" }],
          }}
        />,
      );
    }
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {icons}
    </View>
  );
}

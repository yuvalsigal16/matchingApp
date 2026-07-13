// Avatar — מקור אמת יחיד לתצוגת תמונת פרופיל באפליקציה.
// נופל בחן: תמונה → ראשי-תיבות על גוון-מותג רך → אייקון משתמש.
// מחליף את 6+ מימושי-האווטר הידניים (40/45/52/60/96/110) ברחבי האפליקציה.
import { Image } from "expo-image";
import { User } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS } from "../../app/src/theme";
import { buildImageUri } from "../../app/src/utils/image";

const SIZES = { sm: 40, md: 52, lg: 64, xl: 96 };

function initialsOf(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({
  uri,
  name,
  size = "md",
  onPress,
  ring = false,
  style,
  accessibilityLabel,
}) {
  const d = typeof size === "number" ? size : SIZES[size] || SIZES.md;
  const imageUri = buildImageUri(uri);
  const initials = initialsOf(name);

  const frame = [
    { width: d, height: d, borderRadius: d / 2 },
    ring && { borderWidth: 2, borderColor: COLORS.surface },
    style,
  ];

  const inner = imageUri ? (
    <Image
      source={{ uri: imageUri }}
      style={[styles.fill, { borderRadius: d / 2 }]}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View style={[styles.fill, styles.fallback, { borderRadius: d / 2 }]}>
      {initials ? (
        <Text style={[styles.initials, { fontSize: Math.round(d * 0.38) }]}>{initials}</Text>
      ) : (
        <User size={Math.round(d * 0.5)} color={COLORS.brand} strokeWidth={1.8} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || name || "פרופיל"}
        style={({ pressed }) => [frame, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      style={frame}
      accessibilityLabel={accessibilityLabel || name}
      accessible={!!(accessibilityLabel || name)}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%", overflow: "hidden" },
  fallback: {
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: { fontFamily: FONTS.semibold, color: COLORS.brand },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});

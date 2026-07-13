// Tappable — Pressable עם spring עדין בלחיצה (Reanimated).
// נותן "תחושת חיים" לבחירות (chips / tiles / segmented) בלי אפקט משחקי.
// מעטפת שקופה: לא משנה layout ולא סגנון — רק scale זעיר בלחיצה.
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN = { damping: 20, stiffness: 320, mass: 0.5 };
const PRESS_OUT = { damping: 15, stiffness: 220, mass: 0.6 };

export default function Tappable({ onPress, disabled, style, children, ...rest }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, PRESS_IN);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, PRESS_OUT);
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

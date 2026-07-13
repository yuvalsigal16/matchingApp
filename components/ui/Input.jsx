// Input — שדה קלט אחיד (RTL): רקע surface, גבול קו-שיער חם, פוקוס במותג,
// מצב שגיאה, וכפתור עין מובנה לסיסמאות. מחליף את שדות ה-pill הידניים
// שחזרו בכל מסכי הטופס (Login/Register/ForgotPassword/ChangePassword...).
import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../../app/src/theme";

export default function Input({
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  secure = false,
  keyboardType,
  autoCapitalize = "none",
  autoComplete,
  textContentType,
  accessibilityLabel,
  style,
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  const borderColor = error
    ? COLORS.danger
    : focused
      ? COLORS.brand
      : COLORS.hairline;

  return (
    <View style={style}>
      <View style={[styles.wrap, { borderColor }]}>
        {secure ? (
          <Pressable
            onPress={() => setShow((s) => !s)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={show ? "הסתרת סיסמה" : "הצגת סיסמה"}
          >
            {show ? (
              <EyeOff size={20} color={COLORS.textMuted} strokeWidth={2} />
            ) : (
              <Eye size={20} color={COLORS.textMuted} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur && onBlur(e);
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secure && !show}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCorrect={false}
          textAlign="right"
          accessibilityLabel={accessibilityLabel || placeholder}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    height: 54,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    height: "100%",
    paddingVertical: 0,
  },
  eye: { padding: 6, marginLeft: -2 },
  error: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.danger,
    textAlign: "right",
    marginTop: 6,
    marginRight: 6,
  },
});

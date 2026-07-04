import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONTS } from "../app/src/theme";

// תפריט נפתח בסגנון וואטסאפ — מלבן קטן עם אפשרויות, נפתח מתחת לכפתור 3 הנקודות.
// שימוש משותף בצ'אט האישי ובצ'אט הקהילתי כדי לשמור על אותו סגנון.
// props: visible, onClose, items = [{ label, onPress, destructive }]
export default function HeaderMenu({ visible, onClose, items }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* לחיצה מחוץ לתפריט סוגרת אותו */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.menu, { top: insets.top + 60 }]}>
          {items.map((item, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.item,
                i > 0 && styles.itemBorder,
                pressed && styles.itemPressed,
              ]}
              onPress={() => {
                onClose();
                if (item.onPress) item.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text style={[styles.itemText, item.destructive && styles.itemTextDanger]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  menu: {
    position: "absolute",
    left: 4,
    minWidth: 190,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  item: { paddingVertical: 13, paddingHorizontal: 18 },
  itemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  itemPressed: { backgroundColor: COLORS.background },
  itemText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },
  itemTextDanger: { color: COLORS.danger },
});

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addTask,
  deleteTask,
  getTripTasks,
  setTaskDone,
} from "../src/api/todoService";
import { getUser } from "../src/auth/authStore";
import { COLORS, FONTS } from "../src/theme";

export default function TripToDoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams();
  const myId = getUser()?.userID;

  const [tasks, setTasks] = useState([]); // רק המשימות שלי לטיול הזה
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // מעקב אחרי גובה המקלדת — כדי שחלון ההוספה יעלה איתה (עובד גם ב-iOS וגם ב-Android).
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKbHeight(e.endCoordinates?.height || 0),
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const all = await getTripTasks(id);
      // אישית: מציגים רק את המשימות שהמשתמש הנוכחי הוסיף לטיול הזה.
      const mine = (all || []).filter((t) => String(t.userID) === String(myId));
      if (mountedRef.current) {
        setTasks(mine);
        setLoadError(false);
      }
    } catch {
      if (mountedRef.current) setLoadError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, myId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const doneCount = tasks.filter((t) => t.isDone).length;
  const total = tasks.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const handleAdd = async () => {
    const content = text.trim();
    if (!content || adding || !myId) return;

    setModalVisible(false);
    setAdding(true);
    setText("");

    // עדכון אופטימי
    const tempId = `temp-${Date.now()}`;
    const optimistic = { taskID: tempId, taskText: content, isDone: false, userID: myId };
    setTasks((prev) => [...prev, optimistic]);

    try {
      const newId = await addTask(id, myId, content);
      if (mountedRef.current && newId) {
        setTasks((prev) =>
          prev.map((t) => (t.taskID === tempId ? { ...t, taskID: newId } : t)),
        );
      }
    } catch {
      if (mountedRef.current) {
        setTasks((prev) => prev.filter((t) => t.taskID !== tempId));
        setText(content);
        Alert.alert("שגיאה", "לא ניתן להוסיף את המשימה. נסו שוב.");
      }
    } finally {
      if (mountedRef.current) setAdding(false);
    }
  };

  const toggleDone = async (task) => {
    if (String(task.taskID).startsWith("temp-")) return; // עדיין נשמר בשרת
    const next = !task.isDone;
    setTasks((prev) =>
      prev.map((t) => (t.taskID === task.taskID ? { ...t, isDone: next } : t)),
    );
    try {
      await setTaskDone(task.taskID, next);
    } catch {
      // החזרת המצב הקודם בכשל
      setTasks((prev) =>
        prev.map((t) => (t.taskID === task.taskID ? { ...t, isDone: !next } : t)),
      );
    }
  };

  const confirmDelete = (task) => {
    if (String(task.taskID).startsWith("temp-")) return;
    Alert.alert("מחיקת משימה", `למחוק את "${task.taskText}"?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          const prev = tasks;
          setTasks((cur) => cur.filter((t) => t.taskID !== task.taskID));
          try {
            await deleteTask(task.taskID);
          } catch {
            setTasks(prev); // שחזור בכשל
            Alert.alert("שגיאה", "מחיקת המשימה נכשלה.");
          }
        },
      },
    ]);
  };

  const renderTask = ({ item }) => (
    <TouchableOpacity
      style={styles.taskCard}
      activeOpacity={0.8}
      onPress={() => toggleDone(item)}
      onLongPress={() => confirmDelete(item)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.isDone }}
      accessibilityLabel={item.taskText}
    >
      <Text
        style={[styles.taskText, item.isDone && styles.taskTextDone]}
        numberOfLines={2}
      >
        {item.taskText}
      </Text>
      <View style={[styles.checkbox, item.isDone && styles.checkboxDone]}>
        {item.isDone ? <Ionicons name="checkmark" size={16} color={COLORS.onBrand} /> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={26} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.bigTitle} numberOfLines={1}>
          {name || "הטיול שלי"}
        </Text>
        <View style={styles.subtitleRow}>
          <Ionicons name="checkmark-done" size={15} color={COLORS.coral} />
          <Text style={styles.subtitle}>רשימת משימות</Text>
        </View>
      </View>

      <View style={styles.flex}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.stateSub}>טוען משימות...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.stateBox}>
            <View style={styles.stateIcon}>
              <Ionicons name="cloud-offline-outline" size={38} color={COLORS.brand} />
            </View>
            <Text style={styles.stateTitle}>לא ניתן לטעון משימות כרגע</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>נסו שוב</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => String(item.taskID)}
            renderItem={renderTask}
            contentContainerStyle={
              tasks.length === 0 ? styles.emptyContent : styles.listContent
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              total > 0 ? (
                <View style={styles.progressCard}>
                  <View style={styles.progressTopRow}>
                    <Text style={styles.progressLabel}>
                      {doneCount} מתוך {total} הושלמו
                    </Text>
                    <Text style={styles.progressPct}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.stateBox}>
                <View style={styles.stateIcon}>
                  <Ionicons name="checkmark-done-outline" size={38} color={COLORS.brand} />
                </View>
                <Text style={styles.stateTitle}>אין עדיין משימות</Text>
                <Text style={styles.stateSub}>
                  הוסיפו למטה משימות שתרצו לזכור לקראת הטיול
                </Text>
              </View>
            }
          />
        )}

      </View>

      {/* כפתור הוספה — עוגן תחתון קבוע */}
      <View style={[styles.addDock, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setText("");
            setModalVisible(true);
          }}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="הוספת משימה"
        >
          <Ionicons name="add" size={22} color={COLORS.onBrand} />
          <Text style={styles.addBtnText}>הוספת משימה</Text>
        </TouchableOpacity>
      </View>

      {/* Modal — משימה חדשה (bottom sheet) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: kbHeight > 0 ? kbHeight + 36 : insets.bottom + 20 },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>משימה חדשה</Text>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="לדוגמה: להזמין טיסות"
              placeholderTextColor={COLORS.textMuted}
              style={styles.sheetInput}
              textAlign="right"
              autoFocus
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.sheetBtn, (!text.trim() || adding) && styles.sheetBtnDisabled]}
              onPress={handleAdd}
              disabled={!text.trim() || adding}
              activeOpacity={0.85}
            >
              {adding ? (
                <ActivityIndicator color={COLORS.onBrand} size="small" />
              ) : (
                <Text style={styles.sheetBtnText}>הוספה</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    alignItems: "flex-end",
  },
  bigTitle: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text, textAlign: "right" },
  subtitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary },

  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  // ── Progress ──
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  progressPct: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.brand },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.divider,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },

  // ── Task card ──
  taskCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: "right",
  },
  taskTextDone: {
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxDone: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },

  // ── States ──
  stateBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  stateIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  stateTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, textAlign: "center" },
  stateSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: COLORS.onBrand, fontFamily: FONTS.bold, fontSize: 14 },

  // ── Add button (docked) ──
  addDock: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  addBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.brand,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: COLORS.onBrand, fontSize: 16, fontFamily: FONTS.bold },

  // ── Add modal (bottom sheet) ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.brand,
    textAlign: "right",
    marginBottom: 16,
  },
  sheetInput: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  sheetBtnDisabled: { backgroundColor: COLORS.textMuted },
  sheetBtnText: { color: COLORS.onBrand, fontSize: 16, fontFamily: FONTS.bold },
});

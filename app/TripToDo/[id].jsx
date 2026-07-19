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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ClipboardList, CloudOff, ListChecks, Plus } from "lucide-react-native";

import {
  addTask,
  deleteTask,
  getTripTasks,
  setTaskDone,
} from "../src/api/todoService";
import { getUser } from "../src/auth/authStore";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../src/theme";
import Screen from "../../components/ui/Screen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Snackbar from "../../components/Snackbar";

// TaskRow — שורת משימה (מקומית): תיבת-סימון + כותרת עם קו-חוצה בהשלמה,
// לחיצה = סימון, לחיצה-ארוכה = מחיקה. ListRow לא מתאים (אין checkbox/קו-חוצה/long-press).
function TaskRow({ task, onToggle, onDelete }) {
  const done = task.isDone;
  return (
    <TouchableOpacity
      style={styles.taskCard}
      activeOpacity={0.8}
      onPress={() => onToggle(task)}
      onLongPress={() => onDelete(task)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={task.taskText}
    >
      <Text style={[styles.taskText, done && styles.taskTextDone]} numberOfLines={2}>
        {task.taskText}
      </Text>
      <View style={[styles.checkbox, done && styles.checkboxDone]}>
        {done ? <Check size={16} color={COLORS.onBrand} strokeWidth={3} /> : null}
      </View>
    </TouchableOpacity>
  );
}

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
  const [snack, setSnack] = useState(""); // משוב הצלחה קצר
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

  // תצוגה בלבד: פעילות תחילה, הושלמו בסוף — בלי לשנות את מערך ה-state/הסדר בשרת.
  const activeTasks = tasks.filter((t) => !t.isDone);
  const doneTasks = tasks.filter((t) => t.isDone);
  const displayTasks = [...activeTasks, ...doneTasks];

  const doneCount = doneTasks.length;
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
      if (mountedRef.current) setSnack("המשימה נוספה");
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
        text: "כן, למחוק",
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
    <TaskRow task={item} onToggle={toggleDone} onDelete={confirmDelete} />
  );

  const openAdd = () => {
    setText("");
    setModalVisible(true);
  };

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScreenHeader title={name || "הטיול שלי"} onBack={() => router.back()} />

      {/* חיווי רשימת-משימות — brand במקום קורל */}
      <View style={styles.lead}>
        <ListChecks size={15} color={COLORS.brand} strokeWidth={2} />
        <Text style={styles.leadText}>רשימת משימות</Text>
      </View>

      <View style={styles.flex}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.loadingText}>טוען משימות...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.stateWrap}>
            <EmptyState
              Icon={CloudOff}
              title="לא ניתן לטעון משימות כרגע"
              subtitle="בדקו את החיבור ונסו שוב."
              actionLabel="נסו שוב"
              onAction={load}
            />
          </View>
        ) : (
          <FlatList
            data={displayTasks}
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
              <EmptyState
                Icon={ClipboardList}
                title="אין עדיין משימות"
                subtitle="כאן תרכזו כל מה שצריך להכין לקראת הטיול המשותף"
                actionLabel="הוספת משימה ראשונה"
                onAction={openAdd}
              />
            }
          />
        )}
      </View>

      {/* כפתור הוספה — עוגן תחתון קבוע */}
      <View style={[styles.addDock, { paddingBottom: insets.bottom + 10 }]}>
        <Button
          label="הוספת משימה"
          Icon={Plus}
          onPress={openAdd}
          size="lg"
          style={styles.dockBtn}
          accessibilityLabel="הוספת משימה"
        />
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

            <Input
              value={text}
              onChangeText={setText}
              placeholder="לדוגמה: להזמין טיסות"
              autoFocus
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              accessibilityLabel="תיאור המשימה"
            />

            <Button
              label="הוספה"
              onPress={handleAdd}
              loading={adding}
              disabled={!text.trim() || adding}
              size="lg"
              style={styles.sheetBtn}
            />
          </View>
        </View>
      </Modal>

      <Snackbar text={snack} onHide={() => setSnack("")} bottom={insets.bottom + 84} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  lead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  leadText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: "center" },
  stateWrap: { flex: 1, justifyContent: "center" },

  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xl,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── התקדמות ──
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  progressTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  progressLabel: { ...TYPOGRAPHY.bodyBold, color: COLORS.text },
  progressPct: { ...TYPOGRAPHY.bodyBold, color: COLORS.brand },
  progressTrack: {
    height: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.divider,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.brand,
  },

  // ── שורת משימה ──
  taskCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  taskText: { ...TYPOGRAPHY.body, flex: 1, color: COLORS.text, textAlign: "right" },
  taskTextDone: {
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxDone: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },

  // ── כפתור הוספה נעוץ ──
  addDock: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
  },
  dockBtn: { ...SHADOWS.md },

  // ── חלון הוספה (bottom sheet) ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.scrim,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  sheetTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: "right",
    marginBottom: SPACING.lg,
  },
  sheetBtn: { marginTop: SPACING.lg },
});

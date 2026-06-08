import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, Plus, Users } from "lucide-react-native";

import { BASE_URL } from "../src/api/config";
import { getToken, getUser } from "../src/auth/authStore";
import { FONTS } from "../src/theme/fonts";
import BottomNav from "../../components/BottomNav";

const ICON_COLORS = [
  { bg: "#DCFCE7", icon: "#16A34A" },
  { bg: "#DBEAFE", icon: "#2563EB" },
  { bg: "#FCE7F3", icon: "#DB2777" },
  { bg: "#FEF3C7", icon: "#D97706" },
  { bg: "#EDE9FE", icon: "#7C3AED" },
  { bg: "#FFE4E6", icon: "#E11D48" },
];

export default function CommunityScreen() {
  const router = useRouter();
  const user = getUser();
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState({});

  // מצב מודל יצירת קהילה
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/Community`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCommunities(data || []);
      }
    } catch (err) {
      console.error("loadCommunities:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      if (Platform.OS === "web") {
        window.alert("נא להזין שם קהילה");
      } else {
        Alert.alert("שגיאה", "נא להזין שם קהילה");
      }
      return;
    }
    setCreating(true);
    try {
      const token = getToken();
      const user = getUser();
      const res = await fetch(`${BASE_URL}/Community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          communityName: newName.trim(),
          description: newDesc.trim(),
          createdByUserID: user?.userID,
        }),
      });
      if (res.ok) {
        setCreateVisible(false);
        setNewName("");
        setNewDesc("");
        loadCommunities();
      } else {
        const err = await res.text();
        if (Platform.OS === "web") {
          window.alert("לא הצלחנו ליצור את הקהילה");
        } else {
          Alert.alert("שגיאה", "לא הצלחנו ליצור את הקהילה");
        }
      }
    } catch (err) {
      if (Platform.OS === "web") {
        window.alert("בעיית תקשורת. נסה שוב.");
      } else {
        Alert.alert("שגיאה", "בעיית תקשורת. נסה שוב.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (communityId) => {
    setJoining((prev) => ({ ...prev, [communityId]: true }));
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/Community/${communityId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.communityID === communityId
              ? { ...c, isJoined: true, membersCount: (c.membersCount || 0) + 1 }
              : c
          )
        );
      } else {
        Alert.alert("שגיאה", "לא הצלחנו להצטרף לקהילה. נסה שוב.");
      }
    } catch (err) {
      Alert.alert("שגיאה", "בעיית תקשורת. נסה שוב.");
    } finally {
      setJoining((prev) => ({ ...prev, [communityId]: false }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronRight size={22} color="#1A3C40" />
        </TouchableOpacity>
        <Text style={styles.title}>קהילות</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.subtitle}>בחר קהילה להצטרף אליה</Text>

      {/* כפתור הוספה מעל הרשימה */}
      <View style={styles.addRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setCreateVisible(true)}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {communities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Users size={40} color="#ccc" strokeWidth={1.5} />
            <Text style={styles.emptyText}>אין קהילות עדיין</Text>
          </View>
        ) : (
          communities.map((c, index) => {
            const color = ICON_COLORS[index % ICON_COLORS.length];
            const isJoining = joining[c.communityID];
            const isJoined = c.isJoined;

            return (
              <View key={c.communityID} style={styles.card}>
                {/* כפתור הצטרף */}
                <TouchableOpacity
                  style={[styles.joinBtn, isJoined && styles.joinBtnDone]}
                  onPress={() => !isJoined && handleJoin(c.communityID)}
                  disabled={isJoining || isJoined}
                  activeOpacity={0.8}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.joinText}>
                      {isJoined ? "חבר" : "הצטרף"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* פרטי קהילה */}
                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{c.communityName}</Text>
                  <Text style={styles.cardMembers}>
                    {(c.membersCount || 0).toLocaleString()} חברים
                  </Text>
                </View>

                {/* אייקון */}
                <View style={[styles.iconBox, { backgroundColor: color.bg }]}>
                  <Users size={22} color={color.icon} strokeWidth={2} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="discovery" />

      {/* מודל יצירת קהילה */}
      <Modal
        visible={createVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCreateVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>יצירת קהילה חדשה</Text>

            <Text style={styles.fieldLabel}>שם הקהילה *</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה: טיולים בדרום אמריקה"
              placeholderTextColor="#bbb"
              value={newName}
              onChangeText={setNewName}
              textAlign="right"
              maxLength={60}
            />

            <Text style={styles.fieldLabel}>תיאור</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="ספרי על הקהילה..."
              placeholderTextColor="#bbb"
              value={newDesc}
              onChangeText={setNewDesc}
              textAlign="right"
              multiline
              maxLength={200}
            />

            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createBtnText}>צרי קהילה</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCreateVisible(false)}
            >
              <Text style={styles.cancelText}>ביטול</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
  },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A3C40",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },

  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#1A3C40",
    textAlign: "center",
    marginBottom: 20,
  },

  fieldLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: "#555",
    textAlign: "right",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#1A1A1A",
    marginBottom: 14,
    textAlign: "right",
  },

  inputMulti: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  createBtn: {
    backgroundColor: "#1A3C40",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  createBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },

  cancelText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#888",
  },

  addRow: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 6,
    alignItems: "flex-start",
  },

  title: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: "#1A1A1A",
  },

  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#888",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 2,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  cardText: {
    flex: 1,
    alignItems: "flex-end",
    paddingHorizontal: 14,
  },

  cardName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#1A1A1A",
    textAlign: "right",
    marginBottom: 4,
  },

  cardMembers: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#999",
    textAlign: "right",
  },

  joinBtn: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },

  joinBtnDone: {
    backgroundColor: "#6B7280",
  },

  joinText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  emptyBox: {
    marginTop: 80,
    alignItems: "center",
    gap: 12,
  },

  emptyText: {
    fontSize: 16,
    color: "#888",
    fontFamily: FONTS.regular,
  },
});

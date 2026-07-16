import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { Ban, FileText, Info, Lock, ShieldCheck, Trash2 } from "lucide-react-native";

import { SPACING } from "./src/theme";
import Screen from "../components/ui/Screen";
import ScreenHeader from "../components/ui/ScreenHeader";
import ListRow from "../components/ui/ListRow";

// מסך הגדרות חשבון. רשימת שורות ניווט; כל אחת מובילה למסך משלה.
export default function SettingsScreen() {
  const router = useRouter();

  const items = [
    { title: "שינוי סיסמה", Icon: Lock, route: "/ChangePassword" },
    { title: "משתמשים חסומים", Icon: Ban, route: "/BlockedUsers" },
    { title: "תנאי שימוש", Icon: FileText, route: "/TermsOfService" },
    { title: "מדיניות פרטיות", Icon: ShieldCheck, route: "/PrivacyPolicy" },
    { title: "אודות האפליקציה", Icon: Info, route: "/About" },
    { title: "מחיקת חשבון", Icon: Trash2, route: "/DeleteAccount", danger: true },
  ];

  return (
    <Screen>
      <ScreenHeader title="הגדרות" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <ListRow
            key={item.route}
            Icon={item.Icon}
            title={item.title}
            danger={item.danger}
            onPress={() => router.push(item.route)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.sm,
  },
});

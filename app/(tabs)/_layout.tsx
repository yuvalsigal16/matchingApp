import { Stack } from "expo-router";
//כל המסכים בתיקייה הזו יתנהגו כמו ערימה של מסכים
//אפשר לעבור קדימה ואחורה - כל מסך נפתח מעל הקודם
export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 220,
      }}
    />
  );
}

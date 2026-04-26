import { Stack } from "expo-router";
//כל המסכים בתיקייה הזו יתנהגו כמו ערימה של מסכים
//אפשר לעבור קדימה ואחורה - כל מסך נפתח מעל הקודם
export default function QuizLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 280,
      }}
    />
  );
}

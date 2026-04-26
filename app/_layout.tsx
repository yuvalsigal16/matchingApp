import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/heebo";
import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
    Heebo_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#1A3C40" }} />;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 280,
        }}
      >
        <Stack.Screen
          name="SplashScreen"
          options={{ animation: "fade", animationDuration: 500 }}
        />
        <Stack.Screen name="index" options={{ animation: "fade" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

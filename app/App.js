import {
  Heebo_400Regular,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/heebo";
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import PreferencesQuizScreen from './src/screens/PreferencesQuizScreen';
import QuizScreen from './src/screens/QuizScreen';
import QuizStartScreen from './src/screens/QuizStartScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SplashScreen from './src/screens/SplashScreen';
import WheelScreen from './src/screens/WheelScreen';

const Stack = createStackNavigator();
export default function App() {
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_700Bold,
    Heebo_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            opacity: current.progress,
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width * 0.08, 0],
                }),
              },
            ],
          },
        }),
        transitionSpec: {
          open:  { animation: "timing", config: { duration: 320 } },
          close: { animation: "timing", config: { duration: 280 } },
        },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="QuizStart" component={QuizStartScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="PreferencesQuiz" component={PreferencesQuizScreen} />
      <Stack.Screen name="Wheel" component={WheelScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

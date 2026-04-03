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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
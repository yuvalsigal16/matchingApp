import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

// ייבוא המסכים
import LoginScreen from './src/screens/LoginScreen';
import QuizStartScreen from './src/screens/QuizStartScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const Stack = createStackNavigator();

export default function App() {
  // הסרנו את ה-NavigationContainer כי Expo Router כבר מספק אחד ב-_layout
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="QuizStart" component={QuizStartScreen} />
    </Stack.Navigator>
  );
}
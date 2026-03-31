import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import QuizStartScreen from './src/screens/QuizStartScreen';

const Stack = createStackNavigator();

//test1
export default function App() {
  return (
    <NavigationContainer independent={true}> 
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="QuizStart" component={QuizStartScreen} />
      </Stack.Navigator>
     </NavigationContainer>
  );
} 
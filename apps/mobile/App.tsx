import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WmsScannerScreen from './src/screens/WmsScannerScreen';
import PosScreen from './src/screens/PosScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Scanner" component={WmsScannerScreen} />
        <Stack.Screen name="Pos" component={PosScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WmsScannerScreen from './src/screens/WmsScannerScreen';
import PosScreen from './src/screens/PosScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import { getAccessToken } from './src/lib/session';
import { PAGE_BG, PRIMARY } from './src/config/env';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Scanner: undefined;
  Pos: undefined;
  Player: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    getAccessToken().then((token) => {
      if (token) setInitialRoute('Dashboard');
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} />
      <Stack.Screen name="Scanner" component={WmsScannerScreen} />
      <Stack.Screen name="Pos" component={PosScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAGE_BG },
});

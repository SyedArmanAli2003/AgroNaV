// What it does: React Native app entry point with navigation
// Input: App launch
// Output: Navigation container with 4 screens
// Called by: Expo

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './screens/DashboardScreen';
import VisitScreen from './screens/VisitScreen';
import AlertsScreen from './screens/AlertsScreen';
import OutcomesScreen from './screens/OutcomesScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: { backgroundColor: '#1D9E75' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'AgroNav' }} />
        <Stack.Screen name="Visit" component={VisitScreen} options={{ title: 'Visit Details' }} />
        <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
        <Stack.Screen name="Outcomes" component={OutcomesScreen} options={{ title: 'Outcomes' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// What it does: React Native app entry point with navigation
// Input: App launch
// Output: Navigation container — starts at Login, then 4 app screens
// Called by: Expo

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import VisitScreen from './screens/VisitScreen';
import AlertsScreen from './screens/AlertsScreen';
import OutcomesScreen from './screens/OutcomesScreen';
import { api } from './services/api';

const Stack = createNativeStackNavigator();

// Logout button rendered in the Dashboard header
function LogoutButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={async () => {
        await api.logout();
        navigation.replace('Login');
      }}
    >
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Logout</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#1D9E75' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={({ navigation }) => ({
            title: 'AgroNav',
            headerBackVisible: false,
            headerRight: () => <LogoutButton navigation={navigation} />,
          })}
        />
        <Stack.Screen name="Visit" component={VisitScreen} options={{ title: 'Visit Details' }} />
        <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
        <Stack.Screen name="Outcomes" component={OutcomesScreen} options={{ title: 'Outcomes' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

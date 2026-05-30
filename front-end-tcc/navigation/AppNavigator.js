import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../src/hooks/useAuth';
import AuthNavigator from './auth/AuthNavigator';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ProfileScreen from '../src/screens/ProfileScreen';
import AccountSettingsScreen from '../src/screens/AccountSettingsScreen';
import AppInformationScreen from '../src/screens/AppInformationScreen';
import SupportCenterScreen from '../src/screens/SupportCenterScreen';
import RewardsScreen from '../src/screens/RewardsScreen';
import RewardDetailsScreen from '../src/screens/RewardDetailsScreen';
import CouponsScreen from '../src/screens/CouponsScreen';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const AppStack = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#F4F7F5' },
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Scanner" component={ScannerScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Rewards" component={RewardsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    <Stack.Screen name="AppInformation" component={AppInformationScreen} />
    <Stack.Screen name="SupportCenter" component={SupportCenterScreen} />
    <Stack.Screen name="RewardDetails" component={RewardDetailsScreen} />
    <Stack.Screen name="Coupons" component={CouponsScreen} />
  </Stack.Navigator>
);

export default function AppNavigator() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return authenticated ? <AppStack /> : <AuthNavigator />;
}

import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';
import { isAdminUser } from '../utils/userRole';
import AuthNavigator from './auth/AuthNavigator';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScannerScreen from '../screens/ScannerScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import AppInformationScreen from '../screens/AppInformationScreen';
import SupportCenterScreen from '../screens/SupportCenterScreen';
import RewardsScreen from '../screens/RewardsScreen';
import RewardDetailsScreen from '../screens/RewardDetailsScreen';
import CouponsScreen from '../screens/CouponsScreen';
import { Alert, View, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const AdminProtectedScreen = ({ authenticatedUser, ...props }) => {
  const hasAdminAccess = isAdminUser(authenticatedUser);

  useEffect(() => {
    if (hasAdminAccess) return;

    Alert.alert('Acesso restrito', 'Acesso restrito a administradores.');
    props.navigation.replace('Home');
  }, [hasAdminAccess, props.navigation]);

  if (!hasAdminAccess) return <LoadingScreen />;

  return <AdminDashboardScreen {...props} />;
};

const AppStack = ({ authenticatedUser, initialRouteName }) => (
  <Stack.Navigator
    initialRouteName={initialRouteName}
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
    <Stack.Screen name="AdminDashboard">
      {(props) => <AdminProtectedScreen {...props} authenticatedUser={authenticatedUser} />}
    </Stack.Screen>
  </Stack.Navigator>
);

const AuthenticatedNavigator = () => {
  const { user: storedUser } = useAuth();
  const { user, loading, error } = useUser();

  if (loading) return <LoadingScreen />;

  const authenticatedUser = user ?? storedUser;
  const initialRouteName = !error && isAdminUser(user) ? 'AdminDashboard' : 'Home';

  return <AppStack authenticatedUser={error ? null : authenticatedUser} initialRouteName={initialRouteName} />;
};

export default function AppNavigator() {
  const { authenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return authenticated ? <AuthenticatedNavigator /> : <AuthNavigator />;
}

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
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

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F4F7F5' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
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
}

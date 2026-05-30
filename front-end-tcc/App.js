import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { colors } from './theme/colors';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <AppNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
}

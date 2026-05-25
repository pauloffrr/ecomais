import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { AntDesign } from '@expo/vector-icons';
import { Lock, Mail } from 'lucide-react-native';
import EcoBackground from '../components/EcoBackground';
import InputField from '../components/InputField';
import LogoMark from '../components/LogoMark';
import PrimaryButton from '../components/PrimaryButton';
import SocialButton from '../components/SocialButton';
import { colors } from '../theme/colors';
import { loginWithEmail, loginWithGoogleMock } from '../services/mockAuth';

WebBrowser.maybeCompleteAuthSession();

const googleConfig = Constants.expoConfig?.extra?.googleAuth ?? {};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('demo@eco.com');
  const [password, setPassword] = useState('123456');
  const [submitted, setSubmitted] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: googleConfig.expoClientId,
    iosClientId: googleConfig.iosClientId,
    androidClientId: googleConfig.androidClientId,
    webClientId: googleConfig.webClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      loginWithGoogleMock();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  }, [navigation, response]);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Use um e-mail válido.';
    if (!password) nextErrors.password = 'Informe sua senha.';

    return nextErrors;
  }, [email, password]);

  const handleGoogleLogin = () => {
    if (!request) {
      Alert.alert('Aguarde', 'O login Google ainda está sendo preparado.');
      return;
    }

    if (String(googleConfig.expoClientId).startsWith('COLOQUE_SEU')) {
      Alert.alert(
        'Configure o Google',
        'Adicione seus client IDs em app.json para ativar o login real com Google.'
      );
      return;
    }

    promptAsync();
  };

  const handleEmailLogin = () => {
    setSubmitted(true);

    if (Object.keys(errors).length > 0) return;

    const user = loginWithEmail(email, password);

    if (!user) {
      Alert.alert(
        'Login não encontrado',
        'Use demo@eco.com com senha 123456 ou crie uma nova conta.'
      );
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const fieldError = (name) => (submitted ? errors[name] : undefined);

  return (
    <SafeAreaView style={styles.safe}>
      <EcoBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <View style={styles.header}>
              <LogoMark />
              <Text style={styles.subtitle}>
                Aprimorando seu estilo de vida sustentável por meio da reciclagem inteligente.
              </Text>
            </View>

            <View style={styles.actions}>
              <SocialButton
                title="Continue with Google"
                onPress={handleGoogleLogin}
                icon={<AntDesign name="google" size={21} color="#DB4437" />}
              />
            </View>

            <View style={styles.orRow}>
              <View style={styles.divider} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.form}>
              <InputField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                error={fieldError('email')}
                icon={<Mail size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <InputField
                label="Senha"
                value={password}
                onChangeText={setPassword}
                placeholder="Sua senha"
                secureTextEntry
                textContentType="password"
                error={fieldError('password')}
                icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <PrimaryButton title="Faça login com e-mail" onPress={handleEmailLogin} />
            </View>

            <Text style={styles.footer}>
              Novo na missão?{' '}
              <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>
                Criar Conta
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 34,
  },
  subtitle: {
    marginTop: 12,
    maxWidth: 318,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 14,
  },
  orRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 26,
  },
  form: {
    width: '100%',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footer: {
    marginTop: 28,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '800',
  },
});

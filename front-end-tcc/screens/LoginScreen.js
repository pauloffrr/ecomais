import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Lock, Mail } from 'lucide-react-native';
import EcoBackground from '../components/EcoBackground';
import InputField from '../components/InputField';
import LoadingOverlay from '../components/LoadingOverlay';
import LogoMark from '../components/LogoMark';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { useAuth } from '../src/hooks/useAuth';
import { loginSchema } from '../src/validation/loginSchema';

const getLoginErrorMessage = (error) => {
  if (error?.message === 'AUTH_TOKEN_NOT_FOUND') {
    return 'Login realizado, mas o token nao foi retornado pelo servidor.';
  }

  if (error?.response?.status === 401) {
    return 'E-mail ou senha invalidos.';
  }

  if (error?.response?.status >= 500) {
    return 'Erro interno do servidor.';
  }

  if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error' || !error?.response) {
    return 'Falha na conexao com servidor.';
  }

  return error?.response?.data?.message ?? 'Nao foi possivel realizar o login.';
};

function Snackbar({ message, visible }) {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: visible ? 0 : 24,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.snackbar, { opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.snackbarText}>{message}</Text>
    </Animated.View>
  );
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: yupResolver(loginSchema),
    mode: 'onSubmit',
  });

  const showFeedback = (message) => {
    setFeedback(message);
    setFeedbackVisible(true);
    setTimeout(() => setFeedbackVisible(false), 3400);
  };

  const handleLogin = async ({ email, password }) => {
    try {
      await login(email.trim(), password);
    } catch (error) {
      showFeedback(getLoginErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <EcoBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <LogoMark />
              <Text style={styles.title}>Eco+</Text>
              <Text style={styles.subtitle}>
                Entre para acompanhar sua jornada de reciclagem inteligente.
              </Text>
            </View>

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onBlur, onChange, value } }) => (
                  <InputField
                    label="E-mail"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Digite seu e-mail"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    error={errors.email?.message}
                    editable={!isSubmitting}
                    icon={<Mail size={20} color={colors.primary} strokeWidth={1.9} />}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onBlur, onChange, value } }) => (
                  <InputField
                    label="Senha"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Digite sua senha"
                    secureTextEntry
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(handleLogin)}
                    error={errors.password?.message}
                    editable={!isSubmitting}
                    icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
                  />
                )}
              />

              <PrimaryButton title="Entrar" onPress={handleSubmit(handleLogin)} loading={isSubmitting} />
            </View>

            <Text style={styles.footer}>
              Novo por aqui?{' '}
              <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>
                Criar conta
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar message={feedback} visible={feedbackVisible} />
      <LoadingOverlay visible={isSubmitting} message="Entrando..." />
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
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
    marginBottom: 32,
  },
  title: {
    marginTop: 12,
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 318,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    width: '100%',
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
    fontWeight: '900',
  },
  snackbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 26,
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.text,
    paddingHorizontal: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  snackbarText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});

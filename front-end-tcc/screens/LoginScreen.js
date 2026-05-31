import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Fingerprint, Lock, Mail, X } from 'lucide-react-native';
import EcoBackground from '../components/EcoBackground';
import InputField from '../components/InputField';
import LoadingOverlay from '../components/LoadingOverlay';
import LogoMark from '../components/LogoMark';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { useAuth } from '../src/hooks/useAuth';
import { loginSchema } from '../src/validation/loginSchema';
import * as authService from '../src/services/authService';

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

const onlyDigits = (value) => value.replace(/\D/g, '');

const validateResetForm = (form) => {
  const errors = {};
  const hasLetter = /[A-Za-z]/.test(form.newPassword);
  const hasNumber = /\d/.test(form.newPassword);

  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Digite um e-mail valido.';
  if (onlyDigits(form.cpf).length !== 11) errors.cpf = 'Digite o CPF cadastrado.';
  if (form.newPassword.length < 8 || !hasLetter || !hasNumber) {
    errors.newPassword = 'Use 8+ caracteres com letras e numeros.';
  }
  if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'As senhas precisam ser iguais.';
  }

  return errors;
};

function ResetPasswordModal({ visible, loading, onClose, onSubmit }) {
  const [form, setForm] = useState({
    email: '',
    cpf: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const errors = validateResetForm(form);
  const fieldError = (name) => (submitted ? errors[name] : undefined);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const close = () => {
    setSubmitted(false);
    setForm({ email: '', cpf: '', newPassword: '', confirmPassword: '' });
    onClose();
  };

  const submit = () => {
    setSubmitted(true);

    if (Object.keys(errors).length > 0) return;

    onSubmit({
      email: form.email.trim().toLowerCase(),
      cpf: onlyDigits(form.cpf),
      newPassword: form.newPassword,
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Redefinir senha</Text>
            <Pressable accessibilityRole="button" onPress={close} hitSlop={10} style={styles.closeButton}>
              <X size={18} color={colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          <Text style={styles.modalSubtitle}>
            Informe o e-mail e CPF cadastrados para criar uma nova senha.
          </Text>

          <InputField
            label="E-mail"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="Digite seu e-mail"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!loading}
            error={fieldError('email')}
            icon={<Mail size={20} color={colors.primary} strokeWidth={1.9} />}
          />
          <InputField
            label="CPF"
            value={form.cpf}
            onChangeText={(value) => updateField('cpf', value)}
            placeholder="000.000.000-00"
            keyboardType="number-pad"
            editable={!loading}
            error={fieldError('cpf')}
            icon={<Fingerprint size={20} color={colors.primary} strokeWidth={1.9} />}
          />
          <InputField
            label="Nova senha"
            value={form.newPassword}
            onChangeText={(value) => updateField('newPassword', value)}
            placeholder="8+ caracteres com letras e numeros"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            editable={!loading}
            error={fieldError('newPassword')}
            icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
          />
          <InputField
            label="Confirmar senha"
            value={form.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            placeholder="Repita a nova senha"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            editable={!loading}
            error={fieldError('confirmPassword')}
            icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
          />

          <PrimaryButton title="Alterar senha" onPress={submit} loading={loading} />
        </View>
      </View>
    </Modal>
  );
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleResetPassword = async (payload) => {
    setResetLoading(true);

    try {
      await authService.resetPassword(payload);
      setResetVisible(false);
      showFeedback('Senha alterada com sucesso. Entre com a nova senha.');
    } catch (error) {
      if (error?.response?.status === 404) {
        showFeedback('E-mail ou CPF nao encontrados.');
      } else if (error?.response?.status === 422) {
        showFeedback('Confira os dados e tente novamente.');
      } else {
        showFeedback('Nao foi possivel alterar a senha agora.');
      }
    } finally {
      setResetLoading(false);
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

              <Pressable
                accessibilityRole="button"
                onPress={() => setResetVisible(true)}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </Pressable>
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
      <ResetPasswordModal
        visible={resetVisible}
        loading={resetLoading}
        onClose={() => setResetVisible(false)}
        onSubmit={handleResetPassword}
      />
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
  subtitle: {
    marginTop: 14,
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
  forgotButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
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
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    padding: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  modalSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 14,
  },
});

import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, Fingerprint, Lock, Mail, Phone, UserRound } from 'lucide-react-native';
import EcoBackground from '../components/EcoBackground';
import InputField from '../components/InputField';
import LoadingOverlay from '../components/LoadingOverlay';
import LogoMark from '../components/LogoMark';
import PasswordRequirements, { getPasswordRules } from '../components/PasswordRequirements';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import * as authService from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { formatCpf, onlyCpfDigits } from '../utils/cpf';

const initialForm = {
  name: '',
  email: '',
  cpf: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const onlyDigits = (value) => value.replace(/\D/g, '');

const isValidCpf = (value) => {
  const cpf = onlyCpfDigits(value);

  if (cpf.length !== 11 || cpf === cpf[0].repeat(11)) return false;

  const calculateDigit = (digits) => {
    const total = digits
      .split('')
      .reduce((sum, digit, index) => sum + Number(digit) * (digits.length + 1 - index), 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(cpf.slice(0, 9)) === Number(cpf[9]) &&
    calculateDigit(cpf.slice(0, 10)) === Number(cpf[10])
  );
};

const getRegisterErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;

  if (error?.response?.status === 400) {
    if (String(detail).includes('email')) return 'Ja existe uma conta com este e-mail.';
    if (String(detail).includes('CPF')) return 'Ja existe uma conta com este CPF.';
    return 'Nao foi possivel criar a conta com esses dados.';
  }

  if (error?.response?.status === 422) {
    return 'Revise os dados informados. CPF, telefone ou senha nao foram aceitos.';
  }

  if (error?.response?.status >= 500) {
    return 'Erro interno do servidor.';
  }

  if (error?.message === 'Network Error' || !error?.response) {
    return 'Falha na conexao com servidor.';
  }

  return 'Nao foi possivel criar sua conta.';
};

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const passwordRules = useMemo(() => getPasswordRules(form.password), [form.password]);
  const passwordIsValid = passwordRules.every((rule) => rule.valid);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (form.name.trim().split(/\s+/).length < 2) nextErrors.name = 'Informe nome e sobrenome.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Use um e-mail valido.';
    if (!isValidCpf(form.cpf)) nextErrors.cpf = 'Informe um CPF valido.';
    if (onlyDigits(form.phone).length < 10) nextErrors.phone = 'Informe um telefone valido.';
    if (!passwordIsValid) {
      nextErrors.password = 'Complete os requisitos da senha.';
    }
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'As senhas precisam ser iguais.';
    }
    if (!acceptedTerms) nextErrors.terms = 'Aceite os termos para continuar.';

    return nextErrors;
  }, [acceptedTerms, form, passwordIsValid]);

  const updateField = (field, value) => {
    setFeedback('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateAccount = async () => {
    setSubmitted(true);
    setFeedback('');

    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      await authService.register({
        full_name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        cpf: onlyCpfDigits(form.cpf),
        phone: onlyDigits(form.phone),
        password: form.password,
      });

      await login(form.email.trim().toLowerCase(), form.password);
    } catch (error) {
      setFeedback(getRegisterErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => (submitted ? errors[name] : undefined);

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
              <LogoMark compact />
              <Text style={styles.title}>Crie sua conta</Text>
              <Text style={styles.subtitle}>Entre na missao Eco+ com seguranca e simplicidade.</Text>
            </View>

            <View style={styles.form}>
              <InputField
                label="Nome completo"
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Seu nome e sobrenome"
                autoCapitalize="words"
                textContentType="name"
                editable={!loading}
                error={fieldError('name')}
                icon={<UserRound size={20} color={colors.primary} strokeWidth={1.9} />}
              />
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
                onChangeText={(value) => updateField('cpf', formatCpf(value))}
                placeholder="000.000.000-00"
                keyboardType="number-pad"
                editable={!loading}
                error={fieldError('cpf')}
                icon={<Fingerprint size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <InputField
                label="Telefone"
                value={form.phone}
                onChangeText={(value) => updateField('phone', value)}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                editable={!loading}
                error={fieldError('phone')}
                icon={<Phone size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <InputField
                label="Senha"
                value={form.password}
                onChangeText={(value) => updateField('password', value)}
                placeholder="Crie uma senha segura"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                editable={!loading}
                error={fieldError('password')}
                icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <PasswordRequirements password={form.password} />
              <InputField
                label="Confirmar senha"
                value={form.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                placeholder="Repita sua senha"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                editable={!loading}
                error={fieldError('confirmPassword')}
                icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
              />

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
                disabled={loading}
                onPress={() => setAcceptedTerms((current) => !current)}
                style={styles.termsRow}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                  {acceptedTerms ? <Check size={15} color={colors.white} strokeWidth={3} /> : null}
                </View>
                <Text style={styles.termsText}>
                  Concordo com os Termos e a Politica de Privacidade.
                </Text>
              </Pressable>
              {submitted && errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}
              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

              <PrimaryButton
                title="Criar conta"
                onPress={handleCreateAccount}
                loading={loading}
                style={styles.button}
              />
            </View>

            <Text style={styles.footer}>
              Ja tem uma conta?{' '}
              <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
                Iniciar sessao
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={loading} message="Criando conta..." />
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
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  container: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    marginTop: 14,
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 306,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  termsError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedback: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
  },
  footer: {
    marginTop: 24,
    marginBottom: 8,
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

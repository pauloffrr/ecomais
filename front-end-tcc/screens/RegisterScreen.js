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
import { Check, Lock, Mail, Phone, UserRound } from 'lucide-react-native';
import EcoBackground from '../components/EcoBackground';
import InputField from '../components/InputField';
import LogoMark from '../components/LogoMark';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { registerMockUser } from '../services/mockAuth';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState(initialForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Informe seu nome completo.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Use um e-mail válido.';
    if (form.phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Informe um telefone válido.';
    if (form.password.length < 6) nextErrors.password = 'A senha precisa ter ao menos 6 caracteres.';
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'As senhas precisam ser iguais.';
    }
    if (!acceptedTerms) nextErrors.terms = 'Aceite os termos para continuar.';

    return nextErrors;
  }, [acceptedTerms, form]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateAccount = () => {
    setSubmitted(true);

    if (Object.keys(errors).length > 0) return;

    registerMockUser(form);
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <LogoMark compact />
              <Text style={styles.title}>Crie sua conta</Text>
              <Text style={styles.subtitle}>Entre na missão Eco-Tech com segurança e simplicidade.</Text>
            </View>

            <View style={styles.form}>
              <InputField
                label="Nome completo"
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Seu nome"
                autoCapitalize="words"
                textContentType="name"
                error={fieldError('name')}
                icon={<UserRound size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <InputField
                label="E-mail"
                value={form.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="voce@email.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                error={fieldError('email')}
                icon={<Mail size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <InputField
                label="Telefone"
                value={form.phone}
                onChangeText={(value) => updateField('phone', value)}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                error={fieldError('phone')}
                icon={<Phone size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <InputField
                label="Senha"
                value={form.password}
                onChangeText={(value) => updateField('password', value)}
                placeholder="Mínimo de 6 caracteres"
                secureTextEntry
                textContentType="newPassword"
                error={fieldError('password')}
                icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
              />
              <InputField
                label="Confirmar senha"
                value={form.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                placeholder="Repita sua senha"
                secureTextEntry
                textContentType="newPassword"
                error={fieldError('confirmPassword')}
                icon={<Lock size={20} color={colors.primary} strokeWidth={1.9} />}
              />

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
                onPress={() => setAcceptedTerms((current) => !current)}
                style={styles.termsRow}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                  {acceptedTerms ? <Check size={15} color={colors.white} strokeWidth={3} /> : null}
                </View>
                <Text style={styles.termsText}>
                  Concordo com os Termos e a Política de Privacidade.
                </Text>
              </Pressable>
              {submitted && errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

              <PrimaryButton title="Criar Conta" onPress={handleCreateAccount} style={styles.button} />
            </View>

            <Text style={styles.footer}>
              Já tem uma conta?{' '}
              <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
                Iniciar sessão
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

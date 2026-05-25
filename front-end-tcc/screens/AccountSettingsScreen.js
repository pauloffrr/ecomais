import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bell, ChevronLeft, Globe, Lock, Mail, Phone, Shield, UserRound } from 'lucide-react-native';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import SettingSwitch from '../components/SettingSwitch';
import { mockProfileData } from '../data/mockProfileData';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const initialSettings = mockProfileData.accountSettings;

export default function AccountSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(initialSettings);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!settings.fullName.trim()) nextErrors.fullName = 'Informe seu nome completo.';
    if (settings.phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Informe um telefone valido.';

    const changingPassword =
      passwords.currentPassword || passwords.newPassword || passwords.confirmPassword;

    if (changingPassword) {
      if (!passwords.currentPassword) nextErrors.currentPassword = 'Informe sua senha atual.';
      if (passwords.newPassword.length < 6) nextErrors.newPassword = 'Use ao menos 6 caracteres.';
      if (passwords.confirmPassword !== passwords.newPassword) {
        nextErrors.confirmPassword = 'As senhas precisam ser iguais.';
      }
    }

    return nextErrors;
  }, [passwords, settings.fullName, settings.phone]);

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePassword = (key, value) => {
    setPasswords((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const fieldError = (name) => (submitted ? errors[name] : undefined);

  const handleSave = () => {
    setSubmitted(true);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert('Tudo certo', 'Configuracoes salvas com sucesso.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }, 700);
  };

  return (
    <SafeAreaView style={styles.safe}>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color={colors.primary} strokeWidth={2.2} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Configuracoes</Text>
                <Text style={styles.headerSubtitle}>Perfil, senha e preferencias da conta</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.profileSummary}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{mockProfileData.user.avatarInitials}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{settings.fullName}</Text>
                <Text style={styles.profileEmail}>{settings.email}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dados do Perfil</Text>
              <InputField
                label="Nome completo"
                icon={UserRound}
                value={settings.fullName}
                onChangeText={(value) => updateSetting('fullName', value)}
                placeholder="Seu nome"
                autoCapitalize="words"
                textContentType="name"
                error={fieldError('fullName')}
              />
              <InputField
                label="E-mail"
                icon={Mail}
                value={settings.email}
                placeholder="seu@email.com"
                keyboardType="email-address"
                editable={false}
              />
              <InputField
                label="Telefone"
                icon={Phone}
                value={settings.phone}
                onChangeText={(value) => updateSetting('phone', value)}
                placeholder="+55 (11) 98765-4321"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                error={fieldError('phone')}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Senha</Text>
              <InputField
                label="Senha atual"
                icon={Lock}
                value={passwords.currentPassword}
                onChangeText={(value) => updatePassword('currentPassword', value)}
                placeholder="Sua senha atual"
                isPassword
                textContentType="password"
                error={fieldError('currentPassword')}
              />
              <InputField
                label="Nova senha"
                icon={Lock}
                value={passwords.newPassword}
                onChangeText={(value) => updatePassword('newPassword', value)}
                placeholder="Minimo de 6 caracteres"
                isPassword
                textContentType="newPassword"
                error={fieldError('newPassword')}
              />
              <InputField
                label="Confirmar nova senha"
                icon={Lock}
                value={passwords.confirmPassword}
                onChangeText={(value) => updatePassword('confirmPassword', value)}
                placeholder="Repita sua nova senha"
                isPassword
                textContentType="newPassword"
                error={fieldError('confirmPassword')}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferencias</Text>
              <View style={styles.switchGroup}>
                <SettingSwitch
                  icon={Bell}
                  label="Notificacoes"
                  value={settings.notifications}
                  onValueChange={(value) => updateSetting('notifications', value)}
                />
                <SettingSwitch
                  icon={Shield}
                  label="Perfil publico"
                  value={settings.privacyProfile}
                  onValueChange={(value) => updateSetting('privacyProfile', value)}
                />
                <SettingSwitch
                  icon={Lock}
                  label="Autenticacao em dois fatores"
                  value={settings.securityTwoFactor}
                  onValueChange={(value) => updateSetting('securityTwoFactor', value)}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Idioma</Text>
              <View style={styles.languageSelector}>
                <View style={styles.languageIcon}>
                  <Globe size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.languageTextGroup}>
                  <Text style={styles.languageText}>Portugues (Brasil)</Text>
                  <Text style={styles.languageHint}>Idioma padrao do aplicativo</Text>
                </View>
              </View>
            </View>

            <PrimaryButton
              title={isSaving ? 'Salvando...' : 'Salvar Alteracoes'}
              onPress={handleSave}
              disabled={isSaving}
              style={styles.saveButton}
            />
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
    paddingTop: 18,
    paddingBottom: 36,
  },
  container: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.md,
    marginBottom: 22,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '900',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  profileEmail: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  switchGroup: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  languageTextGroup: {
    flex: 1,
  },
  languageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  languageHint: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 2,
    marginBottom: 12,
  },
});

import { useEffect, useMemo, useState } from 'react';
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
import { LogOut } from 'lucide-react-native';
import GradientButton from '../components/GradientButton';
import { BackHeader } from '../components/ScreenHeader';
import TextInputField from '../components/TextInputField';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';
import * as userService from '../services/userService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const getInitials = (name) => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (parts.length === 0) return 'E';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const normalizePhone = (value) => value.replace(/[^\d+]/g, '');

const buildPasswordError = (password) => {
  const changingPassword = password.current || password.next || password.confirm;

  if (!changingPassword) return '';
  if (!password.current || !password.next || !password.confirm) return 'Preencha todos os campos de senha.';
  if (password.next.length < 6) return 'A nova senha deve ter no minimo 6 caracteres.';
  if (password.next !== password.confirm) return 'A confirmacao deve ser igual a nova senha.';

  return '';
};

export default function AccountSettingsScreen({ navigation }) {
  const { logout, updateUser: updateAuthUser, userId } = useAuth();
  const { user, loading, refetch } = useUser();
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '' });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    setProfile({
      fullName: user.full_name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
    });
  }, [user]);

  const passwordError = useMemo(() => buildPasswordError(password), [password]);
  const canSave = useMemo(() => Boolean(profile.fullName.trim()) && !passwordError, [passwordError, profile.fullName]);

  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const updatePassword = (key, value) => setPassword((current) => ({ ...current, [key]: value }));

  const handlePasswordChange = async () => {
    if (!password.current && !password.next && !password.confirm) return;

    if (passwordError) {
      throw new Error(passwordError);
    }

    await userService.changePassword({
      current_password: password.current,
      new_password: password.next,
    });
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Revise os dados', passwordError || 'Informe seu nome completo.');
      return;
    }

    setSaving(true);

    try {
      const updatedUser = await userService.updateUser(userId, {
        full_name: profile.fullName.trim(),
        phone: normalizePhone(profile.phone),
      });

      await handlePasswordChange();
      await updateAuthUser(updatedUser);
      await refetch({ refresh: true });
      setPassword({ current: '', next: '', confirm: '' });
      Alert.alert('Alteracoes salvas', 'Suas configuracoes foram atualizadas.');
    } catch (error) {
      Alert.alert('Nao foi possivel salvar', error?.message || 'Tente novamente em alguns instantes.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sair da conta', 'Deseja encerrar sua sessao no Eco+?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <BackHeader title="Configuracoes da Conta" onBack={() => navigation.goBack()} />

            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(profile.fullName)}</Text>
              </View>

              <View style={styles.userCopy}>
                <Text style={styles.userName}>{profile.fullName || 'Usuario Eco+'}</Text>
                <Text style={styles.userEmail}>{profile.email || 'Conta autenticada'}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Editar Perfil</Text>
              <TextInputField
                label="Nome completo"
                value={profile.fullName}
                onChangeText={(value) => updateProfile('fullName', value)}
                placeholder="Seu nome completo"
                editable={!loading && !saving}
              />
              <TextInputField
                label="E-mail"
                value={profile.email}
                placeholder="voce@email.com"
                keyboardType="email-address"
                editable={false}
              />
              <TextInputField
                label="Telefone"
                value={profile.phone}
                onChangeText={(value) => updateProfile('phone', value)}
                placeholder="+55 (11) 99999-9999"
                keyboardType="phone-pad"
                editable={!loading && !saving}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alterar Senha</Text>
              <TextInputField
                label="Senha atual"
                value={password.current}
                onChangeText={(value) => updatePassword('current', value)}
                placeholder="Digite sua senha atual"
                secureTextEntry
                editable={!saving}
              />
              <TextInputField
                label="Nova senha"
                value={password.next}
                onChangeText={(value) => updatePassword('next', value)}
                placeholder="Minimo de 6 caracteres"
                secureTextEntry
                editable={!saving}
              />
              <TextInputField
                label="Confirmar senha"
                value={password.confirm}
                onChangeText={(value) => updatePassword('confirm', value)}
                placeholder="Repita a nova senha"
                secureTextEntry
                editable={!saving}
              />
              {passwordError ? <Text style={styles.passwordError}>{passwordError}</Text> : null}
            </View>

            <GradientButton
              title={saving ? 'Salvando...' : 'Salvar alteracoes'}
              disabled={saving || loading}
              onPress={handleSave}
            />

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
            >
              <LogOut size={18} color={colors.danger} strokeWidth={2.2} />
              <Text style={styles.logoutText}>Sair da conta</Text>
            </Pressable>
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
    paddingTop: 20,
    paddingBottom: 36,
  },
  container: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  userCopy: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  userEmail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  passwordError: {
    marginTop: -4,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    minHeight: 56,
    marginTop: spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
});

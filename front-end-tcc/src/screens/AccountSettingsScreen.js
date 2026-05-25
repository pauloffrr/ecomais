import { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Bell, Camera, Globe, Lock, Shield, UserRound } from 'lucide-react-native';
import GradientButton from '../components/GradientButton';
import { BackHeader } from '../components/ScreenHeader';
import SettingSwitch from '../components/SettingSwitch';
import TextInputField from '../components/TextInputField';
import { profileData } from '../mocks/profileData';
import { settingsData } from '../mocks/settingsData';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function AccountSettingsScreen({ navigation }) {
  const [profile, setProfile] = useState(settingsData.profile);
  const [preferences, setPreferences] = useState(settingsData.preferences);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => {
    const hasProfile = profile.fullName.trim() && profile.phone.replace(/\D/g, '').length >= 10;
    const changingPassword = password.current || password.next || password.confirm;
    const passwordOk = !changingPassword || (password.current && password.next.length >= 6 && password.next === password.confirm);
    return Boolean(hasProfile && passwordOk);
  }, [password, profile.fullName, profile.phone]);

  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const updatePreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));
  const updatePassword = (key, value) => setPassword((current) => ({ ...current, [key]: value }));

  const handleChangePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow gallery access to update your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });

    if (result.canceled || !result.assets?.length) return;

    updateProfile('avatarUri', result.assets[0].uri);
  };

  const handleRemovePhoto = () => {
    updateProfile('avatarUri', null);
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Review settings', 'Please check your profile and password fields.');
      return;
    }

    setSaving(true);
    await api.updateProfile({
      profile,
      preferences,
      password,
      avatarUpload: profile.avatarUri
        ? {
            uri: profile.avatarUri,
            contentType: 'image/jpeg',
            target: 'profile-photo',
          }
        : null,
    });
    setSaving(false);
    Alert.alert('Saved', 'Your account settings are ready to sync with the API.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <BackHeader title="Account Settings" onBack={() => navigation.goBack()} />

            <View style={styles.userCard}>
              <Pressable accessibilityRole="button" onPress={handleChangePhoto} style={styles.avatarWrapper}>
                <View style={styles.avatar}>
                  {profile.avatarUri ? (
                    <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{profileData.user.avatarInitials}</Text>
                  )}
                </View>
                <View style={styles.cameraBadge}>
                  <Camera size={15} color={colors.white} strokeWidth={2.4} />
                </View>
              </Pressable>
              <View style={styles.userCopy}>
                <Text style={styles.userName}>{profileData.user.name}</Text>
                <Text style={styles.userEmail}>JWT-ready account profile</Text>
                <View style={styles.photoActions}>
                  <Pressable accessibilityRole="button" onPress={handleChangePhoto} hitSlop={8}>
                    <Text style={styles.photoActionText}>Change Photo</Text>
                  </Pressable>
                  {profile.avatarUri ? (
                    <Pressable accessibilityRole="button" onPress={handleRemovePhoto} hitSlop={8}>
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Edit Profile</Text>
              <TextInputField label="Full Name" value={profile.fullName} onChangeText={(value) => updateProfile('fullName', value)} placeholder="Your name" />
              <TextInputField label="Email" value={profile.email} placeholder="you@email.com" keyboardType="email-address" editable={false} />
              <TextInputField label="Phone" value={profile.phone} onChangeText={(value) => updateProfile('phone', value)} placeholder="+55 (11) 98765-4321" keyboardType="phone-pad" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <TextInputField label="Current Password" value={password.current} onChangeText={(value) => updatePassword('current', value)} placeholder="Current password" secureTextEntry />
              <TextInputField label="New Password" value={password.next} onChangeText={(value) => updatePassword('next', value)} placeholder="Minimum 6 characters" secureTextEntry />
              <TextInputField label="Confirm Password" value={password.confirm} onChangeText={(value) => updatePassword('confirm', value)} placeholder="Repeat new password" secureTextEntry />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.switchGroup}>
                <SettingSwitch icon={Bell} label="Notifications" description="Recycling and reward alerts" value={preferences.notifications} onValueChange={(value) => updatePreference('notifications', value)} />
                <SettingSwitch icon={UserRound} label="Privacy Settings" description="Show public profile stats" value={preferences.privacyProfile} onValueChange={(value) => updatePreference('privacyProfile', value)} />
                <SettingSwitch icon={Shield} label="Security" description="Two-factor authentication" value={preferences.securityTwoFactor} onValueChange={(value) => updatePreference('securityTwoFactor', value)} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Language</Text>
              <View style={styles.languageCard}>
                <View style={styles.languageIcon}>
                  <Globe size={20} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.languageTitle}>{preferences.language}</Text>
                  <Text style={styles.languageMeta}>Prepared for remote preferences</Text>
                </View>
              </View>
            </View>

            <GradientButton title={saving ? 'Saving...' : 'Save Changes'} disabled={saving} onPress={handleSave} />
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
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.surface,
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
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  photoActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  removePhotoText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
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
  switchGroup: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
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
  languageTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  languageMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
});

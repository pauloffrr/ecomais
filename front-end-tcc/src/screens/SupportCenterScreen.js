import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Mail, MessageCircle, Phone } from 'lucide-react-native';
import FAQAccordion from '../components/FAQAccordion';
import GradientButton from '../components/GradientButton';
import { BackHeader } from '../components/ScreenHeader';
import SupportCard from '../components/SupportCard';
import TextInputField from '../components/TextInputField';
import { supportData } from '../mocks/profileData';
import * as supportService from '../services/supportService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const contactIcons = {
  email: Mail,
  chat: MessageCircle,
  phone: Phone,
};

export default function SupportCenterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSend = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      Alert.alert('Missing fields', 'Please complete the contact form.');
      return;
    }

    setSending(true);

    try {
      await supportService.sendSupportMessage({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        message: form.message.trim(),
      });
      setForm({ name: '', email: '', message: '' });
      Alert.alert('Mensagem enviada', 'Sua solicitacao foi enviada para o suporte.');
    } catch {
      Alert.alert('Nao foi possivel enviar', 'Verifique sua conexao e tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <BackHeader title="Support Center" onBack={() => navigation.goBack()} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FAQ</Text>
              {supportData.faq.map((item) => (
                <FAQAccordion key={item.id} question={item.question} answer={item.answer} />
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Direct Support</Text>
              {supportData.contacts.map((contact) => {
                const Icon = contactIcons[contact.type] ?? Mail;
                return <SupportCard key={contact.id} icon={Icon} title={contact.title} value={contact.value} />;
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Form</Text>
              <TextInputField label="Name" value={form.name} onChangeText={(value) => updateForm('name', value)} placeholder="Your name" />
              <TextInputField label="Email" value={form.email} onChangeText={(value) => updateForm('email', value)} placeholder="you@email.com" keyboardType="email-address" />
              <TextInputField label="Message" value={form.message} onChangeText={(value) => updateForm('message', value)} placeholder="Tell us how we can help" multiline />
              <GradientButton title={sending ? 'Sending...' : 'Send Message'} disabled={sending} onPress={handleSend} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System Status</Text>
              <View style={styles.statusCard}>
                <View style={styles.statusLeft}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusLabel}>{supportData.systemStatus.label}</Text>
                </View>
                <Text style={styles.statusValue}>{supportData.systemStatus.value}</Text>
              </View>
            </View>
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
  statusCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  statusLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  statusValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
});

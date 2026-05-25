import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, Mail, MessageCircle, Phone, Send } from 'lucide-react-native';
import InputField from '../components/InputField';
import FAQAccordion from '../components/FAQAccordion';
import SupportCard from '../components/SupportCard';
import PrimaryButton from '../components/PrimaryButton';
import { mockProfileData } from '../data/mockProfileData';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function SupportCenterScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setData(mockProfileData);
    }, 300);
  }, []);

  const handleFormChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSendMessage = () => {
    if (!formData.name || !formData.email || !formData.message) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
      setFormData({ name: '', email: '', message: '' });
    }, 1500);
  };

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Centro de Suporte</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  const iconMap = {
    Mail,
    MessageCircle,
    Phone,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Centro de Suporte</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>
          {data.faq.map((item) => (
            <FAQAccordion
              key={item.id}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </View>

        {/* Direct Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suporte Direto</Text>
          {data.supportContacts.map((contact) => (
            <SupportCard
              key={contact.id}
              icon={iconMap[contact.icon]}
              title={contact.title}
              value={contact.value}
              description={contact.description}
            />
          ))}
        </View>

        {/* Contact Form Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formulário de Contato</Text>

          <InputField
            label="Nome"
            icon={MessageCircle}
            placeholder="Seu nome"
            value={formData.name}
            onChangeText={(value) => handleFormChange('name', value)}
          />

          <InputField
            label="Email"
            icon={Mail}
            placeholder="seu@email.com"
            value={formData.email}
            onChangeText={(value) => handleFormChange('email', value)}
            keyboardType="email-address"
            style={{ marginTop: spacing.sm }}
          />

          <View style={styles.messageInputContainer}>
            <Text style={styles.label}>Mensagem</Text>
            <View style={styles.messageInput}>
              <Text style={styles.messageInputPlaceholder}>
                {formData.message || 'Descreva sua dúvida ou problema...'}
              </Text>
            </View>
          </View>

          <View style={styles.sendButtonContainer}>
            <PrimaryButton
              label={isSending ? 'Enviando...' : 'Enviar Mensagem'}
              onPress={handleSendMessage}
              disabled={isSending}
            />
          </View>
        </View>

        {/* System Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status do Sistema</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Sistema Operacional</Text>
            </View>
            <Text style={styles.statusValue}>{data.systemStatus.status}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  messageInputContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  messageInput: {
    minHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: 'flex-start',
  },
  messageInputPlaceholder: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
  sendButtonContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
  },
  statusCard: {
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});

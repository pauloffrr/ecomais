import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, Package, Code, BookOpen } from 'lucide-react-native';
import { mockProfileData } from '../data/mockProfileData';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function AppInformationScreen({ navigation }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setData(mockProfileData.appInfo);
    }, 300);
  }, []);

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Informações do Aplicativo</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Informações do Aplicativo</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* App Version Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={20} color={colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Versão do App</Text>
          </View>
          <Text style={styles.cardValue}>Eco+ v{data.version}</Text>
        </View>

        {/* Build Number Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Code size={20} color={colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Build Number</Text>
          </View>
          <Text style={styles.cardValue}>{data.buildNumber}</Text>
        </View>

        {/* Developer Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookOpen size={20} color={colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Desenvolvedor</Text>
          </View>
          <Text style={styles.cardValue}>{data.developer}</Text>
        </View>

        {/* Tech Stack Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Code size={20} color={colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Stack Tecnológico</Text>
          </View>
          <View style={styles.techStackContainer}>
            {data.techStack.map((tech, index) => (
              <View key={index} style={styles.techBadge}>
                <Text style={styles.techText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* About App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre o Aplicativo</Text>
          <Text style={styles.aboutText}>{data.aboutText}</Text>
        </View>

        {/* Legal Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <Pressable style={styles.linkItem}>
            <Text style={styles.linkText}>Termos de Serviço</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.linkItem}>
            <Text style={styles.linkText}>Política de Privacidade</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.linkItem}>
            <Text style={styles.linkText}>Licenças de Código Aberto</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>
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
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.md,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  techStackContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  techBadge: {
    backgroundColor: colors.mint,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  techText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  aboutText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  linkArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});

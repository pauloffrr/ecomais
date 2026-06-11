import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookOpen, Code2, FileText, Package, ShieldCheck } from 'lucide-react-native';
import MenuItem from '../components/MenuItem';
import { BackHeader } from '../components/ScreenHeader';
import { appInformation } from '../data/appContent';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

function InfoCard({ icon: Icon, label, value }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconShell}>
          <Icon size={20} color={colors.primary} strokeWidth={2.1} />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

export default function AppInformationScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <BackHeader title="App Information" onBack={() => navigation.goBack()} />

          <InfoCard icon={Package} label="APP VERSION" value={appInformation.version} />
          <InfoCard icon={Code2} label="BUILD NUMBER" value={appInformation.buildNumber} />
          <InfoCard icon={BookOpen} label="DEVELOPER" value={appInformation.developer} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TECH STACK</Text>
            <View style={styles.stackCard}>
              {appInformation.techStack.map((tech) => (
                <View key={tech} style={styles.techBadge}>
                  <Text style={styles.techText}>{tech}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT APP</Text>
            <View style={styles.aboutCard}>
              <ShieldCheck size={22} color={colors.primary} strokeWidth={2.1} />
              <Text style={styles.aboutText}>{appInformation.about}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LEGAL</Text>
            <View style={styles.legalCard}>
              {appInformation.legal.map((item) => (
                <MenuItem key={item} icon={FileText} label={item} onPress={() => {}} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
  infoCard: {
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  cardValue: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  stackCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  techBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.mint,
  },
  techText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  aboutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutText: {
    flex: 1,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  legalCard: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});

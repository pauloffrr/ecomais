import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gift } from 'lucide-react-native';
import GradientButton from '../components/GradientButton';
import PointsBadge from '../components/PointsBadge';
import { BackHeader } from '../components/ScreenHeader';
import { coupons, featuredRewards } from '../data/rewardCatalog';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function RewardDetailsScreen({ navigation, route }) {
  const rewardId = route.params?.rewardId;
  const item = useMemo(
    () => [...featuredRewards, ...coupons].find((reward) => reward.id === rewardId) ?? featuredRewards[0],
    [rewardId]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <BackHeader title="Reward Details" onBack={() => navigation.goBack()} />
          <View style={styles.card}>
            <View style={styles.iconShell}>
              <Gift size={42} color={colors.white} strokeWidth={2.1} />
            </View>
            <Text style={styles.partner}>{item.partner}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <PointsBadge points={item.pointsRequired} />
            <GradientButton title="Resgatar" onPress={() => navigation.goBack()} style={styles.button} />
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
  card: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconShell: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  partner: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  button: {
    width: '100%',
    marginTop: spacing.lg,
  },
});

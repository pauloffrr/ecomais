import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { QrCode, RefreshCcw } from 'lucide-react-native';
import Co2Card from '../components/Co2Card';
import EcoProgressCard from '../components/EcoProgressCard';
import FloatingTabBar from '../components/FloatingTabBar';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import TipCard from '../components/TipCard';
import { useDiscards } from '../src/hooks/useDiscards';
import { useRewards } from '../src/hooks/useRewards';
import { useUser } from '../src/hooks/useUser';
import { colors } from '../theme/colors';

const HOME_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'scanner', label: 'Scanner', icon: 'scan' },
  { key: 'history', label: 'Estatisticas', icon: 'bar-chart' },
  { key: 'rewards', label: 'Recompensas', icon: 'gift' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

const TODAY_TIP = {
  title: 'Dicas de hoje',
  text: 'Lave as embalagens antes de descartar para evitar contaminacao.',
};

const LEVEL_POINTS = 1000;
const TREE_POINTS = 200;
const CO2_KG_PER_RECYCLED_KG = 1.5;

const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(value);

const formatKg = (value) =>
  `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} kg`;

const getFirstName = (fullName) => fullName?.trim()?.split(/\s+/)?.[0] ?? 'usuario';

const getAvatarInitial = (fullName) => {
  const initial = fullName?.trim()?.charAt(0);
  return initial ? initial.toUpperCase() : 'E';
};

const calculateHomeMetrics = ({ user, discards, rewards, discardTotal }) => {
  const rewardPoints = rewards.reduce((sum, reward) => sum + Number(reward.points ?? 0), 0);
  const discardPoints = discards.reduce((sum, discard) => sum + Number(discard.points_awarded ?? 0), 0);
  const totalPoints = Number(user?.total_points ?? (rewardPoints || discardPoints) ?? 0);
  const totalRecycled = Number(discardTotal ?? discards.length ?? user?.total_discards ?? 0);
  const totalWeightKg =
    discards.reduce((sum, discard) => sum + Number(discard.weight_grams ?? 0), 0) / 1000;
  const co2SavedKg = totalWeightKg * CO2_KG_PER_RECYCLED_KG;
  const level = Math.floor(totalPoints / LEVEL_POINTS) + 1;
  const pointsInLevel = totalPoints % LEVEL_POINTS;
  const progress = Math.min(100, Math.round((pointsInLevel / LEVEL_POINTS) * 100));
  const pointsToNextLevel = LEVEL_POINTS - pointsInLevel;
  const pointsToNextTree = TREE_POINTS - (pointsInLevel % TREE_POINTS || TREE_POINTS);
  const treesCompleted = Math.min(5, Math.floor(pointsInLevel / TREE_POINTS));

  return {
    co2SavedKg,
    level,
    pointsToNextLevel,
    pointsToNextTree: pointsToNextTree === 0 ? TREE_POINTS : pointsToNextTree,
    progress,
    totalPoints,
    totalRecycled,
    treesCompleted,
  };
};

function UserSummaryCard({ user, level, totalPoints }) {
  return (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{getAvatarInitial(user?.full_name)}</Text>
      </View>

      <View style={styles.userContent}>
        <Text style={styles.userName}>{user?.full_name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        <View style={styles.userMetaGrid}>
          <View style={styles.userMetaItem}>
            <Text style={styles.userMetaLabel}>Pontos</Text>
            <Text style={styles.userMetaValue}>{formatNumber(totalPoints)}</Text>
          </View>
          <View style={styles.userMetaItem}>
            <Text style={styles.userMetaLabel}>Nivel</Text>
            <Text style={styles.userMetaValue}>{level}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('home');
  const {
    user,
    loading: userLoading,
    refreshing: userRefreshing,
    error: userError,
    refetch: refetchUser,
  } = useUser();
  const {
    discards,
    total: discardTotal,
    loading: discardsLoading,
    refreshing: discardsRefreshing,
    error: discardsError,
    refetch: refetchDiscards,
  } = useDiscards();
  const {
    rewards,
    loading: rewardsLoading,
    refreshing: rewardsRefreshing,
    error: rewardsError,
    refetch: refetchRewards,
  } = useRewards();

  const loading = userLoading || discardsLoading || rewardsLoading;
  const refreshing = userRefreshing || discardsRefreshing || rewardsRefreshing;
  const hasError = Boolean(userError || discardsError || rewardsError);

  const metrics = useMemo(
    () => calculateHomeMetrics({ user, discards, rewards, discardTotal }),
    [discardTotal, discards, rewards, user]
  );

  const headerUser = useMemo(
    () => ({
      ...user,
      avatarInitials: getAvatarInitial(user?.full_name),
    }),
    [user]
  );

  const impactStats = useMemo(
    () => [
      {
        id: 'recycled',
        icon: 'recycle',
        label: 'TOTAL RECICLADO',
        value: `${formatNumber(metrics.totalRecycled)} itens`,
      },
      {
        id: 'points',
        icon: 'medal',
        label: 'PONTOS ACUMULADOS',
        value: formatNumber(metrics.totalPoints),
      },
    ],
    [metrics.totalPoints, metrics.totalRecycled]
  );

  const environment = useMemo(
    () => ({
      title: 'Impacto Ambiental',
      level: `Voce esta no Nivel ${metrics.level}`,
      treesTotal: 5,
      treesCompleted: metrics.treesCompleted,
      progressLabel: 'PROXIMA ARVORE',
      progress: metrics.progress,
      hint: `Faltam ${formatNumber(metrics.pointsToNextTree)} pontos para a proxima arvore e ${formatNumber(
        metrics.pointsToNextLevel
      )} para o Nivel ${metrics.level + 1}.`,
    }),
    [metrics.level, metrics.pointsToNextLevel, metrics.pointsToNextTree, metrics.progress, metrics.treesCompleted]
  );

  const refreshHome = useCallback(async () => {
    await Promise.all([
      refetchUser({ refresh: true }),
      refetchDiscards({ refresh: true }),
      refetchRewards({ refresh: true }),
    ]);
  }, [refetchDiscards, refetchRewards, refetchUser]);

  const handleScan = () => {
    navigation.navigate('Scanner', { startSessionOnScan: true });
  };

  const handleTabChange = (key) => {
    if (key === 'history' || key === 'stats') {
      navigation.navigate('History');
      return;
    }

    if (key === 'scanner') {
      navigation.navigate('Scanner', { startSessionOnScan: true });
      return;
    }

    if (key === 'profile') {
      navigation.navigate('AccountSettings');
      return;
    }

    if (key === 'rewards') {
      navigation.navigate('Rewards');
      return;
    }

    if (key !== 'home') {
      Alert.alert('Em breve', 'Esta area esta pronta para receber a proxima tela.');
      return;
    }

    setActiveTab(key);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={refreshHome} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Header appName="Eco+" user={headerUser} />

            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>Ola, {getFirstName(user?.full_name)} 👋</Text>
              <Text style={styles.welcomeSubtitle}>Pronto para salvar o planeta hoje?</Text>
            </View>

            {hasError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Nao foi possivel atualizar a Home.</Text>
                <Text style={styles.errorText}>Verifique sua conexao e tente novamente.</Text>
                <Pressable accessibilityRole="button" onPress={refreshHome} style={styles.retryButton}>
                  <RefreshCcw size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : hasError || !user ? null : (
              <>
                <UserSummaryCard user={user} level={metrics.level} totalPoints={metrics.totalPoints} />

                <Co2Card data={{ label: 'CO2 SALVO', value: formatKg(metrics.co2SavedKg) }} />

                <View style={styles.statsRow}>
                  {impactStats.map((item) => (
                    <StatCard key={item.id} item={item} />
                  ))}
                </View>

                <GradientButton
                  title="Escanear maquina"
                  onPress={handleScan}
                  icon={<QrCode size={24} color={colors.white} strokeWidth={2.3} />}
                  style={styles.scanButton}
                />

                <EcoProgressCard data={environment} />

                <View style={styles.tipSection}>
                  <Text style={styles.sectionTitle}>{TODAY_TIP.title}</Text>
                  <TipCard tip={TODAY_TIP} />
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <FloatingTabBar tabs={HOME_TABS} activeKey={activeTab} onChange={handleTabChange} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 112,
  },
  container: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  welcome: {
    marginTop: 34,
    marginBottom: 22,
  },
  welcomeTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  welcomeSubtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingCard: {
    minHeight: 180,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  errorCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  retryButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  retryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  userCard: {
    minHeight: 132,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  userAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  userContent: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  userEmail: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  userMetaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  userMetaItem: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  userMetaLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  userMetaValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
  },
  scanButton: {
    marginTop: 22,
    marginBottom: 22,
  },
  tipSection: {
    marginTop: 22,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
});

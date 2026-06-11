import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ActivityCard from '../components/ActivityCard';
import FilterButton from '../components/FilterButton';
import FloatingTabBar from '../components/FloatingTabBar';
import Header from '../components/Header';
import HistoryProgressCard from '../components/HistoryProgressCard';
import { useDiscards } from '../hooks/useDiscards';
import { useMaterials } from '../hooks/useMaterials';
import { useRewards } from '../hooks/useRewards';
import { useUser } from '../hooks/useUser';
import { colors } from '../theme/colors';

const HISTORY_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'scanner', label: 'Scanner', icon: 'scan' },
  { key: 'history', label: 'Historico', icon: 'bar-chart' },
  { key: 'rewards', label: 'Recompensas', icon: 'gift' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

const PERIOD_FILTERS = [
  { id: 'today', label: 'Hoje' },
  { id: '7days', label: 'Ultimos 7 dias' },
  { id: 'month', label: 'Este mes' },
  { id: '3months', label: 'Ultimos 3 meses' },
  { id: 'year', label: 'Este ano' },
];

const CO2_KG_PER_RECYCLED_KG = 1.5;
const MONTHLY_GOAL_STEP = 500;

const MATERIAL_TRANSLATIONS = {
  'Aluminum Can': 'Aluminio',
  Cardboard: 'Papel',
  'Clear Glass Bottle': 'Vidro',
  'Colored Glass Bottle': 'Vidro',
  'Electronic Waste': 'Eletronicos',
  'HDPE Plastic Container': 'Plastico',
  'Newspaper & Paper': 'Papel',
  'Organic Waste': 'Organicos',
  'PET Plastic Bottle': 'PET',
  'Steel Can': 'Aluminio',
};

const CATEGORY_TRANSLATIONS = {
  plastic: 'Plastico',
  glass: 'Vidro',
  paper: 'Papel',
  metal: 'Metal',
  organic: 'Organico',
  electronic: 'Eletronico',
  mixed: 'Misto',
  non_recyclable: 'Nao reciclavel',
};

const getAvatarInitial = (fullName) => {
  const initial = fullName?.trim()?.charAt(0);
  return initial ? initial.toUpperCase() : 'E';
};

const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Math.round(value));

const formatKg = (value) =>
  `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} kg`;

const formatDate = (value) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getMaterialLabel = (name) => MATERIAL_TRANSLATIONS[name] ?? name ?? 'Material';

const getCategoryLabel = (category, fallback) => CATEGORY_TRANSLATIONS[category] ?? fallback;

const getMaterialType = (name, category) => {
  const value = normalize(`${name} ${category}`);

  if (value.includes('pet') || value.includes('plastic')) return 'pet';
  if (value.includes('aluminum') || value.includes('steel') || value.includes('metal')) return 'aluminum';
  if (value.includes('glass') || value.includes('vidro')) return 'glass';
  if (value.includes('paper') || value.includes('cardboard') || value.includes('papel')) return 'paper';
  if (value.includes('electronic') || value.includes('eletron')) return 'electronic';

  return 'other';
};

const getPeriodStart = (period) => {
  const now = new Date();
  const start = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === '7days') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (period === '3months') {
    return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  }

  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }

  return null;
};

const filterByPeriod = (discard, period) => {
  const start = getPeriodStart(period);
  if (!start) return true;

  return new Date(discard.created_at) >= start;
};

const getMonthlyPoints = (discards) => {
  const monthStart = getPeriodStart('month');
  return discards
    .filter((discard) => new Date(discard.created_at) >= monthStart)
    .reduce((sum, discard) => sum + Number(discard.points_awarded ?? 0), 0);
};

const getMonthlyGoal = (monthPoints, userPoints) => {
  const base = Math.max(monthPoints, Math.ceil(Number(userPoints || 0) / 10));
  return Math.max(MONTHLY_GOAL_STEP, Math.ceil((base + 1) / MONTHLY_GOAL_STEP) * MONTHLY_GOAL_STEP);
};

const calculateStats = ({ discards, rewards, user }) => {
  const totalWeightKg = discards.reduce((sum, discard) => sum + Number(discard.weight_grams ?? 0), 0) / 1000;
  const ledgerBalance = rewards.reduce((sum, reward) => sum + Number(reward.points ?? 0), 0);
  const availablePoints =
    user?.total_points != null
      ? Number(user.total_points)
      : ledgerBalance;
  const earnedPointsFromLedger = rewards
    .filter((reward) => Number(reward.points ?? 0) > 0)
    .reduce((sum, reward) => sum + Number(reward.points ?? 0), 0);
  const earnedPoints =
    rewards.length > 0
      ? earnedPointsFromLedger
      : discards.reduce((sum, discard) => sum + Number(discard.points_awarded ?? 0), 0) ||
        availablePoints;
  const spentPoints = rewards
    .filter((reward) => Number(reward.points ?? 0) < 0)
    .reduce((sum, reward) => sum + Math.abs(Number(reward.points ?? 0)), 0);
  const monthPoints = getMonthlyPoints(discards);
  const monthlyGoal = getMonthlyGoal(monthPoints, earnedPoints);
  const monthlyProgress = Math.min(100, Math.round((monthPoints / monthlyGoal) * 100));
  const months = new Set(discards.map((discard) => new Date(discard.created_at).toISOString().slice(0, 7)));
  const monthlyAverage = months.size ? earnedPoints / months.size : earnedPoints;
  const materialCount = discards.reduce((acc, discard) => {
    const name = getMaterialLabel(discard.material_name);
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const topMaterial = Object.entries(materialCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sem descartes';

  return {
    availablePoints,
    co2SavedKg: totalWeightKg * CO2_KG_PER_RECYCLED_KG,
    earnedPoints,
    monthlyAverage,
    monthlyGoal,
    monthlyProgress,
    monthPoints,
    spentPoints,
    topMaterial,
    totalRecycled: discards.length,
  };
};

function StatsGrid({ stats }) {
  const items = [
    { label: 'Total reciclado', value: `${formatNumber(stats.totalRecycled)} itens` },
    { label: 'Mais descartado', value: stats.topMaterial },
    { label: 'CO2 economizado', value: formatKg(stats.co2SavedKg) },
    { label: 'Media mensal', value: `${formatNumber(stats.monthlyAverage)} pts` },
    { label: 'Saldo disponivel', value: `${formatNumber(stats.availablePoints)} pts` },
    { label: 'Pontos usados', value: `${formatNumber(stats.spentPoints)} pts` },
  ];

  return (
    <View style={styles.statsGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.statBox}>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text style={styles.statValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function HistoryScreen({ navigation }) {
  const [activePeriod, setActivePeriod] = useState('month');
  const [activeMaterial, setActiveMaterial] = useState('all');
  const { user, loading: userLoading, refreshing: userRefreshing, error: userError, refetch: refetchUser } = useUser();
  const {
    discards,
    loading: discardsLoading,
    refreshing: discardsRefreshing,
    paginationLoading,
    error: discardsError,
    hasMore,
    loadMore,
    refetch: refetchDiscards,
  } = useDiscards({ pageSize: 20 });
  const {
    materials,
    loading: materialsLoading,
    refreshing: materialsRefreshing,
    error: materialsError,
    refetch: refetchMaterials,
  } = useMaterials();
  const {
    rewards,
    loading: rewardsLoading,
    refreshing: rewardsRefreshing,
    error: rewardsError,
    refetch: refetchRewards,
  } = useRewards();

  const loading = userLoading || discardsLoading || materialsLoading || rewardsLoading;
  const refreshing = userRefreshing || discardsRefreshing || materialsRefreshing || rewardsRefreshing;
  const error = userError || discardsError || materialsError || rewardsError;

  const materialByName = useMemo(
    () =>
      materials.reduce((acc, material) => {
        acc[material.name] = material;
        return acc;
      }, {}),
    [materials]
  );

  const materialFilters = useMemo(() => {
    const unique = new Map();

    materials.forEach((material) => {
      const label = getMaterialLabel(material.name);
      if (!unique.has(label)) {
        unique.set(label, { id: label, label });
      }
    });

    return [{ id: 'all', label: 'Todos' }, ...unique.values()];
  }, [materials]);

  const filteredDiscards = useMemo(
    () =>
      discards.filter((discard) => {
        const material = materialByName[discard.material_name];
        const materialLabel = getMaterialLabel(discard.material_name);
        const periodMatches = filterByPeriod(discard, activePeriod);
        const materialMatches = activeMaterial === 'all' || materialLabel === activeMaterial;

        return periodMatches && materialMatches && (!material || material.is_active !== false);
      }),
    [activeMaterial, activePeriod, discards, materialByName]
  );

  const stats = useMemo(() => calculateStats({ discards, rewards, user }), [discards, rewards, user]);

  const summary = useMemo(
    () => ({
      label: 'IMPACTO TOTAL',
      value: `${formatNumber(stats.earnedPoints)} Pontos ganhos`,
      goal: `Meta Mensal: ${formatNumber(stats.monthlyGoal)} pts`,
      progress: stats.monthlyProgress,
    }),
    [stats.earnedPoints, stats.monthlyGoal, stats.monthlyProgress]
  );

  const activities = useMemo(
    () =>
      filteredDiscards.map((discard) => {
        const material = materialByName[discard.material_name];
        const materialLabel = getMaterialLabel(discard.material_name);
        const type = getMaterialType(discard.material_name, material?.category);

        return {
          id: String(discard.id),
          title: `1x ${materialLabel}`,
          date: formatDate(discard.created_at),
          material: getCategoryLabel(material?.category, materialLabel),
          type,
          points: Number(discard.points_awarded ?? 0),
        };
      }),
    [filteredDiscards, materialByName]
  );

  const headerUser = useMemo(
    () => ({
      ...user,
      avatarInitials: getAvatarInitial(user?.full_name),
    }),
    [user]
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      refetchUser({ refresh: true }),
      refetchDiscards({ refresh: true }),
      refetchMaterials({ refresh: true }),
      refetchRewards({ refresh: true }),
    ]);
  }, [refetchDiscards, refetchMaterials, refetchRewards, refetchUser]);

  const handleTabChange = (key) => {
    if (key === 'home') {
      navigation.navigate('Home');
      return;
    }

    if (key === 'scanner') {
      navigation.navigate('Scanner');
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

    if (key !== 'history') {
      Alert.alert('Em breve', 'Esta area esta pronta para receber a proxima tela.');
    }
  };

  const renderActivity = useCallback(({ item }) => <ActivityCard item={item} />, []);
  const keyExtractor = useCallback((item) => item.id, []);

  const listHeader = (
    <View>
      <Header
        appName={user?.full_name ?? 'Eco+'}
        user={headerUser}
      />

      <View style={styles.progressWrapper}>
        <HistoryProgressCard summary={summary} />
      </View>

      <StatsGrid stats={stats} />

      <Text style={styles.filterTitle}>Periodo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {PERIOD_FILTERS.map((filter) => (
          <FilterButton
            key={filter.id}
            label={filter.label}
            active={activePeriod === filter.id}
            onPress={() => setActivePeriod(filter.id)}
          />
        ))}
      </ScrollView>

      <Text style={styles.filterTitle}>Material</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {materialFilters.map((filter) => (
          <FilterButton
            key={filter.id}
            label={filter.label}
            active={activeMaterial === filter.id}
            onPress={() => setActiveMaterial(filter.id)}
          />
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Historico de descartes</Text>

      {loading ? (
        <View style={styles.loadingStack}>
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Nao foi possivel carregar seu historico.</Text>
          <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && activities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhum descarte encontrado.</Text>
          <Text style={styles.emptyText}>Altere os filtros ou escaneie uma maquina para iniciar seu historico.</Text>
        </View>
      ) : null}
    </View>
  );

  const listFooter = !loading && !error ? (
    <View style={styles.footer}>
      {paginationLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {!paginationLoading && hasMore ? (
        <Pressable accessibilityRole="button" onPress={loadMore} style={styles.loadButton}>
          <Text style={styles.loadText}>Carregar mais descartes</Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <FlatList
          data={loading || error ? [] : activities}
          keyExtractor={keyExtractor}
          renderItem={renderActivity}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !paginationLoading && !loading && !error) {
              loadMore();
            }
          }}
        />

        <FloatingTabBar tabs={HISTORY_TABS} activeKey="history" onChange={handleTabChange} />
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
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 112,
  },
  progressWrapper: {
    marginTop: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  statBox: {
    width: '48.5%',
    minHeight: 78,
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 14,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
  },
  statValue: {
    marginTop: 6,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  filterTitle: {
    marginTop: 22,
    marginBottom: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 22,
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 14,
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  separator: {
    height: 12,
  },
  loadingStack: {
    gap: 12,
  },
  loadingCard: {
    height: 82,
    borderRadius: 24,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  errorCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  retryButton: {
    minHeight: 34,
    justifyContent: 'center',
    marginTop: 8,
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  footer: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loadButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
});

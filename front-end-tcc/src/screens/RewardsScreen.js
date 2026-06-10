import { useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bell, CheckCircle2, Leaf } from 'lucide-react-native';
import CategoryChip from '../components/CategoryChip';
import CouponCard from '../components/CouponCard';
import FloatingTabBar from '../components/FloatingTabBar';
import RewardBanner from '../components/RewardBanner';
import RewardCard from '../components/RewardCard';
import { useDiscards } from '../hooks/useDiscards';
import { useMaterials } from '../hooks/useMaterials';
import { useRewards } from '../hooks/useRewards';
import { useUser } from '../hooks/useUser';
import * as rewardService from '../services/rewardService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const REWARD_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'scanner', label: 'Scanner', icon: 'scan' },
  { key: 'history', label: 'Historico', icon: 'bar-chart' },
  { key: 'rewards', label: 'Recompensas', icon: 'gift' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

const REWARD_CATEGORIES = [
  { id: 'all', label: 'Todas Recompensas' },
  { id: 'food', label: 'Alimentacao' },
  { id: 'transport', label: 'Transporte' },
  { id: 'shopping', label: 'Compras' },
  { id: 'sustainability', label: 'Sustentabilidade' },
  { id: 'experiences', label: 'Experiencias' },
];

const FEATURED_REWARDS = [
  {
    id: 'monthly-transit-pass',
    partner: 'Transporte Publico',
    category: 'transport',
    title: 'Passe Livre Mensal',
    description: 'Troque seus pontos por 30 dias de transporte urbano.',
    pointsRequired: 1200,
    actionLabel: 'Resgatar recompensa',
    visual: 'bus',
  },
  {
    id: 'plant-ten-trees',
    partner: 'Meta Sustentavel',
    category: 'sustainability',
    title: 'Plantar 10 Arvores',
    description: 'Contribuicao direta para projeto de reflorestamento nacional.',
    pointsRequired: 450,
    actionLabel: 'Resgatar',
    visual: 'trees',
  },
  {
    id: 'free-coffee',
    partner: 'Parceiro Cafe',
    category: 'food',
    title: 'Cafe Gratis',
    description: 'Ganhe 1 cafe expresso em cafeterias parceiras.',
    pointsRequired: 150,
    actionLabel: 'Resgatar',
    visual: 'coffee',
  },
];

const COUPONS = [
  {
    id: 'ifood-20-off',
    partner: 'iFood',
    category: 'food',
    title: '20% OFF em Pedido',
    description: 'Desconto valido em restaurantes participantes.',
    pointsRequired: 250,
  },
  {
    id: 'uber-15-off',
    partner: 'Uber',
    category: 'transport',
    title: 'R$15 OFF na Corrida',
    description: 'Desconto em viagens urbanas.',
    pointsRequired: 800,
  },
  {
    id: 'mercado-livre-free-shipping',
    partner: 'Mercado Livre',
    category: 'shopping',
    title: 'Frete Gratis',
    description: 'Cupom valido em produtos selecionados.',
    pointsRequired: 500,
  },
  {
    id: 'outback-dessert',
    partner: 'Outback Brasil',
    category: 'food',
    title: 'Sobremesa Gratis',
    description: 'Ganhe sobremesa na compra de prato principal.',
    pointsRequired: 300,
  },
  {
    id: 'natura-sustainable-off',
    partner: 'Natura',
    category: 'sustainability',
    title: '15% OFF Sustentavel',
    description: 'Desconto em produtos eco-friendly.',
    pointsRequired: 600,
  },
  {
    id: 'spotify-premium-month',
    partner: 'Spotify Premium',
    category: 'experiences',
    title: '1 Mes Premium',
    description: 'Assinatura gratuita por 30 dias.',
    pointsRequired: 1000,
  },
  {
    id: 'bike-itau-one-hour',
    partner: 'Bike Itau',
    category: 'transport',
    title: '1 Hora Gratis',
    description: 'Mobilidade urbana sustentavel.',
    pointsRequired: 100,
  },
  {
    id: 'tok-stok-25-off',
    partner: 'Tok&Stok',
    category: 'shopping',
    title: 'R$25 OFF',
    description: 'Cupom valido para itens sustentaveis.',
    pointsRequired: 750,
  },
];

const getInitials = (name) => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return 'E';
  return parts[0].charAt(0).toUpperCase();
};

const formatPoints = (value) => Number(value ?? 0).toLocaleString('pt-BR');

const normalizeReward = (reward, balance) => ({
  ...reward,
  points: reward.pointsRequired,
  locked: balance < reward.pointsRequired,
});

export default function RewardsScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [redeemingId, setRedeemingId] = useState(null);
  const [redeemedCoupon, setRedeemedCoupon] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const { user, loading: userLoading, refreshing: userRefreshing, refetch: refetchUser } = useUser();
  const { rewards, loading: rewardsLoading, refreshing: rewardsRefreshing, refetch: refetchRewards } = useRewards();
  const { loading: discardsLoading, refreshing: discardsRefreshing, refetch: refetchDiscards } = useDiscards();
  const { loading: materialsLoading, refreshing: materialsRefreshing, refetch: refetchMaterials } = useMaterials();

  const backendPoints = useMemo(() => {
    if (typeof user?.total_points === 'number') return user.total_points;
    return rewards.reduce((sum, reward) => sum + Number(reward.points ?? 0), 0);
  }, [rewards, user?.total_points]);

  const pointsBalance = Math.max(0, backendPoints);
  const loading = userLoading || rewardsLoading || discardsLoading || materialsLoading;
  const refreshing = userRefreshing || rewardsRefreshing || discardsRefreshing || materialsRefreshing;

  const featuredRewards = useMemo(
    () =>
      FEATURED_REWARDS.map((reward) => normalizeReward(reward, pointsBalance)).filter(
        (reward) => activeCategory === 'all' || reward.category === activeCategory
      ),
    [activeCategory, pointsBalance]
  );

  const coupons = useMemo(
    () =>
      COUPONS.map((coupon) => normalizeReward(coupon, pointsBalance)).filter(
        (coupon) => activeCategory === 'all' || coupon.category === activeCategory
      ),
    [activeCategory, pointsBalance]
  );

  const refreshRewards = async () => {
    await Promise.all([
      refetchUser({ refresh: true }),
      refetchRewards({ refresh: true }),
      refetchDiscards({ refresh: true }),
      refetchMaterials({ refresh: true }),
    ]);
  };

  const handleTabChange = (key) => {
    if (key === 'home') navigation.navigate('Home');
    else if (key === 'scanner') navigation.navigate('Scanner');
    else if (key === 'history') navigation.navigate('History');
    else if (key === 'profile') navigation.navigate('AccountSettings');
  };

  const handleRedeem = async (item) => {
    if (item.locked || pointsBalance < item.pointsRequired) return;

    setRedeemingId(item.id);

    try {
      const redemption = await rewardService.redeemReward(item.id);
      await Promise.all([
        refetchUser({ refresh: true }),
        refetchRewards({ refresh: true }),
      ]);
      setRedeemedCoupon({ ...item, code: redemption.coupon_code });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message =
        detail === 'Insufficient points'
          ? 'Voce nao possui pontos suficientes para esta recompensa.'
          : 'Nao foi possivel concluir o resgate. Tente novamente.';
      Alert.alert('Falha no resgate', message);
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopyCode = async () => {
    if (!redeemedCoupon?.code) return;

    await Clipboard.setStringAsync(redeemedCoupon.code);
    setCopyFeedback(true);
  };

  useEffect(() => {
    if (!copyFeedback) return undefined;

    const timer = setTimeout(() => setCopyFeedback(false), 1800);
    return () => clearTimeout(timer);
  }, [copyFeedback]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={refreshRewards} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.leftHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
                </View>
                <Text style={styles.logo}>Eco+</Text>
              </View>
              <View style={styles.pointsPill}>
                <Leaf size={15} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.pointsText}>{formatPoints(pointsBalance)} pontos</Text>
              </View>
              <Pressable accessibilityRole="button" style={styles.notificationButton}>
                <Bell size={21} color={colors.text} strokeWidth={1.9} />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>

            <View style={styles.bannerWrapper}>
              <RewardBanner />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {REWARD_CATEGORIES.map((category) => (
                <CategoryChip
                  key={category.id}
                  label={category.label}
                  active={category.id === activeCategory}
                  onPress={() => setActiveCategory(category.id)}
                />
              ))}
            </ScrollView>

            {loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Recompensas em Destaque</Text>
                {featuredRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    onOpen={() => navigation.navigate('RewardDetails', { rewardId: reward.id })}
                    onRedeem={() => handleRedeem(reward)}
                  />
                ))}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitleCompact}>Cupons Disponiveis</Text>
                  <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Coupons')}>
                    <Text style={styles.viewAll}>Ver Tudo</Text>
                  </Pressable>
                </View>

                {coupons.map((coupon) => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    onOpen={() => navigation.navigate('RewardDetails', { rewardId: coupon.id })}
                    onRedeem={() => handleRedeem(coupon)}
                  />
                ))}

                {rewards.length > 0 ? (
                  <View style={styles.historySection}>
                    <Text style={styles.sectionTitleCompact}>Historico de recompensas</Text>
                    {rewards.slice(0, 4).map((reward) => (
                      <View key={reward.id} style={styles.historyItem}>
                        <View>
                          <Text style={styles.historyTitle}>{reward.description ?? reward.transaction_type}</Text>
                          <Text style={styles.historyMeta}>{new Date(reward.created_at).toLocaleDateString('pt-BR')}</Text>
                        </View>
                        <Text style={styles.historyPoints}>{formatPoints(reward.points)} pts</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>

        <FloatingTabBar tabs={REWARD_TABS} activeKey="rewards" onChange={handleTabChange} />
      </View>

      <Modal
        visible={Boolean(redeemedCoupon)}
        transparent
        animationType="fade"
        onRequestClose={() => setRedeemedCoupon(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <CheckCircle2 size={34} color={colors.white} strokeWidth={2.4} />
            </View>
            <Text style={styles.modalTitle}>Cupom resgatado com sucesso!</Text>
            <Text style={styles.modalText}>Copie seu codigo e utilize no parceiro selecionado.</Text>
            <View style={styles.couponCodeBox}>
              <Text style={styles.couponCode}>{redeemedCoupon?.code}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={handleCopyCode} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Copiar codigo</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setRedeemedCoupon(null)} style={styles.modalGhostButton}>
              <Text style={styles.modalGhostText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {copyFeedback ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>Codigo copiado!</Text>
        </View>
      ) : null}

      {redeemingId ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <Text style={styles.loadingText}>Gerando cupom...</Text>
        </View>
      ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  logo: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pointsText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
  bannerWrapper: {
    marginTop: spacing.lg,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitleCompact: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  viewAll: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  historySection: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  historyItem: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  historyMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  historyPoints: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(31,41,55,0.35)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 28,
    backgroundColor: colors.surface,
  },
  modalIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  couponCodeBox: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    marginTop: spacing.md,
  },
  couponCode: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  modalButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: 23,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  modalGhostButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  modalGhostText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  toast: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 104,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.text,
  },
  toastText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 104,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.text,
  },
  loadingText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
});

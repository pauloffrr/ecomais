import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCircle2, Leaf } from 'lucide-react-native';
import CategoryChip from '../components/CategoryChip';
import CouponCard from '../components/CouponCard';
import FloatingTabBar from '../components/FloatingTabBar';
import RewardBanner from '../components/RewardBanner';
import RewardCard from '../components/RewardCard';
import { coupons } from '../mocks/couponsData';
import { featuredRewards, rewardCategories, rewardsUser } from '../mocks/rewardsData';
import { profileData } from '../mocks/profileData';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function RewardsScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [pointsBalance, setPointsBalance] = useState(rewardsUser.pointsBalance);
  const [redeemingId, setRedeemingId] = useState(null);
  const [successModal, setSuccessModal] = useState(false);

  const filteredRewards = useMemo(() => {
    if (activeCategory === 'all') return featuredRewards;
    return featuredRewards.filter((reward) => reward.category === activeCategory);
  }, [activeCategory]);

  const filteredCoupons = useMemo(() => {
    if (activeCategory === 'all') return coupons;
    return coupons.filter((coupon) => coupon.category === activeCategory);
  }, [activeCategory]);

  const handleTabChange = (key) => {
    if (key === 'home') navigation.navigate('Home');
    else if (key === 'scanner') navigation.navigate('Scanner');
    else if (key === 'history') navigation.navigate('History');
    else if (key === 'profile') navigation.navigate('Profile');
  };

  const handleRedeem = async (item) => {
    if (pointsBalance < item.points) {
      Alert.alert('Saldo insuficiente', 'Recicle mais itens para liberar esta recompensa.');
      return;
    }

    setRedeemingId(item.id);
    await api.redeemReward(item.id);
    setPointsBalance((current) => current - item.points);
    setRedeemingId(null);
    setSuccessModal(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.leftHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{rewardsUser.avatarInitials}</Text>
                </View>
                <Text style={styles.logo}>Eco-Tech</Text>
              </View>
              <View style={styles.pointsPill}>
                <Leaf size={15} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.pointsText}>{pointsBalance.toLocaleString('pt-BR')} pontos</Text>
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
              {rewardCategories.map((category) => (
                <CategoryChip
                  key={category.id}
                  label={category.label}
                  active={category.id === activeCategory}
                  onPress={() => setActiveCategory(category.id)}
                />
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Recompensas em Destaque</Text>
            {filteredRewards.map((reward) => (
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

            {filteredCoupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onOpen={() => navigation.navigate('RewardDetails', { rewardId: coupon.id })}
                onRedeem={() => handleRedeem(coupon)}
              />
            ))}
          </View>
        </ScrollView>

        <FloatingTabBar tabs={profileData.tabs} activeKey="rewards" onChange={handleTabChange} />
      </View>

      <Modal visible={successModal} transparent animationType="fade" onRequestClose={() => setSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <CheckCircle2 size={34} color={colors.white} strokeWidth={2.4} />
            </View>
            <Text style={styles.modalTitle}>Recompensa resgatada com sucesso!</Text>
            <Text style={styles.modalText}>Seu cupom ja esta disponivel.</Text>
            <Pressable accessibilityRole="button" onPress={() => setSuccessModal(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Continuar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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

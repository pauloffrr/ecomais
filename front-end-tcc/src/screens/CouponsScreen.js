import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import CouponCard from '../components/CouponCard';
import { BackHeader } from '../components/ScreenHeader';
import { coupons } from '../mocks/couponsData';
import { colors } from '../theme/colors';

export default function CouponsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <BackHeader title="Cupons Disponiveis" onBack={() => navigation.goBack()} />
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onOpen={() => navigation.navigate('RewardDetails', { rewardId: coupon.id })}
              onRedeem={() => navigation.navigate('RewardDetails', { rewardId: coupon.id })}
            />
          ))}
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
});

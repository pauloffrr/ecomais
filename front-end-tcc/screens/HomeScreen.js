import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QrCode } from 'lucide-react-native';
import Co2Card from '../components/Co2Card';
import EcoProgressCard from '../components/EcoProgressCard';
import FloatingTabBar from '../components/FloatingTabBar';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import TipCard from '../components/TipCard';
import { colors } from '../theme/colors';
import mockHomeData from '../data/mockHomeData.json';

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [homeData, setHomeData] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHomeData(mockHomeData);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const data = useMemo(() => homeData ?? mockHomeData, [homeData]);

  const handleScan = () => {
    navigation.navigate('Scanner');
  };

  const handleTabChange = (key) => {
    if (key === 'history' || key === 'stats') {
      navigation.navigate('History');
      return;
    }

    if (key === 'scanner') {
      navigation.navigate('Scanner');
      return;
    }

    if (key === 'profile') {
      navigation.navigate('Profile');
      return;
    }

    if (key === 'rewards') {
      navigation.navigate('Rewards');
      return;
    }

    if (key !== 'home') {
      Alert.alert('Em breve', 'Esta área está pronta para receber a próxima tela.');
      return;
    }

    setActiveTab(key);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Header
              appName="Eco+"
              user={data.user}
              onAvatarPress={() => navigation.navigate('Profile')}
            />

            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>{data.welcome.title}</Text>
              <Text style={styles.welcomeSubtitle}>{data.welcome.subtitle}</Text>
            </View>

            {loading ? (
              <View style={styles.loadingCard}>
                <View style={styles.loadingLineLarge} />
                <View style={styles.loadingLineSmall} />
              </View>
            ) : (
              <>
                <Co2Card data={data.impact.co2Saved} />

                <View style={styles.statsRow}>
                  {data.impact.stats.map((item) => (
                    <StatCard key={item.id} item={item} />
                  ))}
                </View>

                <GradientButton
                  title={data.scanner.label}
                  onPress={handleScan}
                  icon={<QrCode size={24} color={colors.white} strokeWidth={2.3} />}
                  style={styles.scanButton}
                />

                <EcoProgressCard data={data.environment} />

                <View style={styles.tipSection}>
                  <Text style={styles.sectionTitle}>{data.tip.title}</Text>
                  <TipCard tip={data.tip} />
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <FloatingTabBar tabs={data.tabs} activeKey={activeTab} onChange={handleTabChange} />
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
    height: 128,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 24,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  loadingLineLarge: {
    width: '55%',
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceSoft,
  },
  loadingLineSmall: {
    width: '36%',
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceSoft,
    marginTop: 16,
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

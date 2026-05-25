import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ActivityCard from '../components/ActivityCard';
import FilterButton from '../components/FilterButton';
import FloatingTabBar from '../components/FloatingTabBar';
import Header from '../components/Header';
import ProgressCard from '../components/ProgressCard';
import { colors } from '../theme/colors';
import mockHistoryData from '../data/mockHistoryData.json';

export default function HistoryScreen({ navigation }) {
  const [historyData, setHistoryData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('filter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setHistoryData(mockHistoryData);
        setError(null);
      } catch {
        setError('Não foi possível carregar seu histórico.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const data = useMemo(() => historyData ?? mockHistoryData, [historyData]);

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
      navigation.navigate('Profile');
      return;
    }

    if (key === 'rewards') {
      navigation.navigate('Rewards');
      return;
    }

    if (key !== 'history') {
      Alert.alert('Em breve', 'Esta área está pronta para receber a próxima tela.');
    }
  };

  const handleLoadHistoricalData = () => {
    Alert.alert('Dados históricos', 'Paginação mockada. Pronta para integração com API REST.');
  };

  const renderActivity = useCallback(({ item }) => <ActivityCard item={item} />, []);
  const keyExtractor = useCallback((item) => item.id, []);

  const listHeader = (
    <View>
      <Header
        appName="Eco-Tech"
        user={data.user}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      <View style={styles.progressWrapper}>
        <ProgressCard summary={data.summary} />
      </View>

      <View style={styles.filters}>
        {data.filters.map((filter) => (
          <FilterButton
            key={filter.id}
            label={filter.label}
            active={activeFilter === filter.id}
            onPress={() => setActiveFilter(filter.id)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>

      {loading ? (
        <View style={styles.loadingStack}>
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const listFooter = !loading && !error ? (
    <Pressable accessibilityRole="button" onPress={handleLoadHistoricalData} style={styles.loadButton}>
      <Text style={styles.loadText}>Carregar Dados Históricos</Text>
    </Pressable>
  ) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <FlatList
          data={loading || error ? [] : data.activities}
          keyExtractor={keyExtractor}
          renderItem={renderActivity}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
        />

        <FloatingTabBar tabs={data.tabs} activeKey="history" onChange={handleTabChange} />
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
  filters: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  loadButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loadText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
});

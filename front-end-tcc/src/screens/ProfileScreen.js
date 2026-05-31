import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Award, FileText, HelpCircle, LogOut, Recycle, Sparkles } from 'lucide-react-native';
import FloatingTabBar from '../components/FloatingTabBar';
import MenuItem from '../components/MenuItem';
import ProfileCard from '../components/ProfileCard';
import ProgressCard from '../components/ProgressCard';
import { AppHeader } from '../components/ScreenHeader';
import StatusCard from '../components/StatusCard';
import { profileData } from '../mocks/profileData';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useAuth } from '../hooks/useAuth';

const historyIcons = {
  plastic: Recycle,
  paper: FileText,
};

export default function ProfileScreen({ navigation }) {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    api.getProfile().finally(() => {
      if (!mounted) return;
      setData(profileData);
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      mounted = false;
    };
  }, [fade]);

  const handleTabChange = (key) => {
    if (key === 'home') navigation.navigate('Home');
    else if (key === 'scanner') navigation.navigate('Scanner');
    else if (key === 'history') navigation.navigate('History');
    else if (key === 'rewards') navigation.navigate('Rewards');
    else if (key !== 'profile') Alert.alert('Em breve', 'Esta area esta pronta para receber a proxima tela.');
  };

  const handleLogout = async () => {
    await logout();
  };

  const content = data ?? profileData;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.container, { opacity: fade }]}>
            <AppHeader user={content.user} />

            <View style={styles.profileCardWrapper}>
              <ProfileCard user={content.user} />
            </View>

            <View style={styles.statusRow}>
              <StatusCard icon={Sparkles} title="TOTAL POINTS" value={content.user.totalPoints.toLocaleString()} variant="green" />
              <StatusCard icon={Award} title="CURRENT LEVEL" value={`Level ${content.user.currentLevel}`} />
            </View>

            <View style={styles.block}>
              <ProgressCard
                title="Next Milestone"
                description={`${content.user.nextLevelPoints} points until Level ${content.user.nextLevel}`}
                percentage={content.user.progressPercentage}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent History</Text>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('History')} hitSlop={8}>
                <Text style={styles.linkText}>View All</Text>
              </Pressable>
            </View>

            <View style={styles.historyList}>
              {content.recentHistory.map((item) => {
                const Icon = historyIcons[item.type] ?? Recycle;
                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyIcon}>
                      <Icon size={20} color={colors.primary} strokeWidth={2.1} />
                    </View>
                    <View style={styles.historyCopy}>
                      <Text style={styles.historyTitle}>{item.material}</Text>
                      <Text style={styles.historyMeta}>{item.date} • {item.weight}</Text>
                    </View>
                    <Text style={styles.points}>+{item.points} Pts</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.menu}>
              <MenuItem icon={FileText} label="Informacoes do App" onPress={() => navigation.navigate('AppInformation')} />
              <MenuItem icon={HelpCircle} label="Central de Suporte" onPress={() => navigation.navigate('SupportCenter')} />
            </View>

            <Pressable accessibilityRole="button" onPress={handleLogout} style={styles.logoutButton}>
              <LogOut size={18} color={colors.danger} strokeWidth={2.1} />
              <Text style={styles.logoutText}>Sair</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        <FloatingTabBar tabs={content.tabs} activeKey="profile" onChange={handleTabChange} />
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
  profileCardWrapper: {
    marginTop: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  block: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  historyList: {
    gap: spacing.sm,
  },
  historyCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
    marginRight: spacing.md,
  },
  historyCopy: {
    flex: 1,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  historyMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  points: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  menu: {
    overflow: 'hidden',
    marginTop: spacing.xl,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  logoutButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
});

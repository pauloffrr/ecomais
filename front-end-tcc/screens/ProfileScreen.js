import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { LogOut, Info, HelpCircle } from 'lucide-react-native';
import Header from '../components/Header';
import FloatingTabBar from '../components/FloatingTabBar';
import ProfileCard from '../components/ProfileCard';
import StatusCard from '../components/StatusCard';
import MilestoneCard from '../components/MilestoneCard';
import MenuItem from '../components/MenuItem';
import { mockProfileData } from '../data/mockProfileData';
import mockHomeData from '../data/mockHomeData.json';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Sparkles, Award } from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    setTimeout(() => {
      setData(mockProfileData);
    }, 500);
  }, []);

  const handleNavigateToSettings = (screen) => {
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleTabChange = (key) => {
    if (key === 'home') {
      navigation.navigate('Home');
      return;
    }

    if (key === 'scanner') {
      navigation.navigate('Scanner');
      return;
    }

    if (key === 'history') {
      navigation.navigate('History');
      return;
    }

    if (key === 'profile') {
      setActiveTab(key);
      return;
    }

    if (key !== 'profile') {
      Alert.alert('Em breve', 'Esta área está pronta para receber a próxima tela.');
      return;
    }

    setActiveTab(key);
  };

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <Header appName="Eco+" user={{ avatarInitials: 'AD' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header appName="Eco+" user={data.user} />

        {/* Profile Card */}
        <ProfileCard user={data.user} />

        {/* Status Cards - Points and Level */}
        <View style={styles.statusCardsContainer}>
          <StatusCard
            icon={Sparkles}
            title="PONTOS TOTAIS"
            value={data.user.totalPoints.toLocaleString()}
            isGreen={true}
          />
          <StatusCard
            icon={Award}
            title="NÍVEL ATUAL"
            value={`Level ${data.user.currentLevel}`}
            isGreen={false}
          />
        </View>

        {/* Milestone Card */}
        <MilestoneCard
          nextLevelPoints={data.user.nextLevelPoints}
          progressPercentage={data.user.progressPercentage}
        />

        {/* Recent History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>HISTÓRIA RECENTE</Text>
            <Pressable>
              <Text style={styles.viewAllButton}>View All</Text>
            </Pressable>
          </View>

          {data.recentHistory.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyIconContainer}>
                <View style={[styles.historyIcon, { backgroundColor: item.color }]}>
                  <Text style={styles.historyIconText}>🔄</Text>
                </View>
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyMaterial}>{item.material}</Text>
                <Text style={styles.historyDate}>{item.date} • {item.weight}</Text>
              </View>
              <Text style={styles.historyPoints}>+{item.points} Pts</Text>
            </View>
          ))}
        </View>

        {/* Settings Menu */}
        <View style={styles.menuSection}>
          <MenuItem
            icon={Info}
            label="App Information"
            onPress={() => handleNavigateToSettings('AppInformation')}
          />
          <MenuItem
            icon={HelpCircle}
            label="Support Center"
            onPress={() => handleNavigateToSettings('SupportCenter')}
          />
        </View>

        {/* Logout Button */}
        <Pressable
          style={styles.logoutButtonContainer}
          onPress={handleLogout}
        >
          <View style={styles.logoutButton}>
            <LogOut size={18} color={colors.danger} strokeWidth={2} />
            <Text style={styles.logoutButtonText}>SAIR</Text>
          </View>
        </Pressable>

        <View style={{ height: 80 }} />
      </ScrollView>

      <FloatingTabBar
        tabs={mockHomeData.tabs}
        activeKey={activeTab}
        onChange={handleTabChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  statusCardsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  historySection: {
    marginVertical: spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  viewAllButton: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyIconContainer: {
    marginRight: spacing.md,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIconText: {
    fontSize: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyMaterial: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  historyDate: {
    fontSize: 11,
    color: colors.muted,
  },
  historyPoints: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  menuSection: {
    marginVertical: spacing.lg,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: 16,
    gap: spacing.sm,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
});

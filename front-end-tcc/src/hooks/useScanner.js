import { useCallback, useMemo, useState } from 'react';
import { useDiscards } from './useDiscards';
import { useMaterials } from './useMaterials';
import { useSession } from './useSession';

const WEEKLY_GOAL_ITEMS = 20;

const isSameDay = (date, base = new Date()) =>
  date.getFullYear() === base.getFullYear() &&
  date.getMonth() === base.getMonth() &&
  date.getDate() === base.getDate();

const isThisWeek = (date, base = new Date()) => {
  const start = new Date(base);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
};

export const useScanner = () => {
  const [scannedCode, setScannedCode] = useState(null);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const materialsState = useMaterials();
  const discardsState = useDiscards();
  const sessionState = useSession();

  const todayMetrics = useMemo(() => {
    const todayDiscards = discardsState.discards.filter((discard) =>
      isSameDay(new Date(discard.created_at))
    );

    return {
      points: todayDiscards.reduce((sum, discard) => sum + Number(discard.points_awarded ?? 0), 0),
      items: todayDiscards.length,
    };
  }, [discardsState.discards]);

  const weeklyGoal = useMemo(() => {
    const weeklyItems = discardsState.discards.filter((discard) =>
      isThisWeek(new Date(discard.created_at))
    ).length;
    const progress = Math.min(100, Math.round((weeklyItems / WEEKLY_GOAL_ITEMS) * 100));

    return {
      label: 'META SEMANAL',
      value: `${progress}%`,
      progress,
      weeklyItems,
      target: WEEKLY_GOAL_ITEMS,
    };
  }, [discardsState.discards]);

  const scanMachine = useCallback(
    async (machineQr) => {
      setScannedCode(machineQr);
      const session = await sessionState.startSession(machineQr);
      setLastConnectedAt(new Date());
      return session;
    },
    [sessionState]
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      materialsState.refetch({ refresh: true }),
      discardsState.refetch({ refresh: true }),
    ]);
  }, [discardsState, materialsState]);

  const resetScan = useCallback(() => {
    setScannedCode(null);
    sessionState.resetSession();
  }, [sessionState]);

  return {
    acceptedMaterials: materialsState.materials,
    discards: discardsState.discards,
    error: materialsState.error || discardsState.error || sessionState.error,
    errorMessage: sessionState.errorMessage,
    lastConnectedAt,
    loading: materialsState.loading || discardsState.loading,
    machineConnected: Boolean(sessionState.session?.machine),
    manualModalVisible,
    refreshing: materialsState.refreshing || discardsState.refreshing,
    scannedCode,
    scanning: sessionState.loading,
    session: sessionState.session,
    sessionActive: Boolean(sessionState.session),
    setManualModalVisible,
    scanMachine,
    refresh,
    resetScan,
    todayMetrics,
    weeklyGoal,
  };
};

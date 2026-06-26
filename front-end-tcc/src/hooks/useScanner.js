import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDiscards } from './useDiscards';
import { useMaterials } from './useMaterials';
import { useSession } from './useSession';

const WEEKLY_GOAL_ITEMS = 20;
const SESSION_POLL_INTERVAL_MS = 3000;
const SESSION_STATUS = {
  idle: 'idle',
  active: 'active',
  completed: 'completed',
  expired: 'expired',
};

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
  const [sessionStatus, setSessionStatus] = useState(SESSION_STATUS.idle);
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
      setSessionStatus(SESSION_STATUS.active);
      setLastConnectedAt(new Date());
      return session;
    },
    [sessionState.startSession]
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      materialsState.refetch({ refresh: true }),
      discardsState.refetch({ refresh: true }),
    ]);
  }, [discardsState, materialsState]);

  const resetScan = useCallback(() => {
    setScannedCode(null);
    setSessionStatus(SESSION_STATUS.idle);
    sessionState.resetSession();
  }, [sessionState.resetSession]);

  const finishSession = useCallback(
    (status) => {
      setSessionStatus(status);
      sessionState.resetSession();
    },
    [sessionState.resetSession]
  );

  useEffect(() => {
    const session = sessionState.session;
    if (!session) return undefined;

    const syncSession = async () => {
      const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
      if (expiresAt && expiresAt <= new Date()) {
        finishSession(SESSION_STATUS.expired);
        await discardsState.refetch({ refresh: true });
        return;
      }

      const latestDiscards = await discardsState.refetch({ refresh: true });
      const sessionCompleted = latestDiscards.some(
        (discard) => Number(discard.session_id) === Number(session.id) && discard.is_validated
      );

      if (sessionCompleted) {
        finishSession(SESSION_STATUS.completed);
      }
    };

    const timer = setInterval(syncSession, SESSION_POLL_INTERVAL_MS);
    syncSession();

    return () => clearInterval(timer);
  }, [discardsState.refetch, finishSession, sessionState.session]);

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
    sessionStatus,
    setManualModalVisible,
    scanMachine,
    refresh,
    resetScan,
    todayMetrics,
    weeklyGoal,
  };
};

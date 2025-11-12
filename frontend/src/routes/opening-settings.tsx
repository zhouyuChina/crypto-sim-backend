import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRADING_PAIRS, type TradingPair } from '@/constants/trading-pairs';
import { Pencil, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const generatePlanId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const TAIPEI_TIMEZONE = 'Asia/Taipei';

const formatDateTimePartsForTaipei = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TAIPEI_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '00';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

const buildInputValueFromParts = (parts: ReturnType<typeof formatDateTimePartsForTaipei>) => {
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
};

const convertTaipeiInputToIso = (input: string): string => {
  if (!input) return new Date().toISOString();
  const normalized = input.match(/:\d{2}$/) ? input : `${input}:00`;
  return new Date(`${normalized}+08:00`).toISOString();
};

const getCurrentTaipeiDateTime = () => {
  const parts = formatDateTimePartsForTaipei(new Date());
  const input = buildInputValueFromParts(parts);
  return {
    input,
    iso: convertTaipeiInputToIso(input),
  };
};

const formatIsoToTaipeiInput = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString.slice(0, 19);
  }
  const parts = formatDateTimePartsForTaipei(date);
  return buildInputValueFromParts(parts);
};

interface OpeningPlan {
  id: string;
  name: string;
  startTime: string; // ISO string
  tradingPairs: TradingPair[];
  roundDuration: number; // seconds
  isActive: boolean;
  defaultResultMode: ResultFilterMode;
}

interface OpeningRound {
  id: string;
  planId: string;
  roundNumber: string;
  tradingPair: TradingPair;
  startTime: string;
  endTime: string;
  duration: number;
  winningDirection: 'BUY_UP' | 'BUY_DOWN';
  resultMode: ResultFilterMode;
}

interface OpeningRoundTrade {
  id: string;
  roundId: string;
  userId: string;
  userName: string;
  direction: 'BUY_UP' | 'BUY_DOWN';
  amount: number;
  placedAt: string;
}

const formatDurationCountdown = (
  round: OpeningRound,
  currentTime: number
): { text: string; isExpired: boolean } => {
  const end = new Date(round.endTime).getTime();
  const remaining = Math.max(end - currentTime, 0);
  const isExpired = remaining === 0;
  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    text: isExpired
      ? '已結束'
      : `${minutes > 0 ? `${minutes} 分 ` : ''}${seconds.toString().padStart(2, '0')} 秒`,
    isExpired,
  };
};

const DEFAULT_PLAN_ROUND_DURATION = 180;
const MAX_UPCOMING_ROUNDS = 1;
const ALLOWED_DURATIONS = [30, 60, 90, 120, 150, 180] as const;
const WINNING_DIRECTION_LABEL: Record<'BUY_UP' | 'BUY_DOWN', string> = {
  BUY_UP: '買漲',
  BUY_DOWN: '買跌',
};
const WINNING_DIRECTION_META: Record<'BUY_UP' | 'BUY_DOWN', { label: string; icon: LucideIcon; className: string }> = {
  BUY_UP: {
    label: WINNING_DIRECTION_LABEL.BUY_UP,
    icon: TrendingUp,
    className: 'bg-green-50 text-green-600 ring-1 ring-inset ring-green-200',
  },
  BUY_DOWN: {
    label: WINNING_DIRECTION_LABEL.BUY_DOWN,
    icon: TrendingDown,
    className: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
  },
};

type ResultFilterMode = 'ALL_PROFIT' | 'ALL_LOSS' | 'RANDOM' | 'MANUAL';

const RESULT_FILTER_LABEL: Record<ResultFilterMode, string> = {
  ALL_PROFIT: '全體用戶盈利',
  ALL_LOSS: '全體用戶虧損',
  RANDOM: '隨機分佈',
  MANUAL: '個別用戶設置',
};

const getOppositeDirection = (direction: 'BUY_UP' | 'BUY_DOWN'): 'BUY_UP' | 'BUY_DOWN' =>
  direction === 'BUY_UP' ? 'BUY_DOWN' : 'BUY_UP';

const MOCK_USERS = Array.from({ length: 10 }).map((_, index) => ({
  userId: `mock-user-${index + 1}`,
  userName: `模擬用戶 ${index + 1}`,
  isActive: index < 4,
  latestTradeAt: new Date(Date.now() - index * 90_000).toISOString(),
}));

const MOCK_TRADES = Array.from({ length: 20 }).map((_, index) => {
  const user = MOCK_USERS[index % MOCK_USERS.length];
  const tradingPair = index % 2 === 0 ? 'BTC/USDT' : 'ETH/USDT';
  return {
    id: `mock-trade-${index + 1}`,
    userId: user.userId,
    userName: user.userName,
    durationSeconds: 30 + (index % 4) * 30,
    direction: index % 2 === 0 ? 'BUY_UP' : 'BUY_DOWN',
    amount: 50 + (index % 5) * 25,
    placedAt: new Date(Date.now() - index * 45_000).toISOString(),
    isWinning: index % 3 === 0,
    tradingPair,
  };
});

const createMockRoundTrades = (
  round: OpeningRound,
  mode: 'FOLLOW_WIN' | 'OPPOSE_WIN' | 'RANDOM',
  winningDirection: 'BUY_UP' | 'BUY_DOWN',
  minimum = 4,
  maximum = 10
): OpeningRoundTrade[] => {
  let seed = round.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const count = Math.max(
    minimum,
    Math.min(maximum, Math.floor(random() * (maximum - minimum + 1)) + minimum)
  );

  const trades: OpeningRoundTrade[] = [];
  const startTime = new Date(round.startTime).getTime();
  const durationMs = (round.duration || 60) * 1000;

  for (let i = 0; i < count; i += 1) {
    const userIndex = Math.floor(random() * MOCK_USERS.length);
    let direction: 'BUY_UP' | 'BUY_DOWN';
    switch (mode) {
      case 'FOLLOW_WIN':
        direction = winningDirection;
        break;
      case 'OPPOSE_WIN':
        direction = getOppositeDirection(winningDirection);
        break;
      case 'RANDOM':
      default:
        direction = random() > 0.5 ? 'BUY_UP' : 'BUY_DOWN';
        break;
    }
    const amount = Math.round((random() * 900 + 100) / 10) * 10;
    const placedAt = new Date(
      startTime + Math.floor(random() * durationMs)
    ).toISOString();

    trades.push({
      id: `${round.id}-trade-${i}`,
      roundId: round.id,
      userId: `user-${userIndex + 1}`,
      userName: MOCK_USERS[userIndex].userName,
      direction,
      amount,
      placedAt
    });
  }

  return trades.sort(
    (a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()
  );
};

const applyPlanOutcomeToRound = (
  round: OpeningRound,
  plan: OpeningPlan,
  options: { forceReroll?: boolean } = {}
): { round: OpeningRound; trades: OpeningRoundTrade[] } => {
  const mode = round.resultMode ?? plan.defaultResultMode ?? 'RANDOM';
  let winningDirection: 'BUY_UP' | 'BUY_DOWN';
  if (!round.winningDirection || options.forceReroll) {
    winningDirection = Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN';
  } else {
    winningDirection = round.winningDirection;
  }

  const adjustedRound: OpeningRound = {
    ...round,
    winningDirection,
  };

  const trades = createMockRoundTrades(
    adjustedRound,
    mode === 'ALL_PROFIT'
      ? 'FOLLOW_WIN'
      : mode === 'ALL_LOSS'
        ? 'OPPOSE_WIN'
        : mode === 'MANUAL'
          ? 'RANDOM'
          : 'RANDOM',
    winningDirection
  );

  return { round: adjustedRound, trades };
};

const rebuildRoundsForPlan = (
  rounds: OpeningRound[],
  plan: OpeningPlan,
  options: { forceReroll?: boolean } = {}
): { rounds: OpeningRound[]; trades: Record<string, OpeningRoundTrade[]> } => {
  const tradesUpdate: Record<string, OpeningRoundTrade[]> = {};
  const updatedRounds = rounds.map(round => {
    if (round.planId !== plan.id) {
      return round;
    }
    const { round: updatedRound, trades } = applyPlanOutcomeToRound(round, plan, options);
    tradesUpdate[updatedRound.id] = trades;
    return updatedRound;
  });
  return { rounds: updatedRounds, trades: tradesUpdate };
};

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return {
      dateText: '無效日期',
      timeText: '--',
    };
  }

  return {
    dateText: date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    timeText: date.toLocaleTimeString('zh-TW', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
};

interface PlanDialogState {
  open: boolean;
  editingPlan: OpeningPlan | null;
  selectedPairs: Set<TradingPair>;
  startTimeInput: string;
  isActive: boolean;
  nameInput: string;
  defaultResultMode: ResultFilterMode;
  errors: Partial<Record<'name' | 'startTime' | 'tradingPairs', string>>;
}

const createInitialDialogState = (plan?: OpeningPlan): PlanDialogState => {
  const baseTime = formatIsoToTaipeiInput(getCurrentTaipeiDateTime().iso);
  return {
    open: false,
    editingPlan: plan ?? null,
    selectedPairs: new Set(plan ? plan.tradingPairs : ['BTC/USDT']),
    startTimeInput: plan ? formatIsoToTaipeiInput(plan.startTime) : baseTime,
    isActive: plan ? plan.isActive : false,
    nameInput: plan ? plan.name : '新開盤方案',
    defaultResultMode: plan?.defaultResultMode ?? 'RANDOM',
    errors: {},
  };
};

export const OpeningSettingsPage = () => {
  const [plans, setPlans] = useState<OpeningPlan[]>([]);
  const [dialogState, setDialogState] = useState<PlanDialogState>(() => createInitialDialogState());
  const [openedRounds, setOpenedRounds] = useState<OpeningRound[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => null);
  const [userSearch, setUserSearch] = useState('');
  const [tradeRows, setTradeRows] = useState(MOCK_TRADES);
  const [tradeDurationFilter, setTradeDurationFilter] = useState<'ALL' | 30 | 60 | 90 | 120 | 150 | 180>('ALL');
  const [selectedMiniRoundId, setSelectedMiniRoundId] = useState<string | null>(null);
  const [roundTrades, setRoundTrades] = useState<Record<string, OpeningRoundTrade[]>>({});
  const [tradeWinRule, setTradeWinRule] = useState<'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM'>('MANUAL');
  const roundCounterRef = useRef(1);
  const plansRef = useRef<OpeningPlan[]>(plans);
  const seededRef = useRef(false);
  const [roundDialog, setRoundDialog] = useState<{
    open: boolean;
    targetRound: OpeningRound | null;
    tradingPair: TradingPair | '';
    startTimeInput: string;
    durationValue: string;
    winningDirection: 'BUY_UP' | 'BUY_DOWN';
    errors: Partial<Record<'tradingPair' | 'startTime' | 'duration', string>>;
  }>({
    open: false,
    targetRound: null,
    tradingPair: '',
    startTimeInput: '',
    durationValue: String(ALLOWED_DURATIONS[1]),
    winningDirection: 'BUY_UP',
    errors: {},
  });

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  useEffect(() => {
    if (selectedPlanId && plans.some(plan => plan.id === selectedPlanId)) {
      return;
    }
    setSelectedPlanId(plans[0]?.id ?? null);
  }, [plans, selectedPlanId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeCount = useMemo(() => plans.filter(plan => plan.isActive).length, [plans]);
  const roundDialogPlanPairs = useMemo(() => {
    if (!roundDialog.targetRound) return TRADING_PAIRS;
    const plan = plans.find(p => p.id === roundDialog.targetRound?.planId);
    if (plan && plan.tradingPairs.length > 0) {
      return plan.tradingPairs;
    }
    return TRADING_PAIRS;
  }, [plans, roundDialog.targetRound]);

  const generateRoundsForPlan = useCallback((plan: OpeningPlan, batchSize = 1) => {
    if (plan.tradingPairs.length === 0 || plan.roundDuration <= 0) {
      return;
    }

    const createdRounds: OpeningRound[] = [];
    const tradesMap: Record<string, OpeningRoundTrade[]> = {};

    setOpenedRounds(prev => {
      const rounds = [...prev];
      for (let batch = 0; batch < batchSize; batch += 1) {
        plan.tradingPairs.forEach(pair => {
          const pairRounds = rounds
            .filter(round => round.planId === plan.id && round.tradingPair === pair)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

          const lastRound = pairRounds[pairRounds.length - 1];
          const start = lastRound ? new Date(lastRound.endTime) : new Date(plan.startTime);
          const end = new Date(start.getTime() + plan.roundDuration * 1000);

          const roundNumber = `R${roundCounterRef.current.toString().padStart(4, '0')}`;
          roundCounterRef.current += 1;

          const baseRound: OpeningRound = {
            id: `${plan.id}-${pair}-${start.getTime()}`,
            planId: plan.id,
            roundNumber,
            tradingPair: pair,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            duration: plan.roundDuration,
            resultMode: plan.defaultResultMode,
            winningDirection: Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN'
          };
          const { round: adjustedRound, trades } = applyPlanOutcomeToRound(
            baseRound,
            plan,
            { forceReroll: true }
          );
          rounds.push(adjustedRound);
          createdRounds.push(adjustedRound);
          tradesMap[adjustedRound.id] = trades;
        });
      }
      return rounds;
    });
    if (Object.keys(tradesMap).length > 0) {
      setRoundTrades(prev => ({
        ...prev,
        ...tradesMap,
      }));
    }
    if (createdRounds.length > 0) {
      setRoundTrades(prev => {
        const next = { ...prev };
        createdRounds.forEach(round => {
          if (!next[round.id]) {
            next[round.id] = tradesMap[round.id] ?? [];
          }
        });
        return next;
      });
    }
  }, []);

  const sortedRounds = useMemo(() => {
    return [...openedRounds].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [openedRounds]);

  const detailRounds = useMemo(() => {
    return [...openedRounds].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [openedRounds]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find(plan => plan.id === selectedPlanId) ?? null;
  }, [plans, selectedPlanId]);

  const selectedPlanRounds = useMemo(() => {
    if (!selectedPlanId) return [];
    return detailRounds.filter(round => round.planId === selectedPlanId);
  }, [detailRounds, selectedPlanId]);

  useEffect(() => {
    if (selectedPlanRounds.length === 0) {
      setSelectedMiniRoundId(null);
      return;
    }
    setSelectedMiniRoundId(prev => {
      if (!prev) {
        return selectedPlanRounds[0]?.id ?? null;
      }
      const exists = selectedPlanRounds.some(round => round.id === prev);
      return exists ? prev : selectedPlanRounds[0]?.id ?? null;
    });
  }, [selectedPlanRounds]);

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return MOCK_USERS;
    return MOCK_USERS.filter(user =>
      user.userName.toLowerCase().includes(keyword) ||
      user.userId.toLowerCase().includes(keyword)
    );
  }, [userSearch]);

  const activeUserCount = useMemo(() => filteredUsers.filter(user => user.isActive).length, [filteredUsers]);
  const inactiveUserCount = useMemo(() => filteredUsers.length - activeUserCount, [filteredUsers, activeUserCount]);

  const filteredTradeRows = useMemo(() => {
    const visibleUserIds = new Set(filteredUsers.map(user => user.userId));
    return tradeRows.filter(row => {
      if (!visibleUserIds.has(row.userId)) {
        return false;
      }
      if (tradeDurationFilter === 'ALL') {
        return true;
      }
      return row.durationSeconds === tradeDurationFilter;
    });
  }, [filteredUsers, tradeRows, tradeDurationFilter]);

  const selectedMiniRoundLabel = useMemo(() => {
    if (selectedPlanRounds.length === 0) {
      return '';
    }
    const activeRoundId = selectedMiniRoundId ?? selectedPlanRounds[0].id;
    const index = selectedPlanRounds.findIndex(round => round.id === activeRoundId);
    if (index === -1) {
      return '';
    }
    return `A${String(index + 1).padStart(2, '0')}`;
  }, [selectedMiniRoundId, selectedPlanRounds]);

  const selectedMiniRound = useMemo(() => {
    if (selectedPlanRounds.length === 0) {
      return null;
    }
    const activeRoundId = selectedMiniRoundId ?? selectedPlanRounds[0].id;
    return selectedPlanRounds.find(round => round.id === activeRoundId) ?? selectedPlanRounds[0];
  }, [selectedMiniRoundId, selectedPlanRounds]);

  const selectedMiniRoundTiming = useMemo(() => {
    if (!selectedMiniRound) {
      return null;
    }
    const startDate = new Date(selectedMiniRound.startTime);
    if (Number.isNaN(startDate.getTime())) {
      return null;
    }
    const duration = selectedMiniRound.duration || DEFAULT_PLAN_ROUND_DURATION;
    const endDate = new Date(startDate.getTime() + duration * 1000);
    const elapsedSeconds = Math.max(0, Math.floor((currentTime - startDate.getTime()) / 1000));
    const remainingSeconds = Math.max(duration - elapsedSeconds, 0);
    const isEnded = currentTime >= endDate.getTime();

    const formatLabel = (iso: string) => {
      const parts = formatDateLabel(iso);
      return `${parts.dateText} ${parts.timeText}`;
    };

    const formatCountdown = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return {
      startText: formatLabel(startDate.toISOString()),
      endText: formatLabel(endDate.toISOString()),
      countdownText: isEnded ? '此盤已結束' : `倒數 ${formatCountdown(remainingSeconds)}`,
    };
  }, [currentTime, selectedMiniRound]);

  const handleTradeWinRuleChange = useCallback((value: 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM') => {
    setTradeWinRule(value);
    if (value === 'MANUAL') {
      return;
    }
    setTradeRows(prev =>
      prev.map(trade => ({
        ...trade,
        isWinning:
          value === 'ALL_WIN'
            ? true
            : value === 'ALL_LOSE'
              ? false
              : Math.random() >= 0.5,
      }))
    );
  }, []);

  const handleToggleTradeResult = useCallback((tradeId: string, value: boolean) => {
    setTradeRows(prev => prev.map(trade => (trade.id === tradeId ? { ...trade, isWinning: value } : trade)));
    setTradeWinRule(prev => (prev === 'MANUAL' ? prev : 'MANUAL'));
  }, []);

  const roundMap = useMemo(() => {
    const map = new Map<string, OpeningRound>();
    openedRounds.forEach(round => {
      map.set(round.id, round);
    });
    return map;
  }, [openedRounds]);

  const getRoundStatus = useCallback((round: OpeningRound) => {
    const start = new Date(round.startTime).getTime();
    const end = new Date(round.endTime).getTime();
    if (currentTime < start) {
      return '未開始';
    }
    if (currentTime >= end) {
      return '已結束';
    }
    return '進行中';
  }, [currentTime]);

  const updateRoundOutcomeSettings = useCallback(
    (
      round: OpeningRound,
      overrides: Partial<OpeningRound>,
      options: { forceReroll?: boolean } = {}
    ) => {
      const plan = plansRef.current.find(planItem => planItem.id === round.planId);
      if (!plan) return;

      const mergedRound: OpeningRound = { ...round, ...overrides };
      const shouldReroll =
        options.forceReroll ??
        (overrides.resultMode !== 'MANUAL' &&
          !(overrides.resultMode === undefined && round.resultMode === 'MANUAL'));

      let tradesPatch: Record<string, OpeningRoundTrade[]> = {};
      setOpenedRounds(prev =>
        prev.map(item => {
          if (item.id !== round.id) {
            return item;
          }
          const merged: OpeningRound = { ...item, ...overrides };
          const { round: adjusted, trades } = applyPlanOutcomeToRound(merged, plan, {
            forceReroll: shouldReroll,
          });
          if (shouldReroll) {
            tradesPatch[adjusted.id] = trades;
          }
          return adjusted;
        })
      );
      if (Object.keys(tradesPatch).length > 0) {
        setRoundTrades(prev => ({
          ...prev,
          ...tradesPatch,
        }));
      }

      if (overrides.resultMode === 'ALL_PROFIT' || overrides.resultMode === 'ALL_LOSS') {
        const winDirection =
          overrides.winningDirection ??
          mergedRound.winningDirection ??
          'BUY_UP';
        const desiredDirection =
          overrides.resultMode === 'ALL_PROFIT'
            ? winDirection
            : getOppositeDirection(winDirection);
        setRoundTrades(prev => {
          const trades = prev[round.id] ?? [];
          const updatedTrades = trades.map(entry => ({
            ...entry,
            direction: desiredDirection,
          }));
          return {
            ...prev,
            [round.id]: updatedTrades,
          };
        });
      }
    },
    []
  );

  const handleTradeWinLossChange = useCallback(
    (round: OpeningRound, trade: OpeningRoundTrade, outcome: 'WIN' | 'LOSS') => {
      updateRoundOutcomeSettings(round, { resultMode: 'MANUAL' }, { forceReroll: false });
      const winningDir = round.winningDirection ?? 'BUY_UP';
      const desiredDirection =
        outcome === 'WIN' ? winningDir : getOppositeDirection(winningDir);

      setRoundTrades(prev => {
        const trades = prev[round.id] ?? [];
        const updatedTrades = trades.map(entry =>
          entry.id === trade.id ? { ...entry, direction: desiredDirection } : entry
        );
        return {
          ...prev,
          [round.id]: updatedTrades
        };
      });
    },
    [updateRoundOutcomeSettings]
  );

  const ensureContinuousRounds = useCallback(() => {
    const createdRounds: OpeningRound[] = [];
    const createdTrades: Record<string, OpeningRoundTrade[]> = {};
    setOpenedRounds(prev => {
      let rounds = [...prev];
      let changed = false;

      plansRef.current.forEach(plan => {
        if (plan.tradingPairs.length === 0) {
          return;
        }

        plan.tradingPairs.forEach(pair => {
          const pairRounds = rounds
            .filter(round => round.planId === plan.id && round.tradingPair === pair)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

          const addRound = (startMs: number): number | null => {
            const startDate = new Date(startMs);
            if (Number.isNaN(startDate.getTime())) {
              return null;
            }
            const endDate = new Date(startDate.getTime() + plan.roundDuration * 1000);
            const roundNumber = `R${roundCounterRef.current.toString().padStart(4, '0')}`;
            roundCounterRef.current += 1;
            const newRound: OpeningRound = {
              id: `${plan.id}-${pair}-${startDate.getTime()}`,
              planId: plan.id,
              roundNumber,
              tradingPair: pair,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              duration: plan.roundDuration,
              winningDirection: Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN',
              resultMode: plan.defaultResultMode,
            };
            const { round: adjustedRound, trades } = applyPlanOutcomeToRound(newRound, plan, {
              forceReroll: true,
            });
            rounds.push(adjustedRound);
            pairRounds.push(adjustedRound);
            createdRounds.push(adjustedRound);
            createdTrades[adjustedRound.id] = trades;
            pairRounds.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            changed = true;
            return endDate.getTime();
          };

          if (pairRounds.length === 0) {
            const initialStartMs = new Date(plan.startTime).getTime();
            if (!Number.isNaN(initialStartMs)) {
              addRound(initialStartMs);
            }
          }

          if (!plan.isActive) {
            return;
          }

          let latestEndMs =
            pairRounds.length > 0
              ? new Date(pairRounds[pairRounds.length - 1].endTime).getTime()
              : new Date(plan.startTime).getTime();

          let upcomingCount = pairRounds.filter(
            round => new Date(round.startTime).getTime() >= currentTime
          ).length;

          const desiredUpcoming = plan.isActive ? MAX_UPCOMING_ROUNDS : 0;
          while (upcomingCount < desiredUpcoming) {
            const startMs = Math.max(latestEndMs, currentTime);
            const nextEnd = addRound(startMs);
            if (!nextEnd) break;
            latestEndMs = nextEnd;
            upcomingCount += 1;
          }
        });
      });

      if (!changed) {
        return prev;
      }

      return rounds;
    });
    if (Object.keys(createdTrades).length > 0) {
      setRoundTrades(prev => ({
        ...prev,
        ...createdTrades,
      }));
    }
    if (createdRounds.length > 0) {
      setRoundTrades(prev => {
        const next = { ...prev };
        createdRounds.forEach(round => {
          if (!next[round.id]) {
            next[round.id] = createdTrades[round.id] ?? [];
          }
        });
        return next;
      });
    }
  }, [currentTime]);

  useEffect(() => {
    ensureContinuousRounds();
  }, [ensureContinuousRounds, currentTime]);

  useEffect(() => {
    if (seededRef.current) return;
    const now = getCurrentTaipeiDateTime();
    const samplePlan: OpeningPlan = {
      id: generatePlanId(),
      name: '大小盤功能測試',
      startTime: now.iso,
      tradingPairs: ['BTC/USDT', 'ETH/USDT'],
      roundDuration: DEFAULT_PLAN_ROUND_DURATION,
      isActive: true,
      defaultResultMode: 'RANDOM'
    };
    setPlans([samplePlan]);
    setSelectedPlanId(samplePlan.id);
    seededRef.current = true;
    generateRoundsForPlan(samplePlan, MAX_UPCOMING_ROUNDS);
  }, [generateRoundsForPlan]);

  const openCreateDialog = () => {
    setDialogState({
      ...createInitialDialogState(),
      open: true,
      editingPlan: null,
    });
  };

  const openEditDialog = (plan: OpeningPlan) => {
    setDialogState({
      ...createInitialDialogState(plan),
      open: true,
      editingPlan: plan,
    });
  };

  const closeDialog = () => {
    setDialogState((prev) => ({
      ...prev,
      open: false,
      errors: {},
    }));
  };

  const handleTogglePlan = (planId: string, value: boolean) => {
    const targetPlan = plans.find(plan => plan.id === planId);
    if (!targetPlan) return;

    const updatedPlan: OpeningPlan = { ...targetPlan, isActive: value };
    setPlans(prev => prev.map(plan => (plan.id === planId ? updatedPlan : plan)));

    if (value) {
      generateRoundsForPlan(updatedPlan, MAX_UPCOMING_ROUNDS);
    }
  };

  const handleDeletePlan = (planId: string) => {
    setPlans(prev => prev.filter(plan => plan.id !== planId));
    setOpenedRounds(prev => prev.filter(round => round.planId !== planId));
    setRoundTrades(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(roundId => {
        if (roundId.startsWith(`${planId}-`)) {
          delete next[roundId];
        }
      });
      return next;
    });
  };

  const handleRoundResultModeChange = useCallback(
    (round: OpeningRound, mode: ResultFilterMode) => {
      updateRoundOutcomeSettings(
        round,
        {
          resultMode: mode,
        },
        { forceReroll: mode !== 'MANUAL' }
      );
      if (mode === 'ALL_PROFIT' || mode === 'ALL_LOSS') {
        const desiredDirection =
          mode === 'ALL_PROFIT'
            ? round.winningDirection ?? 'BUY_UP'
            : getOppositeDirection(round.winningDirection ?? 'BUY_UP');
        setRoundTrades(prev => {
          const trades = prev[round.id] ?? [];
          const updatedTrades = trades.map(entry => ({
            ...entry,
            direction: desiredDirection,
          }));
          return {
            ...prev,
            [round.id]: updatedTrades,
          };
        });
      }
    },
    [updateRoundOutcomeSettings]
  );

  const handleSavePlan = () => {
    const errors: PlanDialogState['errors'] = {};
    const { nameInput, startTimeInput, selectedPairs, defaultResultMode } = dialogState;

    if (!nameInput.trim()) {
      errors.name = '請輸入方案名稱';
    }
    if (!startTimeInput.trim()) {
      errors.startTime = '請選擇開始時間';
    }
    if (selectedPairs.size === 0) {
      errors.tradingPairs = '至少選擇一個交易對';
    }

    if (Object.keys(errors).length > 0) {
      setDialogState(prev => ({ ...prev, errors }));
      return;
    }

    const planPayload: OpeningPlan = {
      id: dialogState.editingPlan ? dialogState.editingPlan.id : generatePlanId(),
      name: nameInput.trim(),
      startTime: convertTaipeiInputToIso(startTimeInput),
      tradingPairs: Array.from(selectedPairs),
      roundDuration: dialogState.editingPlan?.roundDuration ?? DEFAULT_PLAN_ROUND_DURATION,
      isActive: dialogState.isActive,
      defaultResultMode,
    };

    setPlans(prev => {
      if (dialogState.editingPlan) {
        return prev.map(plan => (plan.id === planPayload.id ? planPayload : plan));
      }
      return [...prev, planPayload];
    });

    closeDialog();
  };

  const handleRoundDurationChange = useCallback((round: OpeningRound, rawValue: number, overrides?: Partial<OpeningRound>) => {
    const plan = plansRef.current.find(planItem => planItem.id === round.planId);
    if (!plan) {
      return;
    }

    const fallback = ALLOWED_DURATIONS[0];
    const sanitized = ALLOWED_DURATIONS.includes(rawValue as typeof ALLOWED_DURATIONS[number])
      ? rawValue
      : fallback;

    const tradesUpdate: Record<string, OpeningRoundTrade[]> = {};
    setOpenedRounds(prev => {
      const cloned = prev.map(item => ({ ...item }));
      const targetIndex = cloned.findIndex(item => item.id === round.id);
      if (targetIndex === -1) {
        return prev;
      }

      const currentTarget = { ...cloned[targetIndex], ...overrides };
      currentTarget.duration = sanitized;
      cloned[targetIndex] = currentTarget;

      const filtered = cloned
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.planId === currentTarget.planId && item.tradingPair === currentTarget.tradingPair)
        .sort((a, b) => new Date(a.item.startTime).getTime() - new Date(b.item.startTime).getTime());

      const sortedIndex = filtered.findIndex(entry => entry.idx === targetIndex);
      if (sortedIndex === -1) {
        return prev;
      }

      let prevEnd: number | null = null;
      for (let i = 0; i < filtered.length; i += 1) {
        const { item, idx } = filtered[i];

        if (i < sortedIndex) {
          prevEnd = new Date(item.endTime).getTime();
          continue;
        }

        const startMs =
          i === sortedIndex && overrides?.startTime
            ? new Date(overrides.startTime).getTime()
            : prevEnd ?? new Date(item.startTime).getTime();
        const endMs = startMs + sanitized * 1000;
        prevEnd = endMs;

        const baseRound: OpeningRound = {
          ...cloned[idx],
          startTime: new Date(startMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          duration: sanitized,
          winningDirection:
            idx === targetIndex && overrides?.winningDirection
              ? overrides.winningDirection
              : cloned[idx].winningDirection,
          tradingPair: idx === targetIndex ? currentTarget.tradingPair : cloned[idx].tradingPair,
        };

        const { round: adjustedRound, trades } = applyPlanOutcomeToRound(baseRound, plan);
        cloned[idx] = adjustedRound;
        tradesUpdate[adjustedRound.id] = trades;
      }

      return cloned;
    });

    if (Object.keys(tradesUpdate).length > 0) {
      setRoundTrades(prev => ({
        ...prev,
        ...tradesUpdate,
      }));
    }

    setPlans(prev =>
      prev.map(planItem =>
        planItem.id === round.planId ? { ...planItem, roundDuration: sanitized } : planItem
      )
    );
  }, []);

  const openRoundDialog = (round: OpeningRound) => {
    if (getRoundStatus(round) === '已結束') {
      return;
    }
    setRoundDialog({
      open: true,
      targetRound: round,
      tradingPair: round.tradingPair,
      startTimeInput: formatIsoToTaipeiInput(round.startTime),
      durationValue: String(round.duration),
      winningDirection: round.winningDirection ?? 'BUY_UP',
      errors: {},
    });
  };

  const closeRoundDialog = () => {
    setRoundDialog(prev => ({
      ...prev,
      open: false,
      targetRound: null,
      errors: {},
    }));
  };

  const handleSaveRound = () => {
    if (!roundDialog.targetRound) return;

    const errors: typeof roundDialog.errors = {};
    if (!roundDialog.tradingPair) {
      errors.tradingPair = '請選擇交易對';
    }
    const planForValidation = plansRef.current.find(p => p.id === roundDialog.targetRound.planId);
    if (planForValidation && !planForValidation.tradingPairs.includes(roundDialog.tradingPair as TradingPair)) {
      errors.tradingPair = '僅可選擇此方案設定的交易對';
    }
    if (!roundDialog.startTimeInput) {
      errors.startTime = '請輸入開始時間';
    }
    const durationValue = parseInt(roundDialog.durationValue, 10);
    if (!ALLOWED_DURATIONS.includes(durationValue as typeof ALLOWED_DURATIONS[number])) {
      errors.duration = '請選擇有效的交易時長';
    }

    const startIso = convertTaipeiInputToIso(roundDialog.startTimeInput);
    const endTimeMs = new Date(startIso).getTime() + durationValue * 1000;
    const endIso = new Date(endTimeMs).toISOString();
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      if (endDate <= startDate) {
        errors.duration = '交易時長必須大於零';
      }
    }

    if (Object.keys(errors).length > 0) {
      setRoundDialog(prev => ({ ...prev, errors }));
      return;
    }

    const owningPlan =
      plansRef.current.find(p => p.id === roundDialog.targetRound?.planId) ??
      plans.find(p => p.id === roundDialog.targetRound?.planId);
    const effectiveResultMode =
      roundDialog.targetRound?.resultMode ??
      owningPlan?.defaultResultMode ??
      'RANDOM';

    handleRoundDurationChange(roundDialog.targetRound, durationValue, {
      tradingPair: roundDialog.tradingPair as TradingPair,
      startTime: startIso,
      winningDirection: roundDialog.winningDirection as 'BUY_UP' | 'BUY_DOWN',
      resultMode: effectiveResultMode,
    });
    closeRoundDialog();
  };

  const handleDateTimeInputInteraction = useCallback(
    (event: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
      if (typeof (event.currentTarget as HTMLInputElement).showPicker === 'function') {
        (event.currentTarget as HTMLInputElement).showPicker();
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">開盤設置</h1>
          <p className="text-sm text-muted-foreground">管理自動開盤產生的排程與交易對。</p>
          <p className="text-xs text-muted-foreground mt-1">目前共有 {plans.length} 組設定，其中 {activeCount} 組正在持續生成。</p>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto" size="lg">
          <Plus className="mr-2 h-4 w-4" /> 新增開盤方案
        </Button>
      </div>

      <Tabs defaultValue="management" className="space-y-6">
        <TabsList>
          <TabsTrigger value="management">大盤管理</TabsTrigger>
          <TabsTrigger value="details">開盤細節</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>開盤方案列表</CardTitle>
              <CardDescription>開啟開關後，系統會依照設定的開始時間與每盤時間產生交易。</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {plans.length === 0 ? (
                <div className="py-20 text-center text-sm text-muted-foreground">目前尚未建立開盤方案。</div>
              ) : (
                <div className="overflow-auto" style={{ minHeight: 0 }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">方案名稱</TableHead>
                        <TableHead className="min-w-[180px]">開始時間</TableHead>
                        <TableHead className="min-w-[240px]">交易對</TableHead>
                        <TableHead className="min-w-[140px]">每盤時間（秒）</TableHead>
                        <TableHead className="min-w-[120px]">持續生成</TableHead>
                        <TableHead className="min-w-[140px] text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map(plan => {
                        const { dateText, timeText } = formatDateLabel(plan.startTime);
                        return (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{dateText}</span>
                                <span className="text-xs text-muted-foreground">{timeText}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {plan.tradingPairs.map(pair => (
                                  <Badge key={pair} variant="secondary">{pair}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{plan.roundDuration}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={plan.isActive}
                                  onCheckedChange={(value) => handleTogglePlan(plan.id, value)}
                                  id={`plan-active-${plan.id}`}
                                />
                                <Label htmlFor={`plan-active-${plan.id}`} className="text-xs text-muted-foreground">
                                  {plan.isActive ? '已開啟' : '未開啟'}
                                </Label>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditDialog(plan)}
                                  aria-label="編輯開盤方案"
                                  disabled={openedRounds.some(round => round.planId === plan.id && getRoundStatus(round) !== '未開始')}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeletePlan(plan.id)}
                                  aria-label="刪除開盤方案"
                                  disabled={openedRounds.some(round => round.planId === plan.id && getRoundStatus(round) !== '未開始')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>開盤篩選器</CardTitle>
              <CardDescription>選擇要檢視的開盤並預覽其基本設定。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="details-plan-select">開盤</Label>
                  <Select
                    value={selectedPlanId ?? ''}
                    onValueChange={(value) => setSelectedPlanId(value || null)}
                  >
                    <SelectTrigger id="details-plan-select">
                      <SelectValue placeholder="選擇開盤" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>開始時間</Label>
                  <Input
                    value={selectedPlan ? formatDateLabel(selectedPlan.startTime).dateText + ' ' + formatDateLabel(selectedPlan.startTime).timeText : ''}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>自動生成</Label>
                  <div className="flex items-center justify-between rounded-md border px-4 py-3">
                    <p className="text-xs text-muted-foreground">每一小盤結束是否再自動生成一個小盤</p>
                    <Switch
                      checked={selectedPlan?.isActive ?? false}
                      onCheckedChange={value => selectedPlan && handleTogglePlan(selectedPlan.id, value)}
                      disabled={!selectedPlan}
                    />
                  </div>
                </div>
              </div>
              {selectedPlanRounds.length > 0 ? (
                <div className="col-span-3">
                  <Tabs value={selectedMiniRoundId ?? selectedPlanRounds[0].id} onValueChange={value => setSelectedMiniRoundId(value)}>
                    <TabsList className="flex w-full overflow-x-auto justify-start">
                      {selectedPlanRounds.map((round, index) => (
                        <TabsTrigger key={round.id} value={round.id} className="whitespace-nowrap px-[8px] py-[4px] text-xs sm:text-sm">
                          A{String(index + 1).padStart(2, '0')}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.3fr),minmax(0,0.7fr)]">
            <Card>
              <CardHeader>
                <CardTitle>用戶列表</CardTitle>
                <CardDescription>顯示目前模擬的 10 位用戶資料。</CardDescription>
                <p className="text-xs text-muted-foreground">
                  目前顯示 {filteredUsers.length} 位用戶，其中進行中 {activeUserCount} 位，未進行 {inactiveUserCount} 位。
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="搜尋用戶名稱或 ID..."
                  value={userSearch}
                  onChange={event => setUserSearch(event.target.value)}
                />
                {filteredUsers.map(user => (
                  <div key={user.userId} className="flex items-center justify-between rounded-md border px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.userName}</p>
                      <p className="text-xs text-muted-foreground">ID：{user.userId}</p>
                      <p className="text-xs text-muted-foreground">
                        最新成交：{formatDateLabel(user.latestTradeAt).dateText}{' '}
                        {formatDateLabel(user.latestTradeAt).timeText}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isActive ? <Badge variant="info">進行中</Badge> : <Badge variant="outline">未進行</Badge>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{selectedMiniRoundLabel ? `${selectedMiniRoundLabel} 交易盤詳情` : '交易詳情'}</CardTitle>
                    <CardDescription>可切換輸贏並檢視用戶的下注資訊。</CardDescription>
                    {selectedMiniRoundTiming ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs sm:text-sm text-blue-600">
                        <span>開始：{selectedMiniRoundTiming.startText}</span>
                        <span>結束：{selectedMiniRoundTiming.endText}</span>
                        <span>{selectedMiniRoundTiming.countdownText}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">輸贏規則</span>
                    <Select value={tradeWinRule} onValueChange={value => handleTradeWinRuleChange(value as 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM')}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="選擇規則" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_LOSE">全用戶輸</SelectItem>
                        <SelectItem value="ALL_WIN">全用戶贏</SelectItem>
                        <SelectItem value="MANUAL">個別設置</SelectItem>
                        <SelectItem value="RANDOM">隨機</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={String(tradeDurationFilter)} onValueChange={value => setTradeDurationFilter(value === 'ALL' ? 'ALL' : Number(value) as typeof tradeDurationFilter)}>
                  <TabsList className="flex flex-wrap justify-start">
                    {['ALL', 30, 60, 90, 120, 150, 180].map(option => (
                      <TabsTrigger key={option} value={String(option)} className="text-xs sm:text-sm">
                        {option === 'ALL' ? '全部' : `${option}s`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                {filteredTradeRows.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    目前沒有符合條件的交易資料。
                  </div>
                ) : (
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">輸 → 贏</TableHead>
                          <TableHead className="w-[200px]">用戶／交易對</TableHead>
                          <TableHead className="w-[120px]">下注秒數</TableHead>
                          <TableHead className="w-[140px]">買漲／買跌</TableHead>
                          <TableHead className="w-[140px]">下注金額</TableHead>
                          <TableHead className="w-[180px]">下注時間</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTradeRows.map(trade => {
                          const meta = WINNING_DIRECTION_META[trade.direction];
                          const IconComponent = meta.icon;
                          const placedAt = formatDateLabel(trade.placedAt);
                          return (
                            <TableRow key={trade.id}>
                              <TableCell>
                                <Switch
                                  checked={trade.isWinning}
                                  onCheckedChange={value => handleToggleTradeResult(trade.id, value)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm text-foreground">{trade.userName}</span>
                                  <span className="text-xs text-muted-foreground">{trade.userId}</span>
                                  <span className="text-xs text-muted-foreground">交易對：{trade.tradingPair}</span>
                                </div>
                              </TableCell>
                              <TableCell>{trade.durationSeconds} 秒</TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                                    meta.className
                                  )}
                                >
                                  <IconComponent className="h-3.5 w-3.5" />
                                  {WINNING_DIRECTION_LABEL[trade.direction]}
                                </span>
                              </TableCell>
                              <TableCell>${trade.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex flex-col text-xs text-muted-foreground">
                                  <span>{placedAt.dateText}</span>
                                  <span>{placedAt.timeText}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogState.open} onOpenChange={(open) => (open ? setDialogState(prev => ({ ...prev, open })) : closeDialog())}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogState.editingPlan ? '編輯開盤方案' : '新增開盤方案'}</DialogTitle>
            <DialogDescription>
              設定開始時間、交易對與每盤秒數，並決定是否立即啟用自動生成。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="plan-name">方案名稱</Label>
              <Input
                id="plan-name"
                value={dialogState.nameInput}
                onChange={(e) => setDialogState(prev => ({ ...prev, nameInput: e.target.value }))}
              />
              {dialogState.errors.name && (
                <p className="text-xs text-destructive">{dialogState.errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-start-time">開始時間</Label>
              <Input
                id="plan-start-time"
                type="datetime-local"
                step="1"
                value={dialogState.startTimeInput}
                onChange={(e) => setDialogState(prev => ({ ...prev, startTimeInput: e.target.value }))}
                className="pointer-events-auto"
                onClick={handleDateTimeInputInteraction}
                onFocus={handleDateTimeInputInteraction}
              />
              {dialogState.errors.startTime && (
                <p className="text-xs text-destructive">{dialogState.errors.startTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-result-filter">輸贏篩選</Label>
              <Select
                value={dialogState.defaultResultMode}
                onValueChange={(value) =>
                  setDialogState(prev => ({
                    ...prev,
                    defaultResultMode: value as ResultFilterMode
                  }))
                }
              >
                <SelectTrigger id="plan-result-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESULT_FILTER_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">啟用自動生成</p>
                <p className="text-xs text-muted-foreground">開啟後會依照設定的交易對與時長自動產生開盤。</p>
              </div>
              <Switch
                checked={dialogState.isActive}
                onCheckedChange={(value) => setDialogState(prev => ({ ...prev, isActive: value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button
              onClick={handleSavePlan}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roundDialog.open} onOpenChange={(open) => (open ? setRoundDialog(prev => ({ ...prev, open })) : closeRoundDialog())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>編輯盤資訊</DialogTitle>
            <DialogDescription>僅限進行中的盤可調整交易對與時間。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>交易對</Label>
              <Select
                value={roundDialog.tradingPair || ''}
                onValueChange={(value) =>
                  setRoundDialog(prev => ({ ...prev, tradingPair: value as TradingPair }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇交易對" />
                </SelectTrigger>
                <SelectContent>
                  {roundDialogPlanPairs.map(pair => (
                    <SelectItem key={pair} value={pair}>
                      {pair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roundDialog.errors.tradingPair && (
                <p className="text-xs text-destructive">{roundDialog.errors.tradingPair}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="round-start-time">開始時間</Label>
              <Input
                id="round-start-time"
                type="datetime-local"
                step="1"
                value={roundDialog.startTimeInput}
                onChange={(e) => setRoundDialog(prev => ({ ...prev, startTimeInput: e.target.value }))}
                className="pointer-events-auto"
                onClick={handleDateTimeInputInteraction}
                onFocus={handleDateTimeInputInteraction}
              />
              {roundDialog.errors.startTime && (
                <p className="text-xs text-destructive">{roundDialog.errors.startTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="round-duration">交易時長（秒）</Label>
              <Select
                value={roundDialog.durationValue}
                onValueChange={(value) => setRoundDialog(prev => ({ ...prev, durationValue: value }))}
              >
                <SelectTrigger id="round-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_DURATIONS.map(option => (
                    <SelectItem key={option} value={String(option)}>
                      {option} 秒
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roundDialog.errors.duration && (
                <p className="text-xs text-destructive">{roundDialog.errors.duration}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>輸贏策略</Label>
                <Select
                  value={
                    roundDialog.targetRound?.resultMode ??
                    selectedPlan?.defaultResultMode ??
                    'RANDOM'
                  }
                  onValueChange={value =>
                    setRoundDialog(prev => ({
                      ...prev,
                      targetRound: prev.targetRound
                        ? { ...prev.targetRound, resultMode: value as ResultFilterMode }
                        : prev.targetRound,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_FILTER_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>勝出方向</Label>
              <Select
                value={roundDialog.winningDirection}
                onValueChange={(value) =>
                  setRoundDialog(prev => ({ ...prev, winningDirection: value as 'BUY_UP' | 'BUY_DOWN' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['BUY_UP', 'BUY_DOWN'] as const).map(direction => {
                    const meta = WINNING_DIRECTION_META[direction];
                    const IconComponent = meta.icon;
                    return (
                      <SelectItem key={direction} value={direction}>
                        <span className="flex items-center gap-2">
                          <IconComponent className={cn('h-4 w-4', direction === 'BUY_UP' ? 'text-green-600' : 'text-red-600')} />
                          <span className={direction === 'BUY_UP' ? 'text-green-600' : 'text-red-600'}>{meta.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRoundDialog}>
              取消
            </Button>
            <Button onClick={handleSaveRound}>確認</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

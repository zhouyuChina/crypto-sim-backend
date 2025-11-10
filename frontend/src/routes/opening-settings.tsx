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
  initialRounds?: number;
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
}

const INITIAL_BATCH_ROUNDS = 5;
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
  durationInput: string;
  initialRoundsInput: string;
  isActive: boolean;
  nameInput: string;
  errors: Partial<Record<'name' | 'startTime' | 'tradingPairs' | 'duration' | 'initialRounds', string>>;
}

const createInitialDialogState = (plan?: OpeningPlan): PlanDialogState => {
  const baseTime = formatIsoToTaipeiInput(getCurrentTaipeiDateTime().iso);
  return {
    open: false,
    editingPlan: plan ?? null,
    selectedPairs: new Set(plan ? plan.tradingPairs : ['BTC/USDT']),
    startTimeInput: plan ? formatIsoToTaipeiInput(plan.startTime) : baseTime,
    durationInput: plan ? plan.roundDuration.toString() : '60',
    initialRoundsInput: String(plan?.initialRounds ?? INITIAL_BATCH_ROUNDS),
    isActive: plan ? plan.isActive : false,
    nameInput: plan ? plan.name : '新開盤方案',
    errors: {},
  };
};

export const OpeningSettingsPage = () => {
  const [plans, setPlans] = useState<OpeningPlan[]>([]);
  const [dialogState, setDialogState] = useState<PlanDialogState>(() => createInitialDialogState());
  const [openedRounds, setOpenedRounds] = useState<OpeningRound[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => null);
  const roundCounterRef = useRef(1);
  const plansRef = useRef<OpeningPlan[]>(plans);
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

          rounds.push({
            id: `${plan.id}-${pair}-${start.getTime()}`,
            planId: plan.id,
            roundNumber,
            tradingPair: pair,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            duration: plan.roundDuration,
            winningDirection: Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN',
          });
        });
      }
      return rounds;
    });
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

  const ensureContinuousRounds = useCallback(() => {
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
            };
            rounds.push(newRound);
            pairRounds.push(newRound);
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

          const desiredUpcoming = plan.initialRounds ?? INITIAL_BATCH_ROUNDS;
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
  }, [currentTime]);

  useEffect(() => {
    ensureContinuousRounds();
  }, [ensureContinuousRounds, currentTime]);

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
      generateRoundsForPlan(updatedPlan, updatedPlan.initialRounds ?? INITIAL_BATCH_ROUNDS);
    }
  };

  const handleDeletePlan = (planId: string) => {
    setPlans(prev => prev.filter(plan => plan.id !== planId));
    setOpenedRounds(prev => prev.filter(round => round.planId !== planId));
  };

  const handleSavePlan = () => {
    const errors: PlanDialogState['errors'] = {};
    const { nameInput, startTimeInput, durationInput, initialRoundsInput, selectedPairs } = dialogState;

    if (!nameInput.trim()) {
      errors.name = '請輸入方案名稱';
    }
    if (!startTimeInput.trim()) {
      errors.startTime = '請選擇開始時間';
    }
    if (selectedPairs.size === 0) {
      errors.tradingPairs = '至少選擇一個交易對';
    }
    const durationValue = parseInt(durationInput, 10);
    if (!ALLOWED_DURATIONS.includes(durationValue as typeof ALLOWED_DURATIONS[number])) {
      errors.duration = '請輸入正確的每盤時間';
    }
    const initialRoundsValue = parseInt(initialRoundsInput, 10);
    if (Number.isNaN(initialRoundsValue) || initialRoundsValue <= 0) {
      errors.initialRounds = '請輸入有效的初始小盤數';
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
      roundDuration: ALLOWED_DURATIONS.includes(durationValue as typeof ALLOWED_DURATIONS[number]) ? durationValue : 60,
      isActive: dialogState.isActive,
      initialRounds: initialRoundsValue,
    };

    const isNewPlan = !dialogState.editingPlan;

    setPlans(prev => {
      if (dialogState.editingPlan) {
        return prev.map(plan => (plan.id === planPayload.id ? planPayload : plan));
      }
      return [...prev, planPayload];
    });

    const initialBatch = planPayload.initialRounds ?? INITIAL_BATCH_ROUNDS;
    if (isNewPlan) {
      generateRoundsForPlan(planPayload, initialBatch);
    } else if (planPayload.isActive) {
      generateRoundsForPlan(planPayload, initialBatch);
    }

    closeDialog();
  };

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

  const handleRoundDurationChange = useCallback((round: OpeningRound, rawValue: number, overrides?: Partial<OpeningRound>) => {
    const fallback = ALLOWED_DURATIONS[0];
    const sanitized = ALLOWED_DURATIONS.includes(rawValue as typeof ALLOWED_DURATIONS[number])
      ? rawValue
      : fallback;

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

        cloned[idx] = {
          ...cloned[idx],
          startTime: new Date(startMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          duration: sanitized,
          winningDirection:
            idx === targetIndex && currentTarget.winningDirection
              ? currentTarget.winningDirection
              : cloned[idx].winningDirection,
          tradingPair: idx === targetIndex ? currentTarget.tradingPair : cloned[idx].tradingPair,
        };
      }

      return cloned;
    });
    setPlans(prev =>
      prev.map(plan =>
        plan.id === round.planId ? { ...plan, roundDuration: sanitized } : plan
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
    const plan = plansRef.current.find(p => p.id === roundDialog.targetRound.planId);
    if (plan && !plan.tradingPairs.includes(roundDialog.tradingPair as TradingPair)) {
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

    handleRoundDurationChange(roundDialog.targetRound, durationValue, {
      tradingPair: roundDialog.tradingPair as TradingPair,
      startTime: startIso,
      winningDirection: roundDialog.winningDirection as 'BUY_UP' | 'BUY_DOWN',
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
              <CardTitle>選擇大盤</CardTitle>
              <CardDescription>挑選欲檢視的大盤，查看其開盤細節與小盤生成狀況。</CardDescription>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">目前尚未建立開盤方案。</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan-selector">大盤</Label>
                    <Select
                      value={selectedPlanId ?? ''}
                      onValueChange={(value) => setSelectedPlanId(value || null)}
                    >
                      <SelectTrigger id="plan-selector">
                        <SelectValue placeholder="選擇大盤" />
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

                  {selectedPlan ? (
                    <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                      <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-foreground">開始時間：</span>
                        {formatDateLabel(selectedPlan.startTime).dateText}{' '}
                        {formatDateLabel(selectedPlan.startTime).timeText}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">每盤時間：</span>
                        {selectedPlan.roundDuration} 秒
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-medium text-foreground">交易對：</span>
                        {selectedPlan.tradingPairs.length > 0 ? selectedPlan.tradingPairs.join('、') : '尚未設定'}
                      </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">持續生成</p>
                          <p className="text-xs text-muted-foreground">
                            控制此大盤是否在小盤結束後自動新增下一盤。
                          </p>
                        </div>
                        <Switch
                          checked={selectedPlan.isActive}
                          onCheckedChange={(value) => handleTogglePlan(selectedPlan.id, value)}
                          aria-label="切換持續生成"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>小盤資訊</CardTitle>
              <CardDescription>顯示所選大盤內各小盤的時間、秒數與生成狀況。</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedPlanId ? (
                <div className="py-16 text-center text-sm text-muted-foreground">請先選擇要檢視的大盤。</div>
              ) : selectedPlanRounds.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">目前沒有可顯示的小盤資料。</div>
              ) : (
                <div className="overflow-auto" style={{ minHeight: 0 }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">盤號</TableHead>
                        <TableHead className="min-w-[140px]">交易對</TableHead>
                        <TableHead className="min-w-[150px]">開始時間</TableHead>
                        <TableHead className="min-w-[150px]">結束時間</TableHead>
                        <TableHead className="min-w-[140px]">每盤時間（秒）</TableHead>
                        <TableHead className="min-w-[140px]">狀態</TableHead>
                        <TableHead className="min-w-[140px]">勝出方向</TableHead>
                        <TableHead className="min-w-[80px] text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlanRounds.map(round => {
                        const start = formatDateLabel(round.startTime);
                        const end = formatDateLabel(round.endTime);
                        const status = getRoundStatus(round);
                        return (
                          <TableRow key={round.id}>
                            <TableCell className="font-medium">{round.roundNumber}</TableCell>
                            <TableCell>{round.tradingPair}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{start.dateText}</span>
                                <span className="text-xs text-muted-foreground">{start.timeText}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{end.dateText}</span>
                                <span className="text-xs text-muted-foreground">{end.timeText}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                          <Select
                            value={String(round.duration)}
                            onValueChange={(value) => handleRoundDurationChange(round, parseInt(value, 10))}
                            disabled={status !== '未開始'}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[30, 60, 90, 120, 150, 180].map(option => (
                                <SelectItem key={option} value={String(option)}>
                                  {option} 秒
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  status === '進行中'
                                    ? 'default'
                                    : status === '未開始'
                                      ? 'outline'
                                      : 'secondary'
                                }
                                className={
                                  status === '進行中'
                                    ? 'bg-black text-white'
                                    : status === '未開始'
                                      ? 'border-muted text-muted-foreground'
                                      : undefined
                                }
                              >
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const meta = WINNING_DIRECTION_META[round.winningDirection ?? 'BUY_UP'];
                                const IconComponent = meta.icon;
                                return (
                                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', meta.className)}>
                                    <IconComponent className="h-4 w-4" />
                                    {meta.label}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openRoundDialog(round)}
                                  disabled={status !== '未開始'}
                                  aria-label="編輯盤資訊"
                                >
                                  <Pencil className="h-4 w-4" />
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
      </Tabs>

      <Dialog open={dialogState.open} onOpenChange={(open) => (open ? setDialogState(prev => ({ ...prev, open })) : closeDialog())}>
        <DialogContent className="sm:max-w-[640px]">
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
              <Label>交易對（可多選）</Label>
              <div className="max-h-48 overflow-y-auto rounded-md border p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {TRADING_PAIRS.map(pair => {
                    const checked = dialogState.selectedPairs.has(pair);
                    return (
                      <label key={pair} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setDialogState(prev => {
                              const next = new Set(prev.selectedPairs);
                              if (value) {
                                next.add(pair);
                              } else {
                                next.delete(pair);
                              }
                              return { ...prev, selectedPairs: next };
                            });
                          }}
                        />
                        <span>{pair}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {dialogState.errors.tradingPairs && (
                <p className="text-xs text-destructive">{dialogState.errors.tradingPairs}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-duration">每盤時間（秒）</Label>
              <Select
                value={dialogState.durationInput}
                onValueChange={(value) => setDialogState(prev => ({ ...prev, durationInput: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 60, 90, 120, 150, 180].map(option => (
                    <SelectItem key={option} value={String(option)}>
                      {option} 秒
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dialogState.errors.duration && (
                <p className="text-xs text-destructive">{dialogState.errors.duration}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-initial-rounds">初始生成小盤數</Label>
              <Input
                id="plan-initial-rounds"
                type="number"
                min={1}
                value={dialogState.initialRoundsInput}
                onChange={(e) => setDialogState(prev => ({ ...prev, initialRoundsInput: e.target.value }))}
              />
              {dialogState.errors.initialRounds && (
                <p className="text-xs text-destructive">{dialogState.errors.initialRounds}</p>
              )}
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

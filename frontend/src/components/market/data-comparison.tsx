import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settings';
import { binanceMarketService, type HistoricalPriceData } from '@/services/market';
import { RefreshCw } from 'lucide-react';
import { TRADING_PAIRS } from '@/constants/trading-pairs';

const TIME_INTERVAL_OPTIONS = [
  { label: '每秒', value: '1' },
  { label: '30 秒', value: '30' },
  { label: '60 秒', value: '60' },
  { label: '90 秒', value: '90' },
  { label: '120 秒', value: '120' },
  { label: '150 秒', value: '150' },
  { label: '180 秒', value: '180' }
] as const;

/**
 * 將顯示格式的交易對轉換為 Binance API 格式
 */
const toBinanceSymbol = (pair: string): string => {
  return pair.replace('/', '');
};

/**
 * 格式化時間為 HH:mm:ss
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * 格式化日期時間為 YYYY-MM-DD HH:mm:ss
 */
const formatDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * 解析日期時間字符串為時間戳
 * 支持格式：YYYY-MM-DDTHH:mm:ss 或 YYYY-MM-DDTHH:mm
 */
const parseDateTime = (dateTimeString: string): number => {
  // 如果格式不包含秒數，添加 :00
  if (dateTimeString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
    dateTimeString = dateTimeString + ':00';
  }
  return new Date(dateTimeString).getTime();
};

const formatListTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-TW', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatPrice = (price: number): string => {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
};


interface DataComparisonProps {
  refreshToken?: number;
  refreshInterval?: number;
}

export const DataComparison = ({ refreshToken = 0, refreshInterval = 0 }: DataComparisonProps) => {
  const { api } = useAuth();
  
  // 實際使用的篩選器狀態（用於數據查詢）
  const [selectedPair, setSelectedPair] = useState<string>('BTC/USDT');
  const [delayTime, setDelayTime] = useState<number>(30);
  const [timeInterval, setTimeInterval] = useState<number>(30);
  const [startTime, setStartTime] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() - 1);
    return formatDateTime(now);
  });
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedRealTime, setSelectedRealTime] = useState<number | null>(null);
  const [selectedHistoricalTime, setSelectedHistoricalTime] = useState<number | null>(null);

  // 臨時篩選器狀態（用於輸入，點擊套用後才會更新實際狀態）
  const [tempSelectedPair, setTempSelectedPair] = useState<string>('BTC/USDT');
  const [tempDelayTimeInput, setTempDelayTimeInput] = useState<string>('30');
  const [tempTimeInterval, setTempTimeInterval] = useState<string>('30');
  const [tempStartTime, setTempStartTime] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() - 1);
    return formatDateTime(now);
  });
  const [tempDurationMinutes, setTempDurationMinutes] = useState<string>('60');

  // 獲取延遲設置
  const { data: latencyConfig } = useQuery({
    queryKey: ['settings', 'latency'],
    queryFn: () => settingsService.getLatency(api),
    enabled: !!api,
  });

  // 初始化延遲時間
  useEffect(() => {
    if (latencyConfig?.userDataDelay !== undefined) {
      const delay = latencyConfig.userDataDelay;
      setDelayTime(delay);
      setTempDelayTimeInput(delay.toString());
    }
  }, [latencyConfig]);
  
  // 套用篩選器
  const handleApplyFilters = () => {
    setSelectedPair(tempSelectedPair);
    
    // 處理延遲時間
    const numValue = parseInt(tempDelayTimeInput, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
      setDelayTime(numValue);
    } else {
      setDelayTime(30);
      setTempDelayTimeInput('30');
    }
    
    // 處理時間間隔
    const intervalValue = parseInt(tempTimeInterval, 10);
    const allowedIntervals = TIME_INTERVAL_OPTIONS.map(option => parseInt(option.value, 10));
    if (!isNaN(intervalValue) && allowedIntervals.includes(intervalValue)) {
      setTimeInterval(intervalValue);
    } else {
      setTimeInterval(30);
      setTempTimeInterval('30');
    }

    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

    // 處理開始時間
    const startValue = tempStartTime.trim();
    if (dateTimeRegex.test(startValue)) {
      const finalStartTime = startValue.match(/:\d{2}$/) ? startValue : `${startValue}:00`;
      setStartTime(finalStartTime);
    } else {
      const date = new Date(startValue);
      if (!isNaN(date.getTime())) {
        setStartTime(formatDateTime(date));
      }
    }
    
    // 處理顯示時長
    const durationValue = parseInt(tempDurationMinutes, 10);
    if (!isNaN(durationValue) && durationValue > 0) {
      setDurationMinutes(durationValue);
    } else {
      setDurationMinutes(60);
      setTempDurationMinutes('60');
    }

    setSelectedRealTime(null);
    setSelectedHistoricalTime(null);
  };
  
  // 重置篩選器
  const handleResetFilters = () => {
    setTempSelectedPair(selectedPair);
    setTempDelayTimeInput(delayTime.toString());
    setTempTimeInterval(timeInterval.toString());
    setTempStartTime(startTime);
    setTempDurationMinutes(durationMinutes.toString());
  };

  // 計算時間範圍
  const timeRange = useMemo(() => {
    const start = parseDateTime(startTime);
    const durationMs = Math.max(durationMinutes, 1) * 60 * 1000;
    const end = start + durationMs;
    return { start, end };
  }, [startTime, durationMinutes]);

  // 獲取即時數據（前1小時到現在，每5秒刷新）
  const {
    data: realTimeData,
    isLoading: realTimeLoading,
    isFetching: isFetchingRealTime,
  } = useQuery({
    queryKey: [
      'binance-klines-realtime',
      toBinanceSymbol(selectedPair),
      timeRange.start,
      timeRange.end,
      refreshToken,
    ],
    queryFn: async () => {
      return await binanceMarketService.getKlines(
        toBinanceSymbol(selectedPair),
        '1m',
        timeRange.start,
        timeRange.end
      );
    },
    enabled: !!selectedPair,
    refetchInterval: false,
  });

  // 獲取整個時間範圍的歷史數據（用於下時間軸）
  const {
    data: allHistoricalData,
    isLoading: historicalLoading,
    isFetching: isFetchingHistorical,
  } = useQuery({
    queryKey: [
      'binance-klines',
      toBinanceSymbol(selectedPair),
      timeRange.start,
      timeRange.end,
      refreshToken,
    ],
    queryFn: async () => {
      return await binanceMarketService.getKlines(
        toBinanceSymbol(selectedPair),
        '1m',
        timeRange.start,
        timeRange.end
      );
    },
    enabled: !!selectedPair && timeRange.start < timeRange.end,
    refetchInterval: false,
  });

  const combinedRows = useMemo(() => {
    if (!realTimeData || realTimeData.length === 0) return [];

    const sortedReal = [...realTimeData].sort((a, b) => a.timestamp - b.timestamp);
    const historicalData = allHistoricalData ?? [];
    const sortedHistorical = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

    const rows: Array<{
      time: number;
      real: HistoricalPriceData;
      historical: (HistoricalPriceData & { displayTimestamp: number }) | null;
    }> = [];

    let realPointer = 0;
    let historicalPointer = 0;

    const step = timeInterval * 1000;
    for (let cursor = timeRange.start; cursor <= timeRange.end; cursor += step) {
      while (realPointer < sortedReal.length && sortedReal[realPointer].timestamp <= cursor) {
        realPointer++;
      }
      const realSample = realPointer > 0 ? sortedReal[realPointer - 1] : undefined;
      if (!realSample) continue;

      const targetHistoricalTime = cursor - delayTime * 1000;
      while (
        historicalPointer < sortedHistorical.length &&
        sortedHistorical[historicalPointer].timestamp <= targetHistoricalTime
      ) {
        historicalPointer++;
      }
      const historicalSample =
        historicalPointer > 0 ? sortedHistorical[historicalPointer - 1] : undefined;

      rows.push({
        time: cursor,
        real: realSample,
        historical: (historicalSample ?? sortedHistorical[0])
          ? {
              ...(historicalSample ?? sortedHistorical[0]),
              displayTimestamp: targetHistoricalTime,
            }
          : null,
      });
    }

    return rows;
  }, [realTimeData, allHistoricalData, delayTime, timeRange, timeInterval]);

  // 當資料更新時，預設選取最新資料
  useEffect(() => {
    if (combinedRows.length === 0) return;
    const latestRow = combinedRows[combinedRows.length - 1];
    const latestRealTimestamp = latestRow.time;
    const isOutOfRange =
      selectedRealTime === null ||
      selectedRealTime < timeRange.start ||
      selectedRealTime > timeRange.end;
    if (isOutOfRange) {
      setSelectedRealTime(latestRealTimestamp);
      setSelectedHistoricalTime(latestRow.historical ? latestRow.historical.timestamp : null);
    } else if (selectedHistoricalTime === null && latestRow.historical) {
      setSelectedHistoricalTime(latestRow.historical.timestamp);
    }
  }, [combinedRows, timeRange, selectedRealTime, selectedHistoricalTime]);

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">數據對照設置</h2>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2 w-[200px] min-w-[200px]">
            <Label htmlFor="pair-select">交易對</Label>
            <Select value={tempSelectedPair} onValueChange={setTempSelectedPair}>
              <SelectTrigger id="pair-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADING_PAIRS.map((pair) => (
                  <SelectItem key={pair} value={pair}>
                    {pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-[100px] min-w-[100px]">
            <Label htmlFor="delay-time">延遲時間（秒）</Label>
            <Input
              id="delay-time"
              type="number"
              min="1"
              max="100"
              step="1"
              value={tempDelayTimeInput}
              className="w-full"
              onChange={(e) => {
                const value = e.target.value;
                setTempDelayTimeInput(value);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const numValue = parseInt(value, 10);
                if (value === '' || isNaN(numValue)) {
                  setTempDelayTimeInput('1');
                } else {
                  let finalValue = numValue;
                  if (numValue < 1) {
                    finalValue = 1;
                  } else if (numValue > 100) {
                    finalValue = 100;
                  }
                  setTempDelayTimeInput(finalValue.toString());
                }
              }}
            />
          </div>

          <div className="space-y-2 w-[200px] min-w-[200px]">
            <Label htmlFor="time-interval">時間間隔</Label>
            <Select value={tempTimeInterval} onValueChange={setTempTimeInterval}>
              <SelectTrigger id="time-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_INTERVAL_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-1 flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <div className="flex items-center justify-between">
                <Label htmlFor="start-time">開始時間</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTempStartTime(formatDateTime(new Date()))}
                >
                  當前時間
                </Button>
              </div>
              <Input
                id="start-time"
                type="text"
                placeholder="2025-11-06T18:29:30"
                value={tempStartTime}
                onChange={(e) => setTempStartTime(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
                  if (dateTimeRegex.test(value)) {
                    if (!value.match(/:\d{2}$/)) {
                      setTempStartTime(value + ':00');
                    } else {
                      setTempStartTime(value);
                    }
                  } else {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      setTempStartTime(formatDateTime(date));
                    } else {
                      setTempStartTime(tempStartTime);
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">格式：YYYY-MM-DDTHH:mm:ss</p>
            </div>

            <div className="space-y-2 w-[200px] min-w-[200px]">
              <Label htmlFor="duration-minutes">顯示時間（分鐘）</Label>
              <Input
                id="duration-minutes"
                type="number"
                min="1"
                step="1"
                value={tempDurationMinutes}
                onChange={(e) => setTempDurationMinutes(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  const numValue = parseInt(value, 10);
                  if (value === '' || isNaN(numValue) || numValue <= 0) {
                    setTempDurationMinutes('60');
                  } else {
                    setTempDurationMinutes(numValue.toString());
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={handleApplyFilters} disabled={isFetchingRealTime || isFetchingHistorical}>
            套用
          </Button>
          <Button onClick={handleResetFilters} variant="outline" disabled={isFetchingRealTime || isFetchingHistorical}>
            重置
          </Button>
        </div>
      </div>

      {/* 數據列表 */}
      <Card>
        <CardHeader>
          <CardTitle>數據對照</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {combinedRows.length === 0 && (realTimeLoading || historicalLoading) ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              <span>載入數據...</span>
            </div>
          ) : combinedRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th colSpan={3} className="border-b border-border px-3 py-2 text-left text-muted-foreground">
                      {new Date(combinedRows[combinedRows.length - 1].time).toLocaleDateString('zh-TW')}
                    </th>
                  </tr>
                  <tr className="text-left text-muted-foreground">
                    <th className="border-b border-border px-3 py-2 w-32">時間</th>
                    <th className="border-b border-border px-3 py-2 w-40">即時數據</th>
                    <th className="border-b border-border px-3 py-2 w-48">歷史數據（延遲 {delayTime} 秒）</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedRows.slice(-120).map(row => {
                    const { real, historical, time } = row;
                    const isActive = selectedRealTime !== null && Math.abs(selectedRealTime - time) < 1000;
                    return (
                      <tr
                        key={time}
                        className={`cursor-pointer transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                        onClick={() => {
                          setSelectedRealTime(time);
                          setSelectedHistoricalTime(historical ? historical.timestamp : null);
                        }}
                      >
                        <td className="border-b border-border px-3 py-2 font-medium whitespace-nowrap">
                          {formatListTime(time)}
                        </td>
                        <td className="border-b border-border px-3 py-2 whitespace-nowrap">
                          ${formatPrice(real.price)}
                        </td>
                        <td className="border-b border-border px-3 py-2 whitespace-nowrap">
                          {historical ? (
                            <div className="flex flex-col">
                              <span>${formatPrice(historical.price)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatListTime(historical.displayTimestamp ?? historical.timestamp)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-6">目前沒有可顯示的數據</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


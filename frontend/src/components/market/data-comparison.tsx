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

// 39個交易對列表
const TRADING_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'USDC/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'BNB/USDT',
  'DOGE/USDT',
  'ADA/USDT',
  'LINK/USDT',
  'BNB/USD',
  'BNB/EUR',
  'BNB/TRY',
  'BNB/BRL',
  'BNB/AUD',
  'BTC/USD',
  'BTC/EUR',
  'BTC/TRY',
  'BTC/BRL',
  'BTC/AUD',
  'ETH/USD',
  'ETH/EUR',
  'ETH/TRY',
  'ETH/BRL',
  'ETH/AUD',
  'SOL/USD',
  'SOL/EUR',
  'XRP/USD',
  'XRP/EUR',
  'ADA/USD',
  'ADA/EUR',
  'DOGE/USD',
  'DOGE/EUR',
  'LINK/USD',
  'LINK/EUR',
  'BNB/BTC',
  'BNB/ETH',
  'BNB/ADA',
  'BNB/BUSD',
  'BNB/USDC',
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

interface TimeAxisProps {
  data: HistoricalPriceData[];
  selectedTime: number | null;
  onTimeSelect: (timestamp: number) => void;
  label: string;
  timeRange: { start: number; end: number };
  useDisplayTimestamp?: boolean; // 是否使用顯示時間戳（用於歷史數據）
}

const TimeAxis = ({ data, selectedTime, onTimeSelect, label, timeRange, useDisplayTimestamp = false }: TimeAxisProps) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // 找到當前選中或懸停的數據點
  const currentData = useMemo(() => {
    const time = hoverTime || selectedTime;
    if (!time || data.length === 0) return null;
    
    // 找到包含該時間點的 K 線（1分鐘間隔）
    // K 線時間戳是該分鐘的開始時間
    const klineTime = Math.floor(time / 60000) * 60000; // 向下取整到分鐘
    
    // 如果使用顯示時間戳（歷史數據），需要找到對應的數據
    if (useDisplayTimestamp) {
      return data.find((d: any) => {
        const displayTime = d.displayTimestamp || d.timestamp;
        return Math.floor(displayTime / 60000) * 60000 === klineTime;
      }) || data.reduce((prev: any, curr: any) => {
        const prevDisplay = prev.displayTimestamp || prev.timestamp;
        const currDisplay = curr.displayTimestamp || curr.timestamp;
        return Math.abs(currDisplay - klineTime) < Math.abs(prevDisplay - klineTime) ? curr : prev;
      });
    }
    
    return data.find(d => d.timestamp === klineTime) || data.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - klineTime) < Math.abs(prev.timestamp - klineTime) ? curr : prev;
    });
  }, [data, hoverTime, selectedTime, useDisplayTimestamp]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = timeRange.start + (timeRange.end - timeRange.start) * percentage;
    setHoverTime(time);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = timeRange.start + (timeRange.end - timeRange.start) * percentage;
    onTimeSelect(time);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  // 計算時間軸刻度
  const ticks = useMemo(() => {
    const tickCount = 10;
    const ticks: number[] = [];
    const interval = (timeRange.end - timeRange.start) / tickCount;
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(timeRange.start + interval * i);
    }
    return ticks;
  }, [timeRange]);

  const indicatorPosition = selectedTime
    ? ((selectedTime - timeRange.start) / (timeRange.end - timeRange.start)) * 100
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">{label}</Label>
        {currentData && (
          <div className="text-sm text-muted-foreground">
            {formatTime(useDisplayTimestamp ? ((currentData as any).displayTimestamp || currentData.timestamp) : currentData.timestamp)} - 價格: ${currentData.price.toLocaleString()}
          </div>
        )}
      </div>
      
      <div
        className="relative h-32 bg-muted rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      >
        {/* 時間軸刻度 */}
        <div className="absolute inset-0 flex items-end">
          {ticks.map((tick, index) => (
            <div
              key={index}
              className="absolute bottom-0 h-full border-l border-border"
              style={{ left: `${(index / ticks.length) * 100}%` }}
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(tick)}
              </div>
            </div>
          ))}
        </div>

        {/* 選中時間指示器 */}
        {indicatorPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{ left: `${indicatorPosition}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
              {selectedTime ? formatTime(selectedTime) : ''}
            </div>
          </div>
        )}

        {/* 懸停指示器 */}
        {hoverTime && hoverTime !== selectedTime && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50 z-5"
            style={{
              left: `${((hoverTime - timeRange.start) / (timeRange.end - timeRange.start)) * 100}%`,
            }}
          />
        )}

        {/* 價格線圖（簡化版） */}
        <svg className="absolute inset-0 w-full h-full">
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points={data
                .map((d: any) => {
                  const timestamp = useDisplayTimestamp ? (d.displayTimestamp || d.timestamp) : d.timestamp;
                  const x = ((timestamp - timeRange.start) / (timeRange.end - timeRange.start)) * 100;
                  const priceRange = Math.max(...data.map((d: any) => d.price)) - Math.min(...data.map((d: any) => d.price));
                  const y = priceRange > 0
                    ? 100 - ((d.price - Math.min(...data.map((d: any) => d.price))) / priceRange) * 100
                    : 50;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export const DataComparison = () => {
  const { api } = useAuth();
  
  // 實際使用的篩選器狀態（用於數據查詢）
  const [selectedPair, setSelectedPair] = useState<string>('BTC/USDT');
  const [delayTime, setDelayTime] = useState<number>(30);
  const [startTime, setStartTime] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() - 1);
    return formatDateTime(now);
  });
  const [endTime, setEndTime] = useState<string>(() => {
    return formatDateTime(new Date());
  });
  
  // 臨時篩選器狀態（用於輸入，點擊套用後才會更新實際狀態）
  const [tempSelectedPair, setTempSelectedPair] = useState<string>('BTC/USDT');
  const [tempDelayTimeInput, setTempDelayTimeInput] = useState<string>('30');
  const [tempStartTime, setTempStartTime] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() - 1);
    return formatDateTime(now);
  });
  const [tempEndTime, setTempEndTime] = useState<string>(() => {
    return formatDateTime(new Date());
  });
  const [selectedRealTime, setSelectedRealTime] = useState<number | null>(null);
  const [selectedHistoricalTime, setSelectedHistoricalTime] = useState<number | null>(null);

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
    
    // 處理開始時間
    const startValue = tempStartTime.trim();
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
    if (dateTimeRegex.test(startValue)) {
      const finalStartTime = startValue.match(/:\d{2}$/) ? startValue : startValue + ':00';
      setStartTime(finalStartTime);
    } else {
      const date = new Date(startValue);
      if (!isNaN(date.getTime())) {
        setStartTime(formatDateTime(date));
      }
    }
    
    // 處理結束時間
    const endValue = tempEndTime.trim();
    if (dateTimeRegex.test(endValue)) {
      const finalEndTime = endValue.match(/:\d{2}$/) ? endValue : endValue + ':00';
      setEndTime(finalEndTime);
    } else {
      const date = new Date(endValue);
      if (!isNaN(date.getTime())) {
        setEndTime(formatDateTime(date));
      }
    }
  };
  
  // 重置篩選器
  const handleResetFilters = () => {
    setTempSelectedPair(selectedPair);
    setTempDelayTimeInput(delayTime.toString());
    setTempStartTime(startTime);
    setTempEndTime(endTime);
  };

  // 計算時間範圍
  const timeRange = useMemo(() => {
    const start = parseDateTime(startTime);
    const end = parseDateTime(endTime);
    return { start, end };
  }, [startTime, endTime]);
  
  // 計算即時數據的時間範圍（前1小時到現在）
  // 使用 useState 和 useEffect 來動態更新時間範圍
  const [realTimeRange, setRealTimeRange] = useState(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000; // 前1小時
    return { start: oneHourAgo, end: now };
  });
  
  // 每5秒更新時間範圍的結束時間（避免頻繁閃爍）
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      setRealTimeRange({ start: oneHourAgo, end: now });
    }, 5000); // 每5秒更新一次
    
    return () => clearInterval(interval);
  }, []);

  // 獲取即時數據（前1小時到現在，每5秒刷新）
  const { data: realTimeData, isLoading: realTimeLoading } = useQuery({
    queryKey: ['binance-klines-realtime', toBinanceSymbol(selectedPair), realTimeRange.start, realTimeRange.end],
    queryFn: async () => {
      return await binanceMarketService.getKlines(
        toBinanceSymbol(selectedPair),
        '1m',
        realTimeRange.start,
        realTimeRange.end
      );
    },
    enabled: !!selectedPair,
    refetchInterval: 5000, // 每5秒刷新，避免頻繁閃爍
    refetchIntervalInBackground: true, // 後台也繼續刷新
  });

  // 獲取整個時間範圍的歷史數據（用於下時間軸）
  const { data: allHistoricalData, isLoading: historicalLoading } = useQuery({
    queryKey: ['binance-klines', toBinanceSymbol(selectedPair), timeRange.start, timeRange.end],
    queryFn: async () => {
      return await binanceMarketService.getKlines(
        toBinanceSymbol(selectedPair),
        '1m',
        timeRange.start,
        timeRange.end
      );
    },
    enabled: !!selectedPair && timeRange.start < timeRange.end,
  });

  // 計算歷史數據（下時間軸）：根據延遲時間調整時間戳
  // 歷史數據的時間軸顯示的是「延遲後的時間」，但數據本身是原始時間的數據
  const historicalData = useMemo(() => {
    if (!allHistoricalData) return [];
    // 創建一個映射，將原始時間戳映射到延遲後的時間戳
    return allHistoricalData.map(d => ({
      ...d,
      displayTimestamp: d.timestamp + delayTime * 1000, // 顯示時間（加上延遲）
      originalTimestamp: d.timestamp, // 原始時間戳
    }));
  }, [allHistoricalData, delayTime]);

  // 當選中即時時間時，計算對應的歷史時間
  useEffect(() => {
    if (selectedRealTime !== null && delayTime > 0) {
      const historicalTime = selectedRealTime - delayTime * 1000;
      setSelectedHistoricalTime(historicalTime);
    }
  }, [selectedRealTime, delayTime]);

  // 當選中歷史時間時，計算對應的即時時間
  useEffect(() => {
    if (selectedHistoricalTime !== null && delayTime > 0) {
      const realTime = selectedHistoricalTime + delayTime * 1000;
      setSelectedRealTime(realTime);
    }
  }, [selectedHistoricalTime, delayTime]);

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
            <Label htmlFor="start-time">開始時間</Label>
            <Input
              id="start-time"
              type="text"
              placeholder="2025-11-06T18:29:30"
              value={tempStartTime}
              onChange={(e) => setTempStartTime(e.target.value)}
              onBlur={(e) => {
                const value = e.target.value.trim();
                // 驗證格式：YYYY-MM-DDTHH:mm:ss
                const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
                if (dateTimeRegex.test(value)) {
                  // 格式正確，確保有秒數
                  if (!value.match(/:\d{2}$/)) {
                    // 沒有秒數，添加 :00
                    setTempStartTime(value + ':00');
                  } else {
                    setTempStartTime(value);
                  }
                } else {
                  // 嘗試解析並格式化
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    setTempStartTime(formatDateTime(date));
                  } else {
                    // 如果無法解析，恢復為當前值
                    setTempStartTime(tempStartTime);
                  }
                }
              }}
            />
            <p className="text-xs text-muted-foreground">格式：YYYY-MM-DDTHH:mm:ss</p>
          </div>

          <div className="space-y-2 w-[200px] min-w-[200px]">
            <Label htmlFor="end-time">結束時間</Label>
            <Input
              id="end-time"
              type="text"
              placeholder="2025-11-06T19:29:30"
              value={tempEndTime}
              onChange={(e) => setTempEndTime(e.target.value)}
              onBlur={(e) => {
                const value = e.target.value.trim();
                // 驗證格式：YYYY-MM-DDTHH:mm:ss
                const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
                if (dateTimeRegex.test(value)) {
                  // 格式正確，確保有秒數
                  if (!value.match(/:\d{2}$/)) {
                    // 沒有秒數，添加 :00
                    setTempEndTime(value + ':00');
                  } else {
                    setTempEndTime(value);
                  }
                } else {
                  // 嘗試解析並格式化
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    setTempEndTime(formatDateTime(date));
                  } else {
                    // 如果無法解析，恢復為當前值
                    setTempEndTime(tempEndTime);
                  }
                }
              }}
            />
            <p className="text-xs text-muted-foreground">格式：YYYY-MM-DDTHH:mm:ss</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleApplyFilters}>套用</Button>
          <Button onClick={handleResetFilters} variant="outline">重置</Button>
        </div>
      </div>

      {/* 即時數據時間軸 */}
      <Card>
        <CardContent className="pt-6">
          {realTimeLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              <span>載入即時數據...</span>
            </div>
          ) : (
            <TimeAxis
              label="即時數據"
              data={realTimeData || []}
              selectedTime={selectedRealTime}
              onTimeSelect={setSelectedRealTime}
              timeRange={realTimeRange}
            />
          )}
        </CardContent>
      </Card>

      {/* 歷史數據時間軸 */}
      <Card>
        <CardContent className="pt-6">
          {historicalLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              <span>載入歷史數據...</span>
            </div>
          ) : (
            <TimeAxis
              label={`歷史數據（延遲 ${delayTime} 秒）`}
              data={historicalData as any}
              selectedTime={selectedHistoricalTime}
              onTimeSelect={setSelectedHistoricalTime}
              timeRange={timeRange}
              useDisplayTimestamp={true}
            />
          )}
        </CardContent>
      </Card>

      {/* 數據對照顯示 */}
      {selectedRealTime !== null && (
        <Card>
          <CardHeader>
            <CardTitle>數據對照</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">即時數據</h3>
                {(() => {
                  if (!realTimeData || realTimeData.length === 0) {
                    return <div className="text-muted-foreground">無數據</div>;
                  }
                  
                  // 找到對應的 K 線數據（向下取整到分鐘）
                  const klineTime = Math.floor(selectedRealTime / 60000) * 60000;
                  const data = realTimeData.find(d => d.timestamp === klineTime) 
                    || realTimeData.reduce((prev, curr) => {
                      return Math.abs(curr.timestamp - klineTime) < Math.abs(prev.timestamp - klineTime)
                        ? curr
                        : prev;
                    }, realTimeData[0]);
                  
                  if (!data) {
                    return <div className="text-muted-foreground">無數據</div>;
                  }
                  
                  return (
                    <div className="space-y-1 text-sm">
                      <div>時間: {formatTime(selectedRealTime)}</div>
                      <div>K線時間: {formatTime(data.timestamp)}</div>
                      <div>價格: ${data.price.toLocaleString()}</div>
                      <div>開盤: ${data.open.toLocaleString()}</div>
                      <div>最高: ${data.high.toLocaleString()}</div>
                      <div>最低: ${data.low.toLocaleString()}</div>
                      <div>收盤: ${data.close.toLocaleString()}</div>
                      <div>交易量: {data.volume.toLocaleString()}</div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <h3 className="font-semibold mb-2">歷史數據（延遲 {delayTime} 秒）</h3>
                {selectedHistoricalTime !== null && (() => {
                  // 找到對應的原始歷史數據（減去延遲時間）
                  const originalTime = selectedHistoricalTime - delayTime * 1000;
                  const klineTime = Math.floor(originalTime / 60000) * 60000; // 向下取整到分鐘
                  const data = allHistoricalData?.find(d => d.timestamp === klineTime) 
                    || allHistoricalData?.reduce((prev, curr) => {
                      return Math.abs(curr.timestamp - klineTime) < Math.abs(prev.timestamp - klineTime)
                        ? curr
                        : prev;
                    }, allHistoricalData?.[0]);
                  
                  if (!data) {
                    return <div className="text-muted-foreground">無數據</div>;
                  }
                  
                  return (
                    <div className="space-y-1 text-sm">
                      <div>時間: {formatTime(selectedHistoricalTime)}</div>
                      <div>原始時間: {formatTime(data.timestamp)}</div>
                      <div>價格: ${data.price.toLocaleString()}</div>
                      <div>開盤: ${data.open.toLocaleString()}</div>
                      <div>最高: ${data.high.toLocaleString()}</div>
                      <div>最低: ${data.low.toLocaleString()}</div>
                      <div>收盤: ${data.close.toLocaleString()}</div>
                      <div>交易量: {data.volume.toLocaleString()}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


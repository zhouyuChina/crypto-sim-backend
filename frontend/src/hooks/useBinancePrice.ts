import { useState, useEffect, useCallback } from 'react';
import { binanceMarketService, type MarketData } from '@/services/market';

export interface UseBinancePriceOptions {
  refreshInterval?: number; // 刷新间隔（毫秒），默认 5000ms
  enabled?: boolean; // 是否啟用自動刷新，默认 true
}

export interface UseBinancePriceResult {
  data: MarketData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 获取 Binance 市場數據的 React Hook
 *
 * @param symbol - 交易對符号，如 'BTCUSDT'
 * @param options - 配置选项
 * @returns 市場數據、載入狀態、错误信息和手动刷新函数
 *
 * @example
 * ```tsx
 * function PriceDisplay() {
 *   const { data, loading, error } = useBinancePrice('BTCUSDT', { refreshInterval: 5000 });
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return <div>${data?.price.toLocaleString()}</div>;
 * }
 * ```
 */
export function useBinancePrice(
  symbol: string,
  options: UseBinancePriceOptions = {}
): UseBinancePriceResult {
  const { refreshInterval = 5000, enabled = true } = options;

  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setError(null);
      const marketData = await binanceMarketService.getMarketData(symbol);
      setData(marketData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    let intervalId: number | undefined;

    const fetchData = async () => {
      if (!isMounted) return;
      await fetchPrice();
    };

    // 立即获取一次數據
    void fetchData();

    // 設置定时刷新
    if (refreshInterval > 0) {
      intervalId = window.setInterval(fetchData, refreshInterval);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol, refreshInterval, enabled, fetchPrice]);

  return { data, loading, error, refetch: fetchPrice };
}

/**
 * 获取多個交易對市場數據的 React Hook
 *
 * @param symbols - 交易對符号数组
 * @param options - 配置选项
 * @returns 市場數據数组、載入狀態、错误信息和手动刷新函数
 */
export interface UseMultipleBinancePricesResult {
  data: MarketData[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMultipleBinancePrices(
  symbols: string[],
  options: UseBinancePriceOptions = {}
): UseMultipleBinancePricesResult {
  const { refreshInterval = 5000, enabled = true } = options;

  const [data, setData] = useState<MarketData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const marketData = await binanceMarketService.getMultipleMarketData(symbols);
      
      // 如果沒有任何數據返回，設置錯誤
      if (marketData.length === 0 && symbols.length > 0) {
        setError(new Error('無法獲取任何交易對數據，請檢查交易對是否有效'));
      } else {
        setData(marketData);
        // 如果有部分失敗，但不影響顯示成功的數據
        if (marketData.length < symbols.length) {
          console.warn(`部分交易對載入失敗: ${marketData.length}/${symbols.length} 成功`);
        }
      }
    } catch (err) {
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    let isMounted = true;
    let intervalId: number | undefined;

    const fetchData = async () => {
      if (!isMounted) return;
      await fetchPrices();
    };

    // 立即获取一次數據
    void fetchData();

    // 設置定时刷新
    if (refreshInterval > 0) {
      intervalId = window.setInterval(fetchData, refreshInterval);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbols, refreshInterval, enabled, fetchPrices]);

  return { data, loading, error, refetch: fetchPrices };
}

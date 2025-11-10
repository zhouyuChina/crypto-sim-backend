/**
 * Binance 市場數據服务
 * 直接調用 Binance 公開 API（無需 API 金鑰）
 */

// Binance API 基礎 URL
const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

/**
 * Binance 24小時 Ticker 響應類型
 * 參考：https://binance-docs.github.io/apidocs/spot/en/#24hr-ticker-price-change-statistics
 */
export interface BinanceTicker24hr {
  symbol: string;
  priceChange: string;              // 24小時價格變化
  priceChangePercent: string;       // 24小時價格變化百分比
  weightedAvgPrice: string;          // 加權平均價格
  prevClosePrice: string;           // 前一個收盤價
  lastPrice: string;                // 最新價格
  lastQty: string;                  // 最新數量
  bidPrice: string;                 // 買一價
  bidQty: string;                    // 買一量
  askPrice: string;                  // 賣一價
  askQty: string;                    // 賣一量
  openPrice: string;                // 24小時開盤價
  highPrice: string;                 // 24小時最高價
  lowPrice: string;                  // 24小時最低價
  volume: string;                    // 24小時交易量（基礎資產）
  quoteVolume: string;              // 24小時交易量（報價資產）
  openTime: number;                  // 統計開始時間（毫秒）
  closeTime: number;                 // 統計結束時間（毫秒）
  firstId: number;                   // 第一筆交易ID
  lastId: number;                    // 最後一筆交易ID
  count: number;                     // 24小時交易筆數
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  high24h: number;
  low24h: number;
  volume: string;
  lastUpdate: number;
}

/**
 * Binance K 線數據響應類型
 * 參考：https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data
 */
export interface BinanceKline {
  0: number;  // 開盤時間
  1: string;  // 開盤價
  2: string;  // 最高價
  3: string;  // 最低價
  4: string;  // 收盤價
  5: string;  // 交易量
  6: number;  // 收盤時間
  7: string;  // 報價資產交易量
  8: number;  // 交易筆數
  9: string;  // 主動買入交易量
  10: string; // 主動買入報價資產交易量
  11: string; // 忽略
}

export interface HistoricalPriceData {
  timestamp: number;  // 時間戳（毫秒）
  price: number;      // 價格
  open: number;       // 開盤價
  high: number;       // 最高價
  low: number;        // 最低價
  close: number;      // 收盤價
  volume: number;     // 交易量
}

export class BinanceMarketService {
  private cache = new Map<string, { data: MarketData; timestamp: number }>();
  private cacheDuration = 3000; // 3秒缓存

  /**
   * 獲取單個交易對的24小時價格統計
   * 直接調用 Binance API: GET /api/v3/ticker/24hr
   */
  async get24hrTicker(symbol: string): Promise<BinanceTicker24hr> {
    try {
      const url = `${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Binance API error for ${symbol}! status: ${response.status}, message: ${errorText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data: BinanceTicker24hr = await response.json();
      return data;
    } catch (error) {
      // 如果是網絡錯誤（CORS、網絡連接等）
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new Error(`網絡錯誤: 無法連接到 Binance API (${symbol})。可能是 CORS 問題或網絡連接問題。`);
        console.error(networkError.message, error);
        throw networkError;
      }
      console.error(`獲取 ${symbol} 數據失敗:`, error);
      throw error;
    }
  }

  /**
   * 獲取多個交易對的24小時價格統計
   * 直接調用 Binance API: GET /api/v3/ticker/24hr
   * 使用并行請求以提高效率
   */
  async getMultipleTickers(symbols: string[]): Promise<BinanceTicker24hr[]> {
    if (symbols.length === 0) {
      return [];
    }
    
    // 使用并行請求獲取所有交易對數據
    const promises = symbols.map((symbol) => this.get24hrTicker(symbol));
    
    // 使用 Promise.allSettled 以處理部分失敗的情況
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<BinanceTicker24hr> => 
        result.status === 'fulfilled'
      )
      .map((result) => result.value);
  }

  /**
   * 獲取格式化的市場數據（帶緩存）
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    const now = Date.now();
    const cached = this.cache.get(symbol);

    // 如果緩存存在且未過期
    if (cached && now - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      // 獲取新數據
      const ticker = await this.get24hrTicker(symbol);
      const currentPrice = parseFloat(ticker.lastPrice);
      const priceChange = parseFloat(ticker.priceChange);
      const priceChangePercent = parseFloat(ticker.priceChangePercent);

      const marketData: MarketData = {
        symbol: this.formatSymbolForDisplay(ticker.symbol),
        price: currentPrice,
        change: priceChange,
        changePercent: `${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`,
        high24h: parseFloat(ticker.highPrice),
        low24h: parseFloat(ticker.lowPrice),
        volume: this.formatVolume(parseFloat(ticker.volume)),
        lastUpdate: ticker.closeTime,
      };

      // 更新緩存
      this.cache.set(symbol, { data: marketData, timestamp: now });

      return marketData;
    } catch (error) {
      // 如果獲取失敗，嘗試返回緩存數據（即使過期）
      if (cached) {
        console.warn(`獲取 ${symbol} 數據失敗，使用緩存數據:`, error);
        return cached.data;
      }
      // 如果沒有緩存，重新拋出錯誤
      throw error;
    }
  }

  /**
   * 获取多個交易對的格式化數據
   * 使用 Promise.allSettled 以處理部分失敗的情況
   */
  async getMultipleMarketData(symbols: string[]): Promise<MarketData[]> {
    if (symbols.length === 0) {
      return [];
    }
    
    const promises = symbols.map((symbol) => this.getMarketData(symbol));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<MarketData> => 
        result.status === 'fulfilled'
      )
      .map((result) => result.value);
  }

  /**
   * 格式化交易量
   */
  private formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toFixed(2);
  }

  /**
   * 格式化交易對符號用於顯示
   * 將 BTCUSDT 轉換為 BTC/USDT
   */
  private formatSymbolForDisplay(symbol: string): string {
    // 匹配常見的報價資產（USDT, USD, EUR, BTC, ETH, BNB 等）
    const match = symbol.match(/^(\w+)(USDT|USD|EUR|BTC|ETH|BNB|BUSD|USDC|TRY|BRL|AUD)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return symbol;
  }

  /**
   * 獲取 K 線數據（歷史數據）
   * 直接調用 Binance API: GET /api/v3/klines
   */
  async getKlines(
    symbol: string,
    interval: string = '1m',
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<HistoricalPriceData[]> {
    try {
      let url = `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      if (startTime) {
        url += `&startTime=${startTime}`;
      }
      if (endTime) {
        url += `&endTime=${endTime}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Binance API error for ${symbol} klines! status: ${response.status}, message: ${errorText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data: BinanceKline[] = await response.json();
      
      return data.map((kline) => ({
        timestamp: kline[0],
        price: parseFloat(kline[4]), // 使用收盤價作為價格
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new Error(`網絡錯誤: 無法連接到 Binance API (${symbol})。可能是 CORS 問題或網絡連接問題。`);
        console.error(networkError.message, error);
        throw networkError;
      }
      console.error(`獲取 ${symbol} K 線數據失敗:`, error);
      throw error;
    }
  }

  /**
   * 獲取指定時間點的價格數據（用於即時數據）
   * 如果沒有精確匹配，返回最接近的數據
   */
  async getPriceAtTime(symbol: string, timestamp: number): Promise<HistoricalPriceData | null> {
    try {
      // 獲取包含該時間點的 K 線數據（使用 1 分鐘間隔）
      const startTime = timestamp - 60000; // 前1分鐘
      const endTime = timestamp + 60000;   // 後1分鐘
      const klines = await this.getKlines(symbol, '1m', startTime, endTime, 3);
      
      if (klines.length === 0) {
        return null;
      }
      
      // 找到最接近的 K 線
      const closest = klines.reduce((prev, curr) => {
        return Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp)
          ? curr
          : prev;
      });
      
      return closest;
    } catch (error) {
      console.error(`獲取 ${symbol} 在時間 ${timestamp} 的價格失敗:`, error);
      return null;
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 創建单例
export const binanceMarketService = new BinanceMarketService();


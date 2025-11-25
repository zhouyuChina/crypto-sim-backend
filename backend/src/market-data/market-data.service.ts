import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as WebSocket from 'ws';
import { firstValueFrom } from 'rxjs';

import { RealtimeService } from '../realtime/realtime.service';
// QueueService 暂时注释，开发模式下不使用队列
// import { QueueService } from '../queue/queue.service';

interface BinanceTickerEvent {
  s: string;
  c: string;
  P: string;
}

interface SocketState {
  socket: WebSocket;
  reconnectAttempts: number;
  pingInterval?: NodeJS.Timeout;
}

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly sockets = new Map<string, SocketState>();
  private readonly reconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly BASE_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 60000; // 60 seconds
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds
  private readonly PRICE_CACHE_TTL = 10_000; // 10 seconds
  private readonly priceCache = new Map<string, { price: number; ts: number }>();
  private readonly BINANCE_REST_BASE_URL = 'https://api.binance.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly realtimeService: RealtimeService,
    // QueueService 暂时注释
    // private readonly queueService: QueueService,
    private readonly httpService: HttpService
  ) {}

  onModuleInit(): void {
    // TODO: 暂时注释掉 Binance 连接，等其他功能开发完成后再启用
    // this.connectToBinanceStreams();
  }

  onModuleDestroy(): void {
    // Clear all reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();

    // Close all sockets
    this.sockets.forEach(state => {
      if (state.pingInterval) {
        clearInterval(state.pingInterval);
      }
      if (state.socket.readyState === WebSocket.OPEN) {
        state.socket.close(1000);
      } else if (state.socket.readyState === WebSocket.CONNECTING) {
        state.socket.terminate();
      }
    });
    this.sockets.clear();
  }

  // TODO: 暂时注释掉，等其他功能开发完成后再启用
  // private connectToBinanceStreams(): void {
  //   const symbols = this.configService.get<string[]>('marketData.binance.symbols');

  //   if (symbols) {
  //     symbols.forEach(symbol => this.openBinanceStream(symbol));
  //   }
  // }

  private scheduleReconnect(symbol: string): void {
    const state = this.sockets.get(symbol);
    const reconnectAttempts = state?.reconnectAttempts ?? 0;

    // Stop reconnecting after max attempts
    if (reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(
        `Max reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached for ${symbol}. Giving up.`
      );
      return;
    }

    // Clear any existing reconnect timer for this symbol
    const existingTimer = this.reconnectTimers.get(symbol);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    this.logger.log(
      `Scheduling reconnect for ${symbol} in ${delay}ms (attempt ${reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`
    );

    const timer = setTimeout(() => {
      this.logger.log(`Reconnecting Binance stream for ${symbol}`);
      this.reconnectTimers.delete(symbol);
      this.openBinanceStream(symbol, reconnectAttempts + 1);
    }, delay);

    this.reconnectTimers.set(symbol, timer);
  }

  private openBinanceStream(symbol: string, reconnectAttempts: number = 0): void {
    const baseUrl = this.configService.get<string>('marketData.binance.wsBaseUrl');
    const streamUrl = `${baseUrl}/${symbol.toLowerCase()}@ticker`;

    // Clean up existing socket if any
    const existing = this.sockets.get(symbol);
    if (existing) {
      if (existing.pingInterval) {
        clearInterval(existing.pingInterval);
      }
      existing.socket.removeAllListeners();
      if (existing.socket.readyState === WebSocket.OPEN) {
        existing.socket.close();
      } else if (existing.socket.readyState === WebSocket.CONNECTING) {
        existing.socket.terminate();
      }
      this.sockets.delete(symbol);
    }

    this.logger.log(`Connecting to Binance stream ${streamUrl}`);
    const socket = new WebSocket(streamUrl);
    const state: SocketState = {
      socket,
      reconnectAttempts
    };
    this.sockets.set(symbol, state);

    let errorHandled = false;
    let connectionTimeout: NodeJS.Timeout | null = null;

    // Set connection timeout
    connectionTimeout = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        this.logger.error(`Connection timeout for ${symbol} after ${this.CONNECTION_TIMEOUT}ms`);
        socket.terminate();
      }
    }, this.CONNECTION_TIMEOUT);

    socket.on('open', () => {
      this.logger.log(`${symbol} stream opened successfully`);
      errorHandled = false;

      // Clear connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }

      // Reset reconnect attempts on successful connection
      state.reconnectAttempts = 0;

      // Setup ping interval to keep connection alive
      state.pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        }
      }, this.PING_INTERVAL);
    });

    socket.on('pong', () => {
      this.logger.debug(`Received pong from ${symbol}`);
    });

    socket.on('message', data => {
      try {
        this.handleBinanceTicker(JSON.parse(data.toString()));
      } catch (error) {
        this.logger.error(`Failed to parse message for ${symbol}`, error);
      }
    });

    socket.on('error', error => {
      if (!errorHandled) {
        errorHandled = true;
        const err = error as Error;
        this.logger.error(
          `Binance stream error for ${symbol}: ${err.message}`,
          err.stack
        );

        // Clear connection timeout on error
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }

        // Clear ping interval
        if (state.pingInterval) {
          clearInterval(state.pingInterval);
          state.pingInterval = undefined;
        }
      }
    });

    socket.on('close', (code, reason) => {
      // Clear connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }

      // Clear ping interval
      if (state.pingInterval) {
        clearInterval(state.pingInterval);
        state.pingInterval = undefined;
      }

      if (!errorHandled) {
        this.logger.warn(
          `Binance stream for ${symbol} closed with code ${code}${reason ? `: ${reason.toString()}` : ''}`
        );
      }

      this.sockets.delete(symbol);
      this.scheduleReconnect(symbol);
    });
  }

  private handleBinanceTicker(event: BinanceTickerEvent): void {
    const price = Number(event.c);
    const changePercent = Number(event.P);
    const symbolKey = event.s.toUpperCase();

    this.priceCache.set(symbolKey, { price, ts: Date.now() });

    const update = {
      symbol: event.s,
      price,
      change24h: changePercent,
      ts: Date.now()
    };

    this.realtimeService.broadcastPriceUpdate(update);
    // TODO: 开发模式下暂时不使用队列
    // void this.queueService.enqueueMarketData({
    //   symbol: event.s,
    //   type: 'ticker',
    //   payload: update
    // });
  }

  async getLatestPrice(assetType: string): Promise<number> {
    const symbol = this.normalizeSymbol(assetType);
    if (!symbol) {
      throw new Error(`无法识别的资产类型: ${assetType}`);
    }

    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.ts <= this.PRICE_CACHE_TTL) {
      return cached.price;
    }

    const freshPrice = await this.fetchPriceFromRest(symbol);
    this.priceCache.set(symbol, { price: freshPrice, ts: Date.now() });
    return freshPrice;
  }

  private normalizeSymbol(assetType: string | undefined | null): string | null {
    if (!assetType) {
      return null;
    }

    const normalized = assetType.replace('/', '').toUpperCase();
    if (normalized.endsWith('USDT')) {
      return normalized;
    }
    return `${normalized}USDT`;
  }

  private async fetchPriceFromRest(symbol: string): Promise<number> {
    const url = `${this.BINANCE_REST_BASE_URL}/api/v3/ticker/price`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: { symbol },
          timeout: 5000, // 5秒超时
        }),
      );

      const price = Number(response.data?.price);
      if (!Number.isFinite(price)) {
        throw new Error('Binance API 未返回有效价格');
      }
      return price;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`请求 Binance 价格失败 (${symbol}): ${err.message}，使用模拟价格`);

      // 当Binance API不可用时，返回模拟价格
      return this.generateMockPrice(symbol);
    }
  }

  /**
   * 生成模拟价格（当Binance API不可用时使用）
   * 基于历史价格范围生成随机波动的价格
   */
  private generateMockPrice(symbol: string): number {
    // 基础价格范围（根据不同币种）
    const basePrices: Record<string, number> = {
      'BTCUSDT': 50000,
      'ETHUSDT': 3000,
      'BNBUSDT': 400,
      'SOLUSDT': 100,
      'XRPUSDT': 0.6,
      'ADAUSDT': 0.5,
      'DOGEUSDT': 0.1,
    };

    const basePrice = basePrices[symbol] || 1000; // 默认价格

    // 添加随机波动 (-2% 到 +2%)
    const volatility = 0.02;
    const randomFactor = 1 + (Math.random() * 2 - 1) * volatility;
    const mockPrice = basePrice * randomFactor;

    this.logger.log(`使用模拟价格 ${symbol}: ${mockPrice.toFixed(2)}`);
    return mockPrice;
  }

  // TODO: 暂时禁用 CoinGecko API 定时任务
  // @Cron(CronExpression.EVERY_10_MINUTES)
  async hydrateMetadata(): Promise<void> {
    const baseUrl = this.configService.get<string>('marketData.coingecko.baseUrl');
    const symbols = this.configService.get<string[]>('marketData.binance.symbols');

    if (!symbols) {
      return;
    }

    const ids = symbols.map(symbol => symbol.replace('usdt', '').toLowerCase()).join(',');
    const url = `${baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      // TODO: 开发模式下暂时不使用队列
      // await this.queueService.enqueueMarketData({
      //   symbol: 'metadata',
      //   type: 'ticker',
      //   payload: response.data
      // });
      this.logger.debug('CoinGecko metadata fetched', response.data);
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to fetch CoinGecko metadata', err.stack);
    }
  }
}

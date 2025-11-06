import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Settings2 } from 'lucide-react';
import { useMultipleBinancePrices } from '@/hooks/useBinancePrice';
import { MarketDataCard } from '@/components/market/market-data-card';
import { MarketDataTable } from '@/components/market/market-data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// 39個交易對列表（與交易流水頁面一致）
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
 * BTC/USDT -> BTCUSDT
 */
const toBinanceSymbol = (pair: string): string => {
  return pair.replace('/', '');
};

export const MarketDataPage = () => {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  // 預設選中所有交易對
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(
    new Set(TRADING_PAIRS)
  );
  const [showPairSelector, setShowPairSelector] = useState(false);

  // 將選中的交易對轉換為 Binance API 格式
  const selectedSymbols = useMemo(() => {
    return Array.from(selectedPairs).map(toBinanceSymbol);
  }, [selectedPairs]);

  const { data, loading, error, refetch } = useMultipleBinancePrices(selectedSymbols, {
    refreshInterval,
  });

  const handleRefresh = () => {
    void refetch();
  };

  const handleTogglePair = (pair: string) => {
    const newSelected = new Set(selectedPairs);
    if (newSelected.has(pair)) {
      newSelected.delete(pair);
    } else {
      newSelected.add(pair);
    }
    setSelectedPairs(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedPairs(new Set(TRADING_PAIRS));
  };

  const handleDeselectAll = () => {
    setSelectedPairs(new Set());
  };

  return (
    <div className="space-y-6">
      {/* 頁头 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">市場數據</h1>
            <p className="text-muted-foreground">即時加密貨幣市場行情（Binance）</p>
          </div>
          {/* 大屏幕（>=640px）：篩選器在右側 */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              onClick={() => setShowPairSelector(true)}
              variant="outline"
              size="sm"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              選擇交易對 ({selectedPairs.size}/{TRADING_PAIRS.length})
            </Button>
            <Select
              value={refreshInterval.toString()}
              onValueChange={(value) => setRefreshInterval(Number(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="選擇刷新間隔" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3000">3秒刷新</SelectItem>
                <SelectItem value="5000">5秒刷新</SelectItem>
                <SelectItem value="10000">10秒刷新</SelectItem>
                <SelectItem value="0">手動刷新</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
        {/* 小屏幕（<640px）：篩選器在標題下方 */}
        <div className="flex flex-wrap items-center gap-2 sm:hidden">
          <Button
            onClick={() => setShowPairSelector(true)}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            選擇交易對 ({selectedPairs.size}/{TRADING_PAIRS.length})
          </Button>
          <Select
            value={refreshInterval.toString()}
            onValueChange={(value) => setRefreshInterval(Number(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="選擇刷新間隔" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3000">3秒刷新</SelectItem>
              <SelectItem value="5000">5秒刷新</SelectItem>
              <SelectItem value="10000">10秒刷新</SelectItem>
              <SelectItem value="0">手動刷新</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 載入和错误狀態 */}
      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">載入市場數據...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-destructive">載入失敗: {error.message}</p>
              <Button onClick={handleRefresh} className="mt-4" variant="outline">
                重試
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 市場數據展示 */}
      {data && (
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grid">卡片視圖</TabsTrigger>
            <TabsTrigger value="table">表格視圖</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((item, index) => (
                <MarketDataCard key={item.symbol || `market-${index}`} data={item} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>市場行情</CardTitle>
                <CardDescription>
                  最後更新: {new Date().toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MarketDataTable data={data} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 说明信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">數據來源</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>數據來源: Binance API</li>
            <li>更新頻率: 根據設置自動刷新（支持 3秒/5秒/10秒）</li>
            <li>數據包含: 即時價格、24小時漲跌幅、最高/最低價、交易量</li>
            <li>注意: 顯示價格僅供參考，實際交易以交易所即時價格為準</li>
          </ul>
        </CardContent>
      </Card>

      {/* 交易對選擇對話框 */}
      <Dialog open={showPairSelector} onOpenChange={setShowPairSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>選擇要顯示的交易對</DialogTitle>
            <DialogDescription>
              勾選要顯示的交易對，共 {TRADING_PAIRS.length} 個選項
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="sm"
              >
                全選
              </Button>
              <Button
                onClick={handleDeselectAll}
                variant="outline"
                size="sm"
              >
                全不選
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TRADING_PAIRS.map((pair) => (
                <div
                  key={pair}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => handleTogglePair(pair)}
                >
                  <Checkbox
                    id={`pair-${pair}`}
                    checked={selectedPairs.has(pair)}
                    onCheckedChange={() => handleTogglePair(pair)}
                  />
                  <label
                    htmlFor={`pair-${pair}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {pair}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowPairSelector(false)}
              variant="outline"
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (selectedPairs.size === 0) {
                  alert('請至少選擇一個交易對');
                  return;
                }
                setShowPairSelector(false);
              }}
            >
              確認 ({selectedPairs.size} 個)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

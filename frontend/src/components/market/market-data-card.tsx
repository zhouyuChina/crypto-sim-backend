import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MarketData } from '@/services/market';

interface MarketDataCardProps {
  data: MarketData;
}

export function MarketDataCard({ data }: MarketDataCardProps) {
  const isPositive = data.change >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{data.symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <div className="text-2xl font-bold">${data.price.toLocaleString()}</div>
            <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {data.changePercent}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">24h 最高</div>
              <div className="font-medium">${data.high24h.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">24h 最低</div>
              <div className="font-medium">${data.low24h.toLocaleString()}</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground">24h 交易量</div>
              <div className="font-medium">{data.volume}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

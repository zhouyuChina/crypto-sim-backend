import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MarketData } from '@/services/market';

interface MarketDataTableProps {
  data: MarketData[];
}

export function MarketDataTable({ data }: MarketDataTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>交易對</TableHead>
          <TableHead className="text-right">当前價格</TableHead>
          <TableHead className="text-right">24h 漲跌</TableHead>
          <TableHead className="text-right">24h 最高</TableHead>
          <TableHead className="text-right">24h 最低</TableHead>
          <TableHead className="text-right">24h 交易量</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => {
          const isPositive = item.change >= 0;

          return (
            <TableRow key={item.symbol}>
              <TableCell className="font-medium">{item.symbol}</TableCell>
              <TableCell className="text-right font-mono">
                ${item.price.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={isPositive ? 'success' : 'destructive'}>
                  {item.changePercent}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                ${item.high24h.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono">
                ${item.low24h.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{item.volume}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

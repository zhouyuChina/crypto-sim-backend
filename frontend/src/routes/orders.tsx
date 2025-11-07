import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const OrdersPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>訂單</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          訂單管理視圖將顯示在這裡。集成後端訂單 API 以顯示模擬交易和狀態。
        </p>
      </CardContent>
    </Card>
  );
};

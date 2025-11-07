import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export const DashboardPage = () => {
  const { api } = useAuth();

  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await api.get('/health');
      return response.data.data ?? response.data;
    }
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>API 狀態</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data ? '在線' : '檢查中...'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>活躍用戶</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">--</p>
          <p className="text-sm text-muted-foreground">即將推出</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>開放訂單</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">--</p>
          <p className="text-sm text-muted-foreground">集成訂單服務</p>
        </CardContent>
      </Card>
    </div>
  );
};

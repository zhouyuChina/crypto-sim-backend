import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, ChevronUp, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settings';
import { adminService } from '@/services/admins';
import { ipWhitelistService, type QueryIpWhitelistParams } from '@/services/ip-whitelist';
import type {
  UpdateTradingChannelsDto,
  UpdateCustomerServiceDto,
  UpdateLatencyDto,
  TradingChannel,
  CustomerServiceConfig,
  LatencyConfig,
  IpWhitelist,
  IpWhitelistConfig,
  UpdateIpWhitelistConfigDto,
} from '@/types/settings';
import type { Admin, QueryAdminsParams } from '@/types/admin';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditAdminDialog } from '@/components/admins/edit-admin-dialog';
import { EditIpWhitelistDialog } from '@/components/ip-whitelist/edit-ip-whitelist-dialog';

export const SettingsPage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  // 管理員帳號狀態
  const [adminSorting, setAdminSorting] = useState<SortingState>([]);
  const [adminPagination, setAdminPagination] = useState({ page: 1, pageSize: 10 });
  const [adminSearch, setAdminSearch] = useState('');
  const [deleteAdminDialogOpen, setDeleteAdminDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [editAdminDialogOpen, setEditAdminDialogOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // 交易渠道狀態
  const [tradingChannels, setTradingChannels] = useState<TradingChannel[]>([]);

  // 客服窗口狀態
  const [customerService, setCustomerService] = useState<CustomerServiceConfig>({
    enabled: false,
    position: 'bottom-right',
    theme: 'light',
  });

  // 延遲設置狀態
  const [latency, setLatency] = useState<LatencyConfig>({
    userDataDelay: 0,
  });

  // 託管模式狀態
  const [managedModeEnabled, setManagedModeEnabled] = useState(false);

  // IP白名單狀態
  const [ipWhitelistSorting, setIpWhitelistSorting] = useState<SortingState>([]);
  const [ipWhitelistPagination, setIpWhitelistPagination] = useState({ page: 1, pageSize: 10 });
  const [ipWhitelistSearch, setIpWhitelistSearch] = useState('');
  const [deleteIpWhitelistDialogOpen, setDeleteIpWhitelistDialogOpen] = useState(false);
  const [ipWhitelistToDelete, setIpWhitelistToDelete] = useState<IpWhitelist | null>(null);
  const [editIpWhitelistDialogOpen, setEditIpWhitelistDialogOpen] = useState(false);
  const [ipWhitelistToEdit, setIpWhitelistToEdit] = useState<IpWhitelist | null>(null);
  const [isCreatingIpWhitelist, setIsCreatingIpWhitelist] = useState(false);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);

  // 获取交易渠道設置
  const { data: tradingChannelsData } = useQuery({
    queryKey: ['settings', 'trading-channels'],
    queryFn: () => settingsService.getTradingChannels(api),
    onSuccess: (data) => {
      if (data && data.length > 0) {
        setTradingChannels(data);
      } else {
        setTradingChannels([
          { name: 'Binance', enabled: true },
          { name: 'Coinbase', enabled: false },
        ]);
      }
    },
  });

  // 获取客服窗口設置
  const { data: customerServiceData } = useQuery({
    queryKey: ['settings', 'customer-service'],
    queryFn: () => settingsService.getCustomerService(api),
    onSuccess: (data) => {
      if (data) {
        setCustomerService(data);
      }
    },
  });

  // 获取延遲設置
  const { data: latencyData } = useQuery({
    queryKey: ['settings', 'latency'],
    queryFn: () => settingsService.getLatency(api),
    onSuccess: (data) => {
      if (data) {
        setLatency(data);
      }
    },
  });

  // 获取託管模式設置
  const { data: managedModeData } = useQuery({
    queryKey: ['settings', 'managed-mode'],
    queryFn: async () => {
      const response = await api.get('/admin/settings/trading/managed-mode');
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data) {
        setManagedModeEnabled(data.enabled ?? false);
      }
    },
  });

  // 獲取IP白名單功能設置
  const { data: ipWhitelistConfigData } = useQuery({
    queryKey: ['settings', 'ip-whitelist-config'],
    queryFn: () => settingsService.getIpWhitelistConfig(api),
    onSuccess: (data) => {
      if (data) {
        setIpWhitelistEnabled(data.enabled ?? false);
      }
    },
  });

  // IP白名單列表查詢
  const ipWhitelistQueryParams: QueryIpWhitelistParams = {
    page: ipWhitelistPagination.page,
    pageSize: ipWhitelistPagination.pageSize,
    search: ipWhitelistSearch || undefined,
    isActive: undefined, // 可以根據需要添加篩選
  };

  const { data: ipWhitelistData, isLoading: ipWhitelistLoading, error: ipWhitelistError } = useQuery({
    queryKey: ['ip-whitelist', ipWhitelistQueryParams],
    queryFn: () => ipWhitelistService.list(api, ipWhitelistQueryParams),
    enabled: true, // 始終查詢，即使功能未啟用
  });

  // 管理員列表查詢
  const adminQueryParams: QueryAdminsParams = {
    page: adminPagination.page,
    pageSize: adminPagination.pageSize,
    search: adminSearch || undefined,
    sortBy: adminSorting[0]?.id as any,
    sortOrder: adminSorting[0]?.desc ? 'desc' : 'asc',
  };

  const { data: adminsData, isLoading: adminsLoading, error: adminsError } = useQuery({
    queryKey: ['admins', adminQueryParams],
    queryFn: () => adminService.list(api, adminQueryParams),
  });

  // Mutations
  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => adminService.delete(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setDeleteAdminDialogOpen(false);
      setAdminToDelete(null);
    },
  });

  const updateTradingChannelsMutation = useMutation({
    mutationFn: (data: UpdateTradingChannelsDto) =>
      settingsService.updateTradingChannels(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'trading-channels'] });
      alert('交易渠道設置已更新');
    },
  });

  const updateCustomerServiceMutation = useMutation({
    mutationFn: (data: UpdateCustomerServiceDto) =>
      settingsService.updateCustomerService(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'customer-service'] });
      alert('客服窗口設置已更新');
    },
  });

  const updateLatencyMutation = useMutation({
    mutationFn: (data: UpdateLatencyDto) =>
      settingsService.updateLatency(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'latency'] });
      alert('延遲設置已更新');
    },
  });

  const updateManagedModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.put('/admin/settings/trading/managed-mode', { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'managed-mode'] });
      setManagedModeEnabled(managedModeEnabled);
      alert('託管模式設置已更新');
    },
  });

  // IP白名單相關 Mutations
  const deleteIpWhitelistMutation = useMutation({
    mutationFn: (id: string) => ipWhitelistService.delete(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
      setDeleteIpWhitelistDialogOpen(false);
      setIpWhitelistToDelete(null);
    },
  });

  const updateIpWhitelistConfigMutation = useMutation({
    mutationFn: (data: UpdateIpWhitelistConfigDto) =>
      settingsService.updateIpWhitelistConfig(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'ip-whitelist-config'] });
      setIpWhitelistEnabled(ipWhitelistEnabled);
      alert('IP白名單設置已更新');
    },
  });

  // 管理員表格欄位
  const adminColumns: ColumnDef<Admin>[] = [
    {
      accessorKey: 'username',
      header: '用戶名',
      cell: ({ row }) => <div className="font-medium">{row.getValue('username')}</div>,
    },
    {
      accessorKey: 'displayName',
      header: '顯示名稱',
      cell: ({ row }) => row.getValue('displayName') || '-',
    },
    {
      accessorKey: 'isActive',
      header: '狀態',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive');
        return (
          <Badge variant={isActive ? 'success' : 'destructive'}>
            {isActive ? '啟用' : '停用'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: '最後登入',
      cell: ({ row }) => {
        const date = row.getValue('lastLoginAt') as string | null;
        return date ? new Date(date).toLocaleString('zh-TW') : '從未登入';
      },
    },
    {
      accessorKey: 'lastLoginIp',
      header: '登入IP',
      cell: ({ row }) => {
        const ip = row.getValue('lastLoginIp') as string | null;
        return <div className="font-mono text-sm">{ip || '-'}</div>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '創建時間',
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        return new Date(date).toLocaleString('zh-TW');
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const admin = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打開菜單</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(admin.id)}>
                複製管理員 ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setAdminToEdit(admin);
                  setIsCreatingAdmin(false);
                  setEditAdminDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  setAdminToDelete(admin);
                  setDeleteAdminDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // 管理員表格實例
  const adminTable = useReactTable({
    data: adminsData?.data || [],
    columns: adminColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setAdminSorting,
    state: {
      sorting: adminSorting,
    },
    manualPagination: true,
    pageCount: adminsData?.totalPages || 0,
  });

  // IP白名單表格欄位
  const ipWhitelistColumns: ColumnDef<IpWhitelist>[] = [
    {
      accessorKey: 'ipAddress',
      header: 'IP地址',
      cell: ({ row }) => (
        <div className="font-mono font-medium">{row.getValue('ipAddress')}</div>
      ),
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => row.getValue('description') || '-',
    },
    {
      accessorKey: 'isActive',
      header: '狀態',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive');
        return (
          <Badge variant={isActive ? 'success' : 'destructive'}>
            {isActive ? '啟用' : '停用'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'createdAt',
      header: '創建時間',
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        return new Date(date).toLocaleString('zh-TW');
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const ipWhitelist = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打開菜單</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ipWhitelist.id)}>
                複製ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ipWhitelist.ipAddress)}>
                複製IP地址
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setIpWhitelistToEdit(ipWhitelist);
                  setIsCreatingIpWhitelist(false);
                  setEditIpWhitelistDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  setIpWhitelistToDelete(ipWhitelist);
                  setDeleteIpWhitelistDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // IP白名單表格實例
  const ipWhitelistTable = useReactTable({
    data: ipWhitelistData?.data || [],
    columns: ipWhitelistColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setIpWhitelistSorting,
    state: {
      sorting: ipWhitelistSorting,
    },
    manualPagination: true,
    pageCount: ipWhitelistData?.totalPages || 0,
  });

  const handleUpdateTradingChannels = () => {
    updateTradingChannelsMutation.mutate({ channels: tradingChannels });
  };

  const handleUpdateCustomerService = () => {
    updateCustomerServiceMutation.mutate({ config: customerService });
  };

  const handleUpdateLatency = () => {
    updateLatencyMutation.mutate({ config: latency });
  };

  const addTradingChannel = () => {
    setTradingChannels([
      ...tradingChannels,
      { name: '', enabled: false },
    ]);
  };

  const removeTradingChannel = (index: number) => {
    setTradingChannels(tradingChannels.filter((_, i) => i !== index));
  };

  const updateTradingChannel = (index: number, updates: Partial<TradingChannel>) => {
    const updated = [...tradingChannels];
    updated[index] = { ...updated[index], ...updates };
    setTradingChannels(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">系統設置</h1>
        <p className="text-muted-foreground">管理系統配置和参数</p>
      </div>

      <Tabs defaultValue="admin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admin">管理員帳號</TabsTrigger>
          <TabsTrigger value="ip-whitelist">IP白名單</TabsTrigger>
          <TabsTrigger value="trading">交易渠道</TabsTrigger>
          <TabsTrigger value="managed-mode">託管模式</TabsTrigger>
          <TabsTrigger value="customer-service">客服窗口</TabsTrigger>
          <TabsTrigger value="latency">延遲設置</TabsTrigger>
        </TabsList>

        {/* 管理員帳號設置 */}
        <TabsContent value="admin">
    <Card>
      <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>管理員帳號管理</CardTitle>
              <CardDescription>
                    管理系統管理員帳號，可以新增、編輯和刪除管理員
              </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setAdminToEdit(null);
                    setIsCreatingAdmin(true);
                    setEditAdminDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增管理員
                </Button>
              </div>
      </CardHeader>
      <CardContent>
              <div className="mb-4">
                  <Input
                  type="text"
                  placeholder="搜索管理員..."
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                    setAdminPagination({ ...adminPagination, page: 1 });
                  }}
                  className="max-w-sm"
                  />
                </div>
              {adminsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">載入中...</div>
                </div>
              ) : adminsError ? (
                <div className="text-red-600">載入失敗: {(adminsError as Error).message}</div>
              ) : (
                <>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        {adminTable.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                              const meta = header.column.columnDef.meta as { minWidth?: string } | undefined;
                              return (
                                <TableHead
                                  key={header.id}
                                  style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                                >
                                  {header.isPlaceholder ? null : (
                                    <div
                                      className={cn(
                                        'whitespace-nowrap',
                                        header.column.getCanSort()
                                          ? 'cursor-pointer select-none flex items-center gap-2'
                                          : ''
                                      )}
                                      onClick={header.column.getToggleSortingHandler()}
                                    >
                                      {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                      {header.column.getCanSort() && (
                                        <span className="ml-2 flex-shrink-0">
                                          {header.column.getIsSorted() === 'asc' ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : header.column.getIsSorted() === 'desc' ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : null}
                                        </span>
                                      )}
                </div>
                                  )}
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {adminTable.getRowModel().rows?.length ? (
                          adminTable.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                              {row.getVisibleCells().map((cell) => {
                                const meta = cell.column.columnDef.meta as { minWidth?: string } | undefined;
                                return (
                                  <TableCell
                                    key={cell.id}
                                    style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={adminColumns.length} className="h-24 text-center">
                              沒有找到管理員
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      共 {adminsData?.total || 0} 個管理員，第 {adminsData?.page || 0} / {adminsData?.totalPages || 0} 頁
                    </div>
                    <div className="flex gap-2">
                <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdminPagination({ ...adminPagination, page: adminPagination.page - 1 })}
                        disabled={adminPagination.page === 1}
                >
                        上一頁
                </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdminPagination({ ...adminPagination, page: adminPagination.page + 1 })}
                        disabled={adminPagination.page >= (adminsData?.totalPages || 0)}
                      >
                        下一頁
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易渠道設置 */}
        <TabsContent value="trading">
          <Card>
            <CardHeader>
              <CardTitle>交易渠道設置</CardTitle>
              <CardDescription>
                配置可用的交易渠道和 API 密钥
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {tradingChannels.map((channel, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="space-y-2 flex-1">
                            <Label>渠道名稱</Label>
                            <Input
                              value={channel.name}
                              onChange={(e) =>
                                updateTradingChannel(index, { name: e.target.value })
                              }
                              placeholder="如: Binance, Coinbase"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.enabled}
                              onCheckedChange={(checked) =>
                                updateTradingChannel(index, { enabled: checked })
                              }
                            />
                            <Label>啟用</Label>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeTradingChannel(index)}
                        >
                          刪除
                        </Button>
                      </div>
                      {channel.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              value={channel.apiKey || ''}
                              onChange={(e) =>
                                updateTradingChannel(index, { apiKey: e.target.value })
                              }
                              placeholder="輸入 API Key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>API Secret</Label>
                            <Input
                              type="password"
                              value={channel.apiSecret || ''}
                              onChange={(e) =>
                                updateTradingChannel(index, { apiSecret: e.target.value })
                              }
                              placeholder="輸入 API Secret"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex space-x-2">
                <Button onClick={addTradingChannel} variant="outline">
                  添加渠道
                </Button>
                <Button
                  onClick={handleUpdateTradingChannels}
                  disabled={updateTradingChannelsMutation.isPending}
                >
                  {updateTradingChannelsMutation.isPending ? '保存中...' : '保存設置'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 客服窗口設置 */}
        <TabsContent value="customer-service">
          <Card>
            <CardHeader>
              <CardTitle>客服窗口設置</CardTitle>
              <CardDescription>
                配置客服聊天窗口的位置、主題和提供商
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>啟用客服窗口</Label>
        <p className="text-sm text-muted-foreground">
                    在网站中顯示客服聊天窗口
                  </p>
                </div>
                <Switch
                  checked={customerService.enabled}
                  onCheckedChange={(checked) =>
                    setCustomerService({ ...customerService, enabled: checked })
                  }
                />
              </div>

              {customerService.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>提供商</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={customerService.provider || 'custom'}
                      onChange={(e) =>
                        setCustomerService({ ...customerService, provider: e.target.value })
                      }
                    >
                      <option value="custom">自定义</option>
                      <option value="tawk">Tawk.to</option>
                      <option value="intercom">Intercom</option>
                    </select>
                  </div>

                  {customerService.provider === 'custom' && (
                    <div className="space-y-2">
                      <Label>腳本 URL</Label>
                      <Input
                        value={customerService.scriptUrl || ''}
                        onChange={(e) =>
                          setCustomerService({ ...customerService, scriptUrl: e.target.value })
                        }
                        placeholder="https://example.com/widget.js"
                      />
                    </div>
                  )}

                  {(customerService.provider === 'tawk' || customerService.provider === 'intercom') && (
                    <div className="space-y-2">
                      <Label>Widget ID</Label>
                      <Input
                        value={customerService.widgetId || ''}
                        onChange={(e) =>
                          setCustomerService({ ...customerService, widgetId: e.target.value })
                        }
                        placeholder="輸入 Widget ID"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>位置</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        value={customerService.position}
                        onChange={(e) =>
                          setCustomerService({
                            ...customerService,
                            position: e.target.value as any,
                          })
                        }
                      >
                        <option value="bottom-right">右下角</option>
                        <option value="bottom-left">左下角</option>
                        <option value="top-right">右上角</option>
                        <option value="top-left">左上角</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>主題</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        value={customerService.theme}
                        onChange={(e) =>
                          setCustomerService({
                            ...customerService,
                            theme: e.target.value as any,
                          })
                        }
                      >
                        <option value="light">浅色</option>
                        <option value="dark">深色</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>歡迎消息</Label>
                    <Input
                      value={customerService.welcomeMessage || ''}
                      onChange={(e) =>
                        setCustomerService({
                          ...customerService,
                          welcomeMessage: e.target.value,
                        })
                      }
                      placeholder="輸入歡迎消息（可選）"
                    />
                  </div>
                </>
              )}

              <Button
                onClick={handleUpdateCustomerService}
                disabled={updateCustomerServiceMutation.isPending}
              >
                {updateCustomerServiceMutation.isPending ? '保存中...' : '保存設置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 託管模式設置 */}
        <TabsContent value="managed-mode">
          <Card>
            <CardHeader>
              <CardTitle>託管模式設置</CardTitle>
              <CardDescription>
                啟用后，系統内所有用戶产生的交易都將被标记为托管交易
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system-managed-mode">系統託管模式</Label>
                  <p className="text-sm text-muted-foreground">
                    啟用后，所有交易都將标记为托管交易，用于区分系統托管和手动交易
                  </p>
                </div>
                <Switch
                  id="system-managed-mode"
                  checked={managedModeEnabled}
                  onCheckedChange={(checked) => {
                    setManagedModeEnabled(checked);
                    updateManagedModeMutation.mutate(checked);
                  }}
                  disabled={updateManagedModeMutation.isPending}
                />
              </div>
              {updateManagedModeMutation.isPending && (
                <p className="text-sm text-muted-foreground">更新中...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 延遲設置 */}
        <TabsContent value="latency">
          <Card>
            <CardHeader>
              <CardTitle>延遲設置</CardTitle>
              <CardDescription>
                配置用戶數據的延遲時間（單位：秒）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="userDataDelay">用戶數據延遲</Label>
                  <Input
                  id="userDataDelay"
                    type="number"
                    min="0"
                  step="0.1"
                  value={latency.userDataDelay}
                    onChange={(e) =>
                      setLatency({
                        ...latency,
                      userDataDelay: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                  用戶數據的延遲時間（秒）
                  </p>
                </div>
              <Button
                onClick={handleUpdateLatency}
                disabled={updateLatencyMutation.isPending}
              >
                {updateLatencyMutation.isPending ? '保存中...' : '保存設置'}
              </Button>
      </CardContent>
    </Card>
        </TabsContent>

        {/* IP白名單管理 */}
        <TabsContent value="ip-whitelist">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>IP白名單管理</CardTitle>
                  <CardDescription>
                    管理允許登入的IP地址，只有白名單中的IP才能登入系統
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setIpWhitelistToEdit(null);
                    setIsCreatingIpWhitelist(true);
                    setEditIpWhitelistDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增IP
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IP白名單功能開關 */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="space-y-0.5">
                  <Label htmlFor="ip-whitelist-enabled">啟用IP白名單</Label>
                  <p className="text-sm text-muted-foreground">
                    啟用後，只有白名單中的IP地址才能登入管理後台
                  </p>
                </div>
                <Switch
                  id="ip-whitelist-enabled"
                  checked={ipWhitelistEnabled}
                  onCheckedChange={(checked) => {
                    setIpWhitelistEnabled(checked);
                    updateIpWhitelistConfigMutation.mutate({
                      config: { enabled: checked },
                    });
                  }}
                  disabled={updateIpWhitelistConfigMutation.isPending}
                />
                </div>

              {ipWhitelistLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">載入中...</div>
                </div>
              ) : ipWhitelistError ? (
                <div className="text-red-600">
                  載入失敗: {(ipWhitelistError as Error).message}
                </div>
              ) : (
                <>
                  <div className="mb-4">
                  <Input
                      type="text"
                      placeholder="搜索IP地址或描述..."
                      value={ipWhitelistSearch}
                      onChange={(e) => {
                        setIpWhitelistSearch(e.target.value);
                        setIpWhitelistPagination({ ...ipWhitelistPagination, page: 1 });
                      }}
                      className="max-w-sm"
                    />
                </div>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        {ipWhitelistTable.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                              const meta = header.column.columnDef.meta as { minWidth?: string } | undefined;
                              return (
                                <TableHead
                                  key={header.id}
                                  style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                                >
                                  {header.isPlaceholder ? null : (
                                    <div
                                      className={cn(
                                        'whitespace-nowrap',
                                        header.column.getCanSort()
                                          ? 'cursor-pointer select-none flex items-center gap-2'
                                          : ''
                                      )}
                                      onClick={header.column.getToggleSortingHandler()}
                                    >
                                      {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                      {header.column.getCanSort() && (
                                        <span className="ml-2 flex-shrink-0">
                                          {header.column.getIsSorted() === 'asc' ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : header.column.getIsSorted() === 'desc' ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : null}
                                        </span>
                                      )}
              </div>
                                  )}
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {ipWhitelistTable.getRowModel().rows?.length ? (
                          ipWhitelistTable.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                              {row.getVisibleCells().map((cell) => {
                                const meta = cell.column.columnDef.meta as { minWidth?: string } | undefined;
                                return (
                                  <TableCell
                                    key={cell.id}
                                    style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={ipWhitelistColumns.length} className="h-24 text-center">
                              沒有找到IP白名單記錄
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      共 {ipWhitelistData?.total || 0} 條記錄，第 {ipWhitelistData?.page || 0} / {ipWhitelistData?.totalPages || 0} 頁
                    </div>
                    <div className="flex gap-2">
              <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIpWhitelistPagination({ ...ipWhitelistPagination, page: ipWhitelistPagination.page - 1 })}
                        disabled={ipWhitelistPagination.page === 1}
              >
                        上一頁
              </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIpWhitelistPagination({ ...ipWhitelistPagination, page: ipWhitelistPagination.page + 1 })}
                        disabled={ipWhitelistPagination.page >= (ipWhitelistData?.totalPages || 0)}
                      >
                        下一頁
                      </Button>
                    </div>
                  </div>
                </>
              )}
      </CardContent>
    </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Admin Confirmation Dialog */}
      <Dialog open={deleteAdminDialogOpen} onOpenChange={setDeleteAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除管理員 "{adminToDelete?.displayName || adminToDelete?.username}" 嗎？
              此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAdminDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => adminToDelete && deleteAdminMutation.mutate(adminToDelete.id)}
              disabled={deleteAdminMutation.isPending}
            >
              {deleteAdminMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <EditAdminDialog
        admin={adminToEdit}
        open={editAdminDialogOpen}
        onOpenChange={setEditAdminDialogOpen}
        isCreating={isCreatingAdmin}
      />

      {/* Delete IP Whitelist Confirmation Dialog */}
      <Dialog open={deleteIpWhitelistDialogOpen} onOpenChange={setDeleteIpWhitelistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除IP白名單 "{ipWhitelistToDelete?.ipAddress}" 嗎？
              此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteIpWhitelistDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => ipWhitelistToDelete && deleteIpWhitelistMutation.mutate(ipWhitelistToDelete.id)}
              disabled={deleteIpWhitelistMutation.isPending}
            >
              {deleteIpWhitelistMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit IP Whitelist Dialog */}
      <EditIpWhitelistDialog
        ipWhitelist={ipWhitelistToEdit}
        open={editIpWhitelistDialogOpen}
        onOpenChange={setEditIpWhitelistDialogOpen}
        isCreating={isCreatingIpWhitelist}
      />
    </div>
  );
};

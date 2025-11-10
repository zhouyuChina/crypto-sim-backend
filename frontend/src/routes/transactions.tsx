import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle,
  Filter,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { transactionService } from '@/services/transactions';
import type {
  Transaction,
  QueryTransactionsParams,
  SettleTransactionDto,
} from '@/types/transaction';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TRADING_PAIRS } from '@/constants/trading-pairs';

export const TransactionsPage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30 });
  const [filters, setFilters] = useState<{
    assetType?: string;
    direction?: string;
    status?: string;
    accountType?: string;
    username?: string;
    managedMode?: boolean;
  }>({});
  
  // 無限滾動狀態（用於小屏幕）
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [transactionToAction, setTransactionToAction] = useState<Transaction | null>(null);
  const [exitPrice, setExitPrice] = useState('');
  
  // 篩選管理對話框狀態
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<{
    assetType?: string;
    direction?: string;
    status?: string;
    accountType?: string;
    username?: string;
    managedMode?: boolean;
  }>({});

  // 檢測屏幕寬度
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Query params
  const queryParams: QueryTransactionsParams = {
    page: pagination.page,
    limit: pagination.limit,
    assetType: filters.assetType || undefined,
    direction: filters.direction as any,
    status: filters.status as any,
    accountType: filters.accountType as any,
    username: filters.username || undefined,
    managedMode: filters.managedMode,
  };

  // Fetch transactions
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => transactionService.list(api, queryParams),
  });

  // 當篩選條件改變時，重置無限滾動數據
  useEffect(() => {
    if (isMobile) {
      setAllTransactions([]);
      setCurrentPage(1);
      setHasMore(true);
    }
  }, [filters, isMobile]);

  // 初始化第一頁數據（小屏幕）
  useEffect(() => {
    if (isMobile && data && currentPage === 1 && allTransactions.length === 0) {
      setAllTransactions(data.data);
      setHasMore(data.page * data.limit < data.total);
    }
  }, [data, currentPage, isMobile, allTransactions.length]);

  // 加載更多數據（小屏幕）
  const loadMore = useCallback(async () => {
    if (!isMobile || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const params: QueryTransactionsParams = {
      page: nextPage,
      limit: 30,
      assetType: filters.assetType || undefined,
      direction: filters.direction as any,
      status: filters.status as any,
      accountType: filters.accountType as any,
      username: filters.username || undefined,
      managedMode: filters.managedMode,
    };

    try {
      const response = await transactionService.list(api, params);
      if (response.data.length === 0) {
        setHasMore(false);
      } else {
        setAllTransactions(prev => [...prev, ...response.data]);
        setCurrentPage(nextPage);
        if (response.data.length < 30 || (response.page * response.limit >= response.total)) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [api, currentPage, filters, hasMore, isLoadingMore, isMobile]);

  // Intersection Observer 用於檢測滾動到底部（僅小屏幕）
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, isLoadingMore, loadMore, isMobile]);

  // Mutations
  const settleMutation = useMutation({
    mutationFn: ({ orderNumber, exitPrice }: { orderNumber: string; exitPrice: number }) =>
      transactionService.settle(api, orderNumber, { exitPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSettleDialogOpen(false);
      setTransactionToAction(null);
      setExitPrice('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (orderNumber: string) => transactionService.cancel(api, orderNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setCancelDialogOpen(false);
      setTransactionToAction(null);
    },
  });

  // Table columns
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'orderNumber',
      header: '訂單號',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue('orderNumber')}</div>
      ),
    },
    {
      accessorKey: 'userName',
      header: '用戶',
      cell: ({ row }) => {
        const userName = row.getValue('userName') as string | undefined;
        return <div className="font-medium">{userName || '-'}</div>;
      },
    },
    {
      accessorKey: 'assetType',
      header: '交易對',
      cell: ({ row }) => <Badge variant="outline">{row.getValue('assetType')}</Badge>,
    },
    {
      accessorKey: 'direction',
      header: '方向',
      cell: ({ row }) => {
        const direction = row.getValue('direction') as string;
        return (
          <Badge variant={direction === 'CALL' ? 'success' : 'destructive'} className="whitespace-nowrap">
            {direction === 'CALL' ? '看漲' : '看跌'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'accountType',
      header: '帳戶類型',
      cell: ({ row }) => {
        const accountType = row.getValue('accountType') as string;
        return (
          <Badge variant={accountType === 'REAL' ? 'warning' : 'secondary'}>
            {accountType === 'REAL' ? '真實' : '模擬'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'entryPrice',
      header: '入場價',
      cell: ({ row }) => {
        const price = parseFloat(row.getValue('entryPrice'));
        return <div className="font-medium">${price.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'exitPrice',
      header: '出場價',
      cell: ({ row }) => {
        const price = row.getValue('exitPrice') as number | null;
        return price ? <div className="font-medium">${price.toFixed(2)}</div> : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: 'investAmount',
      header: '投資金額',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('investAmount'));
        return <div className="font-medium">${amount.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'returnRate',
      header: '盈利率',
      cell: ({ row }) => {
        const rate = parseFloat(row.getValue('returnRate'));
        return <div>{(rate * 100).toFixed(2)}%</div>;
      },
    },
    {
      accessorKey: 'actualReturn',
      header: '實際收益',
      cell: ({ row }) => {
        const returnValue = parseFloat(row.getValue('actualReturn'));
        const isPositive = returnValue >= 0;
        return (
          <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}${returnValue.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }> = {
          PENDING: { label: '進行中', variant: 'warning' },
          SETTLED: { label: '已結算', variant: 'success' },
          CANCELED: { label: '已取消', variant: 'destructive' },
        };
        const config = statusConfig[status] || { label: status, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      meta: {
        minWidth: '95px',
      },
    },
    {
      accessorKey: 'isManaged',
      header: '託管',
      cell: ({ row }) => {
        const isManaged = row.original.isManaged;
        if (isManaged) {
          return <Badge variant="default">託管</Badge>;
        }
        return <span className="text-sm text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: 'entryTime',
      header: '入場時間',
      cell: ({ row }) => {
        const date = row.getValue('entryTime') as string;
        return <div className="text-sm">{new Date(date).toLocaleString('zh-CN')}</div>;
      },
    },
    {
      accessorKey: 'expiryTime',
      header: '到期時間',
      cell: ({ row }) => {
        const date = row.getValue('expiryTime') as string;
        return <div className="text-sm">{new Date(date).toLocaleString('zh-CN')}</div>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const transaction = row.original;
        const canAction = transaction.status === 'PENDING';

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
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(transaction.orderNumber)}
              >
                複製訂單號
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canAction && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setTransactionToAction(transaction);
                      setExitPrice(transaction.currentPrice?.toFixed(2) || '');
                      setSettleDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    結算交易
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setTransactionToAction(transaction);
                      setCancelDialogOpen(true);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    取消交易
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Table instance - 根據屏幕大小使用不同的數據源
  const tableData = isMobile ? allTransactions : (data?.data || []);
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: !isMobile, // 小屏幕時不使用分頁
    pageCount: isMobile ? undefined : Math.ceil((data?.total || 0) / (data?.limit || 30)),
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>交易流水</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">載入失敗: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>交易流水</CardTitle>
            {/* 篩選管理按鈕 - 小屏幕顯示 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempFilters({ ...filters });
                setFilterDialogOpen(true);
              }}
              className="sm:hidden"
            >
              <Filter className="mr-2 h-4 w-4" />
              篩選管理
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 p-6 pt-0">
          {/* Filters - 大屏幕顯示 */}
          <div className="hidden sm:flex mb-4 gap-2 flex-wrap flex-shrink-0">
            <Input
              type="text"
              placeholder="用戶名"
              value={filters.username || ''}
              onChange={(e) => setFilters({ ...filters, username: e.target.value || undefined })}
              className="w-40"
            />
            <Select
              value={filters.assetType || 'all'}
              onValueChange={(value) => setFilters({ ...filters, assetType: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="全部交易對" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部交易對</SelectItem>
                {TRADING_PAIRS.map((pair) => (
                  <SelectItem key={pair} value={pair}>
                    {pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.direction || 'all'}
              onValueChange={(value) => setFilters({ ...filters, direction: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="全部方向" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部方向</SelectItem>
                <SelectItem value="CALL">看漲</SelectItem>
                <SelectItem value="PUT">看跌</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="全部狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="PENDING">進行中</SelectItem>
                <SelectItem value="SETTLED">已結算</SelectItem>
                <SelectItem value="CANCELED">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.accountType || 'all'}
              onValueChange={(value) => setFilters({ ...filters, accountType: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="全部帳戶" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部帳戶</SelectItem>
                <SelectItem value="DEMO">模擬帳戶</SelectItem>
                <SelectItem value="REAL">真實帳戶</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.managedMode === undefined ? 'all' : filters.managedMode ? 'true' : 'false'}
              onValueChange={(value) => {
                setFilters({
                  ...filters,
                  managedMode: value === 'all' ? undefined : value === 'true',
                });
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="全部託管" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部託管</SelectItem>
                <SelectItem value="true">託管</SelectItem>
                <SelectItem value="false">非託管</SelectItem>
              </SelectContent>
            </Select>
            {(filters.assetType || filters.direction || filters.status || filters.accountType || filters.username || filters.managedMode !== undefined) && (
              <Button
                variant="outline"
                onClick={() => setFilters({})}
              >
                清除篩選
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-auto flex-1 min-h-0">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
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
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
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
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          沒有找到交易记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 無限滾動觸發點（僅小屏幕） */}
              {isMobile && hasMore && (
                <div ref={loadMoreRef} className={cn("flex items-center justify-center", isLoadingMore ? "h-10" : "h-1")}>
                  {isLoadingMore && (
                    <div className="text-sm text-muted-foreground">載入中...</div>
                  )}
                </div>
              )}

              {/* Pagination - 僅在大屏幕顯示 */}
              <div className="hidden sm:flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  共 {data?.total || 0} 條記錄，第 {data?.page || 0} / {Math.ceil((data?.total || 0) / (data?.limit || 30))} 頁
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">每頁顯示：</span>
                    <Select
                      value={pagination.limit.toString()}
                      onValueChange={(value) => setPagination({ page: 1, limit: parseInt(value) })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                    >
                      上一頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page >= Math.ceil((data?.total || 0) / (data?.limit || 30))}
                    >
                      下一頁
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Settle Transaction Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>結算交易</DialogTitle>
            <DialogDescription>
              請輸入出場價格来結算訂單 "{transactionToAction?.orderNumber}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">出場價格</label>
              <Input
                type="number"
                step="0.01"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="請輸入出場價格"
              />
            </div>
            {transactionToAction && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>入場價格: ${transactionToAction.entryPrice.toFixed(2)}</div>
                <div>当前價格: ${transactionToAction.currentPrice?.toFixed(2) || '未知'}</div>
                <div>方向: {transactionToAction.direction === 'CALL' ? '看漲' : '看跌'}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (transactionToAction && exitPrice) {
                  settleMutation.mutate({
                    orderNumber: transactionToAction.orderNumber,
                    exitPrice: parseFloat(exitPrice),
                  });
                }
              }}
              disabled={settleMutation.isPending || !exitPrice}
            >
              {settleMutation.isPending ? '結算中...' : '確認結算'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Transaction Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認取消</DialogTitle>
            <DialogDescription>
              您確定要取消訂單 "{transactionToAction?.orderNumber}" 嗎？
              此操作將退还投資本金，無法撤銷。
            </DialogDescription>
          </DialogHeader>
          {transactionToAction && (
            <div className="space-y-1 text-sm text-muted-foreground py-4">
              <div>訂單號: {transactionToAction.orderNumber}</div>
              <div>投資金額: ${transactionToAction.investAmount.toFixed(2)}</div>
              <div>资产类型: {transactionToAction.assetType}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (transactionToAction) {
                  cancelMutation.mutate(transactionToAction.orderNumber);
                }
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? '取消中...' : '確認取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Management Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>篩選管理</DialogTitle>
            <DialogDescription>
              調整篩選條件以查找交易記錄
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-username">用戶名</Label>
              <Input
                id="filter-username"
                type="text"
                placeholder="用戶名"
                value={tempFilters.username || ''}
                onChange={(e) => setTempFilters({ ...tempFilters, username: e.target.value || undefined })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-assetType">交易對</Label>
              <Select
                value={tempFilters.assetType || 'all'}
                onValueChange={(value) => setTempFilters({ ...tempFilters, assetType: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="filter-assetType">
                  <SelectValue placeholder="全部交易對" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部交易對</SelectItem>
                  {TRADING_PAIRS.map((pair) => (
                    <SelectItem key={pair} value={pair}>
                      {pair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-direction">方向</Label>
              <Select
                value={tempFilters.direction || 'all'}
                onValueChange={(value) => setTempFilters({ ...tempFilters, direction: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="filter-direction">
                  <SelectValue placeholder="全部方向" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部方向</SelectItem>
                  <SelectItem value="CALL">看漲</SelectItem>
                  <SelectItem value="PUT">看跌</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-status">狀態</Label>
              <Select
                value={tempFilters.status || 'all'}
                onValueChange={(value) => setTempFilters({ ...tempFilters, status: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="全部狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="PENDING">進行中</SelectItem>
                  <SelectItem value="SETTLED">已結算</SelectItem>
                  <SelectItem value="CANCELED">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-accountType">帳戶類型</Label>
              <Select
                value={tempFilters.accountType || 'all'}
                onValueChange={(value) => setTempFilters({ ...tempFilters, accountType: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="filter-accountType">
                  <SelectValue placeholder="全部帳戶" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部帳戶</SelectItem>
                  <SelectItem value="DEMO">模擬帳戶</SelectItem>
                  <SelectItem value="REAL">真實帳戶</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-managedMode">託管</Label>
              <Select
                value={tempFilters.managedMode === undefined ? 'all' : tempFilters.managedMode ? 'true' : 'false'}
                onValueChange={(value) => {
                  setTempFilters({
                    ...tempFilters,
                    managedMode: value === 'all' ? undefined : value === 'true',
                  });
                }}
              >
                <SelectTrigger id="filter-managedMode">
                  <SelectValue placeholder="全部託管" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部託管</SelectItem>
                  <SelectItem value="true">託管</SelectItem>
                  <SelectItem value="false">非託管</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => setTempFilters({})}
                className="w-full"
              >
                清除所有篩選
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFilterDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                setFilters(tempFilters);
                setPagination({ ...pagination, page: 1 });
                setFilterDialogOpen(false);
              }}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};


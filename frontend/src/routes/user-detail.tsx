import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
  UserX,
  UserCheck
} from 'lucide-react';

import { TRADING_PAIRS } from '@/constants/trading-pairs';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/users';
import type { User } from '@/types/user';
import type {
  AccountType,
  TradeDirection,
  Transaction,
  TransactionStatus
} from '@/types/transaction';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180] as const;

const calculateReturnRate = (duration: number) => (duration / 30) * 5;

const MOCK_USERS: User[] = [
  {
    id: 'user-001',
    email: 'alice@example.com',
    displayName: 'Alice Chen',
    phoneNumber: '0912-123-456',
    avatar: undefined,
    idCardFront: undefined,
    idCardBack: undefined,
    roles: ['user'],
    isActive: true,
    verificationStatus: 'VERIFIED',
    lastLoginAt: '2024-02-10T12:30:00Z',
    lastLoginIp: '192.168.1.15',
    createdAt: '2023-11-01T09:00:00Z',
    updatedAt: '2024-02-10T12:30:00Z',
    demoBalance: '15000',
    realBalance: '8000',
    totalProfitLoss: '2500',
    totalTrades: 128,
    winRate: '58.3'
  },
  {
    id: 'user-002',
    email: 'bob@example.com',
    displayName: 'Bob Lin',
    phoneNumber: '0913-222-888',
    avatar: undefined,
    idCardFront: undefined,
    idCardBack: undefined,
    roles: ['user'],
    isActive: true,
    verificationStatus: 'IN_REVIEW',
    lastLoginAt: '2024-02-09T05:12:00Z',
    lastLoginIp: '10.0.0.21',
    createdAt: '2023-12-18T11:30:00Z',
    updatedAt: '2024-02-02T08:10:00Z',
    demoBalance: '32000',
    realBalance: '12000',
    totalProfitLoss: '-850',
    totalTrades: 74,
    winRate: '46.2'
  },
  {
    id: 'user-003',
    email: 'cathy@example.com',
    displayName: 'Cathy Wu',
    phoneNumber: '0914-333-999',
    avatar: undefined,
    idCardFront: undefined,
    idCardBack: undefined,
    roles: ['user', 'vip'],
    isActive: false,
    verificationStatus: 'REJECTED',
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: '2023-10-05T15:00:00Z',
    updatedAt: '2023-12-20T10:45:00Z',
    demoBalance: '5000',
    realBalance: '0',
    totalProfitLoss: '-3200',
    totalTrades: 32,
    winRate: '31.2'
  }
];

const generateMockTransactions = (user: User, count: number = 12): Transaction[] => {
  const directions: TradeDirection[] = ['CALL', 'PUT'];
  const statuses: TransactionStatus[] = ['PENDING', 'SETTLED'];
  const accountTypes: AccountType[] = ['DEMO', 'REAL'];
  const transactions: Transaction[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i += 1) {
    const asset = TRADING_PAIRS[Math.floor(Math.random() * TRADING_PAIRS.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const accountType = accountTypes[Math.floor(Math.random() * accountTypes.length)];
    const duration = DURATION_OPTIONS[Math.floor(Math.random() * DURATION_OPTIONS.length)];
    const returnRate = calculateReturnRate(duration);

    const basePrice = Math.random() * 10000 + 1000;
    const entryPrice = Math.floor(basePrice * 100) / 100;
    const priceChange = (Math.random() - 0.5) * basePrice * 0.1;
    const exitPrice =
      status === 'PENDING' ? null : Math.floor((basePrice + priceChange) * 100) / 100;

    const investAmount = Math.floor(Math.random() * 500 + 10);
    const isWin =
      direction === 'CALL'
        ? exitPrice !== null && exitPrice > entryPrice
        : exitPrice !== null && exitPrice < entryPrice;
    const actualReturn =
      status === 'PENDING'
        ? 0
        : (isWin ? 1 : -1) * Math.floor((investAmount * returnRate) / 100 * 100) / 100;

    const entryTime = now - (i + 1) * 90 * 60 * 1000;
    const expiryTime = entryTime + duration * 1000;

    transactions.push({
      id: `user-${user.id}-txn-${i}`,
      userId: user.id,
      userName: user.displayName,
      orderNumber: `UTXN${now + i}${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      accountType,
      assetType: asset,
      direction,
      entryTime: new Date(entryTime).toISOString(),
      expiryTime: new Date(expiryTime).toISOString(),
      duration,
      entryPrice,
      currentPrice: exitPrice,
      exitPrice,
      spread: Math.floor(Math.random() * 40 + 10),
      investAmount,
      returnRate,
      actualReturn,
      status,
      createdAt: new Date(entryTime).toISOString(),
      updatedAt: new Date(entryTime).toISOString(),
      settledAt: status === 'SETTLED' ? new Date(expiryTime).toISOString() : null,
      isManaged: false
    });
  }

  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const UserDetailPage = () => {
  const { userId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { api } = useAuth();

  const [user, setUser] = useState<User | undefined>(undefined);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    assetType: '',
    direction: 'CALL' as TradeDirection,
    accountType: 'DEMO' as AccountType,
    entryPrice: '',
    exitPrice: '',
    investAmount: '',
    duration: '30',
    entryTime: '',
    status: 'PENDING' as TransactionStatus
  });

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      if (!userId) return;
      try {
        const data = await userService.getById(api, userId);
        if (mounted) {
          setUser(data);
        }
      } catch (error) {
        const fallback = MOCK_USERS.find(item => item.id === userId);
        if (mounted) {
          setUser(fallback);
        }
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, [api, userId]);

  useEffect(() => {
    if (user) {
      const tradeCount =
        typeof user.totalTrades === 'number'
          ? user.totalTrades
          : Number(user.totalTrades ?? 10);
      setTransactions(generateMockTransactions(user, Number.isFinite(tradeCount) ? tradeCount : 10));
    }
  }, [user]);

  useEffect(() => {
    if (!transactionToEdit) return;

    const entryDate = new Date(transactionToEdit.entryTime);
    const entryLocal = new Date(entryDate.getTime() - entryDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setEditForm({
      assetType: transactionToEdit.assetType,
      direction: transactionToEdit.direction,
      accountType: transactionToEdit.accountType,
      entryPrice: transactionToEdit.entryPrice.toString(),
      exitPrice: transactionToEdit.exitPrice?.toString() ?? '',
      investAmount: Math.floor(transactionToEdit.investAmount).toString(),
      duration: DURATION_OPTIONS.includes(transactionToEdit.duration)
        ? transactionToEdit.duration.toString()
        : '30',
      entryTime: entryLocal,
      status: transactionToEdit.status
    });
  }, [transactionToEdit]);

  const handleUpdateTransaction = () => {
    if (!transactionToEdit) return;

    const duration = parseInt(editForm.duration, 10) || 30;
    const entryTimeIso = new Date(editForm.entryTime).toISOString();
    const expiryTime = new Date(new Date(entryTimeIso).getTime() + duration * 1000).toISOString();

    setTransactions(prev =>
      prev.map(txn =>
        txn.id === transactionToEdit.id
          ? {
              ...txn,
              assetType: editForm.assetType,
              direction: editForm.direction,
              accountType: editForm.accountType,
              entryPrice: parseFloat(editForm.entryPrice),
              exitPrice: editForm.exitPrice ? parseFloat(editForm.exitPrice) : null,
              investAmount: parseInt(editForm.investAmount, 10) || 0,
              duration,
              returnRate: calculateReturnRate(duration),
              entryTime: entryTimeIso,
              expiryTime,
              status: editForm.status,
              updatedAt: new Date().toISOString()
            }
          : txn
      )
    );

    setEditDialogOpen(false);
    setTransactionToEdit(null);
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'orderNumber',
      header: '訂單號',
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('orderNumber')}</div>
    },
    {
      accessorKey: 'assetType',
      header: '交易對',
      cell: ({ row }) => <Badge variant="outline">{row.getValue('assetType')}</Badge>
    },
    {
      accessorKey: 'direction',
      header: '方向',
      cell: ({ row }) => {
        const direction = row.getValue('direction') as TradeDirection;
        const isCall = direction === 'CALL';
        return (
          <Badge variant={isCall ? 'success' : 'destructive'}>
            {isCall ? '看漲' : '看跌'}
          </Badge>
        );
      },
      meta: { minWidth: '90px' }
    },
    {
      accessorKey: 'accountType',
      header: '帳戶',
      cell: ({ row }) => {
        const type = row.getValue('accountType') as AccountType;
        return <Badge variant="secondary">{type === 'DEMO' ? '模擬' : '真實'}</Badge>;
      }
    },
    {
      accessorKey: 'entryTime',
      header: '入場時間',
      cell: ({ row }) => {
        const entryTime = row.getValue('entryTime') as string;
        return (
          <div className="text-sm">
            {new Date(entryTime).toLocaleString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        );
      }
    },
    {
      accessorKey: 'duration',
      header: '秒數',
      cell: ({ row }) => <div className="text-right">{row.getValue('duration')} 秒</div>
    },
    {
      accessorKey: 'investAmount',
      header: '投資金額',
      cell: ({ row }) => (
        <div className="text-right">
          ${Number(row.getValue('investAmount')).toLocaleString()}
        </div>
      )
    },
    {
      accessorKey: 'entryPrice',
      header: '入場價',
      cell: ({ row }) => (
        <div className="text-right">
          $
          {Number(row.getValue('entryPrice')).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
      )
    },
    {
      accessorKey: 'exitPrice',
      header: '出場價',
      cell: ({ row }) => {
        const price = row.getValue('exitPrice') as number | null;
        return (
          <div className="text-right">
            {price !== null
              ? `$${price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`
              : '-'}
          </div>
        );
      }
    },
    {
      accessorKey: 'returnRate',
      header: '預期盈利率',
      cell: ({ row }) => (
        <div className="text-right">{Number(row.getValue('returnRate')).toFixed(2)}%</div>
      )
    },
    {
      accessorKey: 'actualReturn',
      header: '實際收益',
      cell: ({ row }) => {
        const value = row.getValue('actualReturn') as number;
        return (
          <div className={cn('text-right font-medium', value >= 0 ? 'text-green-600' : 'text-red-600')}>
            {value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => {
        const status = row.getValue('status') as TransactionStatus;
        const mapping: Record<TransactionStatus, { label: string; variant: 'default' | 'success' | 'destructive' }> = {
          PENDING: { label: '進行中', variant: 'default' },
          SETTLED: { label: '已結算', variant: 'success' },
          CANCELED: { label: '已取消', variant: 'destructive' }
        };
        const config = mapping[status] || { label: status, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      meta: { minWidth: '95px' }
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const txn = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTransactionToEdit(txn);
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            編輯
          </Button>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting }
  });

  if (!user) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/users' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            找不到該用戶
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProfit = transactions.reduce((acc, item) => acc + (item.actualReturn || 0), 0);
  const winCount = transactions.filter(item => item.actualReturn > 0).length;
  const winRate = transactions.length ? (winCount / transactions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate({ to: '/users' })} className="mb-3">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-3xl font-bold">{user.displayName}</h1>
          <p className="text-muted-foreground">
            查看並管理用戶 {user.email} 的交易流水
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setUser(prev => (prev ? { ...prev, isActive: !prev.isActive } : prev))
            }
          >
            {user.isActive ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                停用用戶
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                啟用用戶
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用戶資訊</CardTitle>
          <CardDescription>用戶基本資料與統計數據</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">郵箱</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">角色</p>
              <div className="flex flex-wrap gap-1">
                {user.roles.map(role => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">身份驗證狀態</p>
              <Badge
                variant={
                  user.verificationStatus === 'VERIFIED'
                    ? 'success'
                    : user.verificationStatus === 'REJECTED'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {user.verificationStatus === 'VERIFIED'
                  ? '通過'
                  : user.verificationStatus === 'REJECTED'
                    ? '失敗'
                    : user.verificationStatus === 'IN_REVIEW'
                      ? '審核中'
                      : '待提交'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">狀態</p>
              <Badge variant={user.isActive ? 'success' : 'destructive'}>
                {user.isActive ? '活躍' : '停用'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">模擬帳戶餘額</p>
              <p className="font-medium text-lg">${Number(user.demoBalance).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">真實帳戶餘額</p>
              <p className="font-medium text-lg">${Number(user.realBalance).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">總交易筆數</p>
              <p className="font-medium text-lg">{transactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">勝率</p>
              <p className="font-medium text-lg">{winRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">累計盈虧</p>
              <p className={cn('font-medium text-lg', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">最後登入</p>
              <p className="font-medium">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString('zh-TW')
                  : '尚未登入'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交易流水</CardTitle>
          <CardDescription>共 {transactions.length} 筆記錄，可點擊右側按鈕編輯</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
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
                                  ? 'flex cursor-pointer select-none items-center gap-2'
                                  : ''
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
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
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map(cell => {
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
                      尚無交易記錄
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯交易</DialogTitle>
          </DialogHeader>
          {transactionToEdit ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-assetType">交易對</Label>
                  <Select
                    value={editForm.assetType}
                    onValueChange={value => setEditForm(prev => ({ ...prev, assetType: value }))}
                  >
                    <SelectTrigger id="edit-assetType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADING_PAIRS.map(pair => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-direction">方向</Label>
                  <Select
                    value={editForm.direction}
                    onValueChange={value =>
                      setEditForm(prev => ({ ...prev, direction: value as TradeDirection }))
                    }
                  >
                    <SelectTrigger id="edit-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">看漲</SelectItem>
                      <SelectItem value="PUT">看跌</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-accountType">帳戶</Label>
                  <Select
                    value={editForm.accountType}
                    onValueChange={value =>
                      setEditForm(prev => ({ ...prev, accountType: value as AccountType }))
                    }
                  >
                    <SelectTrigger id="edit-accountType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEMO">模擬</SelectItem>
                      <SelectItem value="REAL">真實</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">狀態</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={value =>
                      setEditForm(prev => ({ ...prev, status: value as TransactionStatus }))
                    }
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">進行中</SelectItem>
                      <SelectItem value="SETTLED">已結算</SelectItem>
                      <SelectItem value="CANCELED">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-entryPrice">入場價</Label>
                  <Input
                    id="edit-entryPrice"
                    type="number"
                    value={editForm.entryPrice}
                    onChange={event =>
                      setEditForm(prev => ({ ...prev, entryPrice: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-exitPrice">出場價</Label>
                  <Input
                    id="edit-exitPrice"
                    type="number"
                    value={editForm.exitPrice}
                    onChange={event =>
                      setEditForm(prev => ({ ...prev, exitPrice: event.target.value }))
                    }
                    placeholder="留空為尚未結束"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-investAmount">投資金額</Label>
                  <Input
                    id="edit-investAmount"
                    type="number"
                    min={1}
                    step={1}
                    value={editForm.investAmount}
                    onChange={event => {
                      const value = event.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setEditForm(prev => ({ ...prev, investAmount: value }));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">交易秒數</Label>
                  <Select
                    value={editForm.duration}
                    onValueChange={value => setEditForm(prev => ({ ...prev, duration: value }))}
                  >
                    <SelectTrigger id="edit-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(duration => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration} 秒 (盈利率 {calculateReturnRate(duration)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-entryTime">入場時間</Label>
                  <Input
                    id="edit-entryTime"
                    type="datetime-local"
                    value={editForm.entryTime}
                    onChange={event =>
                      setEditForm(prev => ({ ...prev, entryTime: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>出場時間（自動計算）</Label>
                  <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                    {editForm.entryTime && editForm.duration
                      ? new Date(
                          new Date(editForm.entryTime).getTime() + parseInt(editForm.duration, 10) * 1000
                        ).toLocaleString('zh-TW')
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateTransaction}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


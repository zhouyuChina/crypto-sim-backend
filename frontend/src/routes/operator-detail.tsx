import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowLeft, ChevronUp, ChevronDown, Plus, Pencil, MoreHorizontal, CheckCircle, X } from 'lucide-react';

import type { Operator, OperatorTransaction } from '@/types/operator';
import type { Transaction, TradeDirection, TransactionStatus, AccountType } from '@/types/transaction';
import { cn } from '@/lib/utils';
import { EditOperatorDialog } from '@/components/operators/edit-operator-dialog';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 交易對列表
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
];

// 固定的交易秒數選項
const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180] as const;

// 根據交易秒數計算盈利率
const calculateReturnRate = (duration: number): number => {
  // 30秒 = 5%, 每增加30秒增加5%
  return (duration / 30) * 5;
};

// 硬編碼的操作員數據
const MOCK_OPERATORS = [
  {
    id: 'op-001',
    name: '張三',
    email: 'zhangsan@example.com',
    phone: '0912-345-678',
    status: 'active' as const,
    totalTransactions: 156,
    totalProfit: 12500.50,
    demoAccountBalance: 50000,
    realAccountBalance: 125000,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'op-002',
    name: '李四',
    email: 'lisi@example.com',
    phone: '0913-456-789',
    status: 'active' as const,
    totalTransactions: 89,
    totalProfit: 8750.25,
    demoAccountBalance: 35000,
    realAccountBalance: 98000,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
  },
  {
    id: 'op-003',
    name: '王五',
    email: 'wangwu@example.com',
    phone: '0914-567-890',
    status: 'inactive' as const,
    totalTransactions: 234,
    totalProfit: -3450.75,
    demoAccountBalance: 20000,
    realAccountBalance: 45000,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-13T00:00:00Z',
  },
  {
    id: 'op-004',
    name: '趙六',
    email: 'zhaoliu@example.com',
    phone: '0915-678-901',
    status: 'active' as const,
    totalTransactions: 312,
    totalProfit: 18900.00,
    demoAccountBalance: 75000,
    realAccountBalance: 200000,
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
  },
  {
    id: 'op-005',
    name: '孫七',
    email: 'sunqi@example.com',
    phone: '0916-789-012',
    status: 'active' as const,
    totalTransactions: 67,
    totalProfit: 5230.80,
    demoAccountBalance: 28000,
    realAccountBalance: 72000,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
];

// 生成模擬交易數據
const generateMockTransactions = (operatorId: string, operatorName: string, count: number = 10): OperatorTransaction[] => {
  const directions: TradeDirection[] = ['CALL', 'PUT'];
  const statuses: TransactionStatus[] = ['PENDING', 'SETTLED'];
  const accountTypes: AccountType[] = ['DEMO', 'REAL'];

  const transactions: OperatorTransaction[] = [];
  const now = Date.now();
  
  // 使用操作員ID作為統一的用戶ID
  const userId = `operator-${operatorId}`;
  const userName = operatorName;

  for (let i = 0; i < count; i++) {
    const pair = TRADING_PAIRS[Math.floor(Math.random() * TRADING_PAIRS.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const accountType = accountTypes[Math.floor(Math.random() * accountTypes.length)];
    
    // 從固定的交易秒數選項中隨機選擇
    const duration = DURATION_OPTIONS[Math.floor(Math.random() * DURATION_OPTIONS.length)];
    
    // 根據交易秒數計算盈利率
    const returnRate = calculateReturnRate(duration);
    
    const basePrice = Math.random() * 100000 + 50000;
    const entryPrice = Math.floor(basePrice * 100) / 100;
    const priceChange = (Math.random() - 0.5) * basePrice * 0.1;
    const exitPrice = status === 'PENDING' ? null : Math.floor((basePrice + priceChange) * 100) / 100;
    
    const investAmount = Math.floor(Math.random() * 1000 + 10);
    // 根據方向決定實際收益：看漲且盈利，或看跌且虧損時為正收益
    const isWin = direction === 'CALL' ? (exitPrice && exitPrice > entryPrice) : (exitPrice && exitPrice < entryPrice);
    const actualReturn = status === 'PENDING' ? 0 : (isWin ? Math.floor((investAmount * returnRate / 100) * 100) / 100 : -Math.floor((investAmount * returnRate / 100) * 100) / 100);

    transactions.push({
      id: `txn-${operatorId}-${i}`,
      userId,
      userName,
      orderNumber: `TXN${now + i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      accountType,
      assetType: pair,
      direction,
      entryTime: new Date(now - (count - i) * 3600000).toISOString(),
      expiryTime: new Date(now - (count - i) * 3600000 + duration * 1000).toISOString(),
      duration,
      entryPrice,
      currentPrice: exitPrice,
      exitPrice,
      spread: Math.floor(Math.random() * 50 + 10),
      investAmount,
      returnRate,
      actualReturn,
      status,
      createdAt: new Date(now - (count - i) * 3600000).toISOString(),
      updatedAt: new Date(now - (count - i) * 3600000).toISOString(),
      settledAt: status === 'SETTLED' ? new Date(now - (count - i) * 3600000 + duration * 1000).toISOString() : null,
      isManaged: false,
      operatorId,
      operatorName,
    });
  }

  return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const OperatorDetailPage = () => {
  const { operatorId } = useParams({ strict: false });
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [transactions, setTransactions] = useState<OperatorTransaction[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<OperatorTransaction | null>(null);
  const [editOperatorDialogOpen, setEditOperatorDialogOpen] = useState(false);
  const [operator, setOperator] = useState<Operator | undefined>(
    MOCK_OPERATORS.find((op) => op.id === operatorId)
  );
  const [isLoading, setIsLoading] = useState(false);

  // 生成交易表單狀態
  const [createForm, setCreateForm] = useState({
    assetType: 'BTC/USDT',
    direction: 'CALL' as TradeDirection,
    accountType: 'DEMO' as AccountType,
    investAmount: '100',
    entryPrice: '50000',
    exitPrice: '',
    duration: '30',
    entryTime: '',
    status: 'PENDING' as TransactionStatus,
  });

  // 編輯交易表單狀態
  const [editForm, setEditForm] = useState({
    assetType: '',
    direction: 'CALL' as TradeDirection,
    accountType: 'DEMO' as AccountType,
    entryPrice: '',
    exitPrice: '',
    investAmount: '',
    duration: '',
    entryTime: '',
    status: 'PENDING' as TransactionStatus,
  });

  // 載入交易數據
  useEffect(() => {
    if (operator) {
      setIsLoading(true);
      // 模擬API調用
      setTimeout(() => {
        const mockTransactions = generateMockTransactions(operator.id, operator.name, operator.totalTransactions);
        setTransactions(mockTransactions);
        setIsLoading(false);
      }, 500);
    }
  }, [operator]);

  // 當選擇要編輯的交易時，更新編輯表單
  useEffect(() => {
    if (transactionToEdit) {
      // 確保交易秒數在固定選項中，如果不在則使用默認值30
      const validDurations = DURATION_OPTIONS as readonly number[];
      const duration = validDurations.includes(transactionToEdit.duration)
        ? transactionToEdit.duration.toString()
        : '30';
      
      // 格式化入場時間為 datetime-local 格式
      const entryTimeDate = new Date(transactionToEdit.entryTime);
      const entryTimeLocal = new Date(entryTimeDate.getTime() - entryTimeDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      
      setEditForm({
        assetType: transactionToEdit.assetType,
        direction: transactionToEdit.direction,
        accountType: transactionToEdit.accountType,
        entryPrice: transactionToEdit.entryPrice.toString(),
        exitPrice: transactionToEdit.exitPrice?.toString() || '',
        investAmount: Math.floor(transactionToEdit.investAmount).toString(),
        duration,
        entryTime: entryTimeLocal,
        status: transactionToEdit.status,
      });
    }
  }, [transactionToEdit]);

  if (!operator) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/operators' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">操作員不存在</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 表格欄位
  const columns: ColumnDef<OperatorTransaction>[] = [
    {
      accessorKey: 'orderNumber',
      header: '訂單號',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue('orderNumber')}</div>
      ),
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
        const direction = row.getValue('direction') as TradeDirection;
        return (
          <Badge variant={direction === 'CALL' ? 'success' : 'destructive'}>
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
        const type = row.getValue('accountType') as AccountType;
        return <Badge variant="secondary">{type === 'DEMO' ? '模擬' : '真實'}</Badge>;
      },
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
              second: '2-digit',
            })}
          </div>
        );
      },
    },
    {
      id: 'exitTime',
      header: '出場時間',
      cell: ({ row }) => {
        const entryTime = row.original.entryTime;
        const duration = row.original.duration;
        const status = row.original.status;
        
        // 如果交易還在進行中，顯示「進行中」
        if (status === 'PENDING') {
          return <div className="text-sm text-muted-foreground">進行中</div>;
        }
        
        // 計算出場時間 = 入場時間 + 交易秒數
        const exitTime = new Date(new Date(entryTime).getTime() + duration * 1000);
        return (
          <div className="text-sm">
            {exitTime.toLocaleString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        );
      },
    },
    {
      accessorKey: 'duration',
      header: '交易秒數',
      cell: ({ row }) => {
        const duration = row.getValue('duration') as number;
        return <div className="text-right">{duration} 秒</div>;
      },
    },
    {
      accessorKey: 'investAmount',
      header: '投資金額',
      cell: ({ row }) => {
        const amount = row.getValue('investAmount') as number;
        return <div className="text-right">${Math.floor(amount).toLocaleString()}</div>;
      },
    },
    {
      accessorKey: 'entryPrice',
      header: '入場價',
      cell: ({ row }) => {
        const price = row.getValue('entryPrice') as number;
        return <div className="text-right">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
      },
    },
    {
      accessorKey: 'exitPrice',
      header: '出場價',
      cell: ({ row }) => {
        const price = row.getValue('exitPrice') as number | null;
        return (
          <div className="text-right">
            {price ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'returnRate',
      header: '盈利率',
      cell: ({ row }) => {
        const rate = row.getValue('returnRate') as number;
        return <div className="text-right">{rate.toFixed(2)}%</div>;
      },
    },
    {
      accessorKey: 'actualReturn',
      header: '實際收益',
      cell: ({ row }) => {
        const returnValue = row.getValue('actualReturn') as number;
        const isPositive = returnValue >= 0;
        return (
          <div className={cn('text-right font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? '+' : ''}${returnValue.toFixed(2)}
          </div>
        );
      },
    },
    {
      id: 'profitLoss',
      header: '盈利/虧損',
      cell: ({ row }) => {
        const returnValue = row.original.actualReturn;
        const status = row.original.status;
        
        // 如果交易還在進行中，顯示「進行中」
        if (status === 'PENDING') {
          return <Badge variant="default">進行中</Badge>;
        }
        
        // 根據實際收益判斷盈利/虧損
        if (returnValue > 0) {
          return <Badge variant="success" className="bg-green-500 text-white">盈利</Badge>;
        } else if (returnValue < 0) {
          return <Badge variant="destructive" className="text-white">虧損</Badge>;
        } else {
          return <Badge variant="secondary">持平</Badge>;
        }
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => {
        const status = row.getValue('status') as TransactionStatus;
        const statusConfig = {
          PENDING: { label: '進行中', variant: 'default' as const },
          SETTLED: { label: '已結算', variant: 'success' as const },
        };
        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      meta: {
        minWidth: '95px',
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTransactionToEdit(transaction);
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            編輯
          </Button>
        );
      },
    },
  ];

  // 表格實例
  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  // 處理生成交易
  const handleCreateTransaction = () => {
    const userId = `operator-${operator.id}`;
    const userName = operator.name;
    
    const duration = parseInt(createForm.duration) || 30;
    const entryTime = createForm.entryTime 
      ? new Date(createForm.entryTime).toISOString()
      : new Date().toISOString();
    // 計算出場時間 = 入場時間 + 交易秒數
    const expiryTime = new Date(new Date(entryTime).getTime() + duration * 1000).toISOString();
    
    const newTransaction: OperatorTransaction = {
      id: `txn-${operator.id}-${Date.now()}`,
      userId,
      userName,
      orderNumber: `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      accountType: createForm.accountType,
      assetType: createForm.assetType,
      direction: createForm.direction,
      entryTime,
      duration,
      expiryTime,
      entryPrice: parseFloat(createForm.entryPrice),
      currentPrice: null,
      exitPrice: createForm.exitPrice ? parseFloat(createForm.exitPrice) : null,
      spread: 20,
      investAmount: parseInt(createForm.investAmount) || 0,
      returnRate: calculateReturnRate(duration),
      actualReturn: 0,
      status: createForm.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: null,
      isManaged: false,
      operatorId: operator.id,
      operatorName: operator.name,
    };

    setTransactions([newTransaction, ...transactions]);
    setCreateDialogOpen(false);
    // 重置表單，但保留入場時間為當前時間
    const now = new Date();
    const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setCreateForm({
      assetType: 'BTC/USDT',
      direction: 'CALL',
      accountType: 'DEMO',
      investAmount: '100',
      entryPrice: '50000',
      exitPrice: '',
      duration: '30',
      entryTime: nowLocal,
      status: 'PENDING',
    });
  };

  // 處理編輯交易
  const handleUpdateTransaction = () => {
    if (!transactionToEdit) return;

    const duration = parseInt(editForm.duration) || 30;
    const entryTime = new Date(editForm.entryTime).toISOString();
    // 計算出場時間 = 入場時間 + 交易秒數
    const expiryTime = new Date(new Date(entryTime).getTime() + duration * 1000).toISOString();

    const updatedTransactions = transactions.map((txn) =>
      txn.id === transactionToEdit.id
        ? {
            ...txn,
            assetType: editForm.assetType,
            direction: editForm.direction,
            accountType: editForm.accountType,
            entryPrice: parseFloat(editForm.entryPrice),
            exitPrice: editForm.exitPrice ? parseFloat(editForm.exitPrice) : null,
            investAmount: parseInt(editForm.investAmount) || 0,
            duration,
            returnRate: calculateReturnRate(duration),
            entryTime,
            expiryTime,
            actualReturn: txn.actualReturn,
            status: editForm.status,
            updatedAt: new Date().toISOString(),
          }
        : txn
    );

    setTransactions(updatedTransactions);
    setEditDialogOpen(false);
    setTransactionToEdit(null);
  };

  // 處理保存操作員資訊
  const handleSaveOperator = (data: Partial<Operator>) => {
    if (!operator) return;

    const updatedOperator: Operator = {
      ...operator,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    setOperator(updatedOperator);
    
    // 更新 MOCK_OPERATORS 中的數據（在實際應用中，這裡應該調用 API）
    const index = MOCK_OPERATORS.findIndex((op) => op.id === operator.id);
    if (index !== -1) {
      MOCK_OPERATORS[index] = updatedOperator;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate({ to: '/operators' })} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-3xl font-bold">{operator.name} - 交易流水</h1>
          <p className="text-muted-foreground">查看並管理此操作員的交易記錄</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditOperatorDialogOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            編輯操作員
          </Button>
          <Button
            onClick={() => {
              // 設置入場時間為當前時間
              const now = new Date();
              const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
              setCreateForm({
                ...createForm,
                entryTime: nowLocal,
              });
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            生成交易
          </Button>
        </div>
      </div>

      {/* 操作員信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>操作員資訊</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // 計算總收益（根據交易流水自動計算）
            const totalProfit = transactions.reduce((sum, txn) => sum + (txn.actualReturn || 0), 0);
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">姓名</p>
                  <p className="font-medium">{operator.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">郵箱</p>
                  <p className="font-medium">{operator.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">電話</p>
                  <p className="font-medium">{operator.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">狀態</p>
                  <Badge variant={operator.status === 'active' ? 'success' : 'destructive'}>
                    {operator.status === 'active' ? '啟用' : '停用'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">總交易筆數</p>
                  <p className="font-medium text-lg">{transactions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">總收益</p>
                  <p className={cn('font-medium text-lg', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">虛擬帳戶餘額</p>
                  <p className="font-medium text-lg">${operator.demoAccountBalance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">真實帳戶餘額</p>
                  <p className="font-medium text-lg">${operator.realAccountBalance.toLocaleString()}</p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* 交易流水表格 */}
      <Card>
        <CardHeader>
          <CardTitle>交易流水</CardTitle>
          <CardDescription>共 {transactions.length} 筆交易記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
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
                        沒有找到交易記錄
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 生成交易對話框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>生成交易流水</DialogTitle>
            <DialogDescription>
              為操作員 {operator.name} 生成一筆新的交易記錄
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-assetType">交易對</Label>
              <Select
                value={createForm.assetType}
                onValueChange={(value) => setCreateForm({ ...createForm, assetType: value })}
              >
                <SelectTrigger id="create-assetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADING_PAIRS.map((pair) => (
                    <SelectItem key={pair} value={pair}>
                      {pair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-direction">方向</Label>
                <Select
                  value={createForm.direction}
                  onValueChange={(value) => setCreateForm({ ...createForm, direction: value as TradeDirection })}
                >
                  <SelectTrigger id="create-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">看漲</SelectItem>
                    <SelectItem value="PUT">看跌</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-accountType">帳戶類型</Label>
                <Select
                  value={createForm.accountType}
                  onValueChange={(value) => setCreateForm({ ...createForm, accountType: value as AccountType })}
                >
                  <SelectTrigger id="create-accountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEMO">模擬</SelectItem>
                    <SelectItem value="REAL">真實</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-entryPrice">入場價</Label>
                <Input
                  id="create-entryPrice"
                  type="number"
                  value={createForm.entryPrice}
                  onChange={(e) => setCreateForm({ ...createForm, entryPrice: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-exitPrice">出場價</Label>
                <Input
                  id="create-exitPrice"
                  type="number"
                  value={createForm.exitPrice}
                  onChange={(e) => setCreateForm({ ...createForm, exitPrice: e.target.value })}
                  placeholder="留空為未出場"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-investAmount">投資金額</Label>
                <Input
                  id="create-investAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={createForm.investAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 只允許整數
                    if (value === '' || /^\d+$/.test(value)) {
                      setCreateForm({ ...createForm, investAmount: value });
                    }
                  }}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-duration">交易秒數</Label>
                <Select
                  value={createForm.duration}
                  onValueChange={(value) => setCreateForm({ ...createForm, duration: value })}
                >
                  <SelectTrigger id="create-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((duration) => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration} 秒 (盈利率: {calculateReturnRate(duration)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-entryTime">入場時間</Label>
                <Input
                  id="create-entryTime"
                  type="datetime-local"
                  value={createForm.entryTime}
                  onChange={(e) => setCreateForm({ ...createForm, entryTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>出場時間（自動計算）</Label>
                <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                  {createForm.entryTime && createForm.duration
                    ? new Date(
                        new Date(createForm.entryTime).getTime() + parseInt(createForm.duration) * 1000
                      ).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  出場時間 = 入場時間 + 交易秒數
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-status">狀態</Label>
              <Select
                value={createForm.status}
                onValueChange={(value) => setCreateForm({ ...createForm, status: value as TransactionStatus })}
              >
                <SelectTrigger id="create-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">進行中</SelectItem>
                  <SelectItem value="SETTLED">已結算</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTransaction}>
              生成交易
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯交易對話框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯交易流水</DialogTitle>
            <DialogDescription>
              修改交易記錄：{transactionToEdit?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {transactionToEdit && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-assetType">交易對</Label>
                <Select
                  value={editForm.assetType}
                  onValueChange={(value) => setEditForm({ ...editForm, assetType: value })}
                >
                  <SelectTrigger id="edit-assetType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADING_PAIRS.map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-direction">方向</Label>
                  <Select
                    value={editForm.direction}
                    onValueChange={(value) => setEditForm({ ...editForm, direction: value as TradeDirection })}
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

                <div className="space-y-2">
                  <Label htmlFor="edit-accountType">帳戶類型</Label>
                  <Select
                    value={editForm.accountType}
                    onValueChange={(value) => setEditForm({ ...editForm, accountType: value as AccountType })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-entryPrice">入場價</Label>
                  <Input
                    id="edit-entryPrice"
                    type="number"
                    value={editForm.entryPrice}
                    onChange={(e) => setEditForm({ ...editForm, entryPrice: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-exitPrice">出場價</Label>
                  <Input
                    id="edit-exitPrice"
                    type="number"
                    value={editForm.exitPrice}
                    onChange={(e) => setEditForm({ ...editForm, exitPrice: e.target.value })}
                    placeholder="留空為未出場"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-investAmount">投資金額</Label>
                  <Input
                    id="edit-investAmount"
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.investAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 只允許整數
                      if (value === '' || /^\d+$/.test(value)) {
                        setEditForm({ ...editForm, investAmount: value });
                      }
                    }}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">交易秒數</Label>
                  <Select
                    value={editForm.duration}
                    onValueChange={(value) => setEditForm({ ...editForm, duration: value })}
                  >
                    <SelectTrigger id="edit-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((duration) => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration} 秒 (盈利率: {calculateReturnRate(duration)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-entryTime">入場時間</Label>
                  <Input
                    id="edit-entryTime"
                    type="datetime-local"
                    value={editForm.entryTime}
                    onChange={(e) => setEditForm({ ...editForm, entryTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>出場時間（自動計算）</Label>
                  <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                    {editForm.entryTime && editForm.duration
                      ? new Date(
                          new Date(editForm.entryTime).getTime() + parseInt(editForm.duration) * 1000
                        ).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    出場時間 = 入場時間 + 交易秒數
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">狀態</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as TransactionStatus })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">進行中</SelectItem>
                    <SelectItem value="SETTLED">已結算</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateTransaction}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯操作員對話框 */}
      <EditOperatorDialog
        operator={operator || null}
        open={editOperatorDialogOpen}
        onOpenChange={setEditOperatorDialogOpen}
        onSave={handleSaveOperator}
      />
    </div>
  );
};


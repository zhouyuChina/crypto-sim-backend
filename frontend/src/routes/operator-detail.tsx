import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Pencil, Plus } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/providers/toast-provider';
import { operatorService } from '@/services/operators';
import type {
  Operator,
  OperatorTransaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  UpdateOperatorDto,
} from '@/types/operator';
import type { AccountType, TradeDirection, TransactionStatus } from '@/types/transaction';
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

const STATUS_OPTIONS: TransactionStatus[] = ['PENDING', 'SETTLED', 'CANCELED'];
const ACCOUNT_TYPES: AccountType[] = ['DEMO', 'REAL'];
const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180];

const STATUS_DISPLAY: Record<TransactionStatus, { label: string; variant: 'default' | 'success' | 'destructive' | 'secondary' }> = {
  PENDING: { label: '進行中', variant: 'default' },
  SETTLED: { label: '已結算', variant: 'success' },
  CANCELED: { label: '已取消', variant: 'secondary' },
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const toLocalInputValue = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const calcExpiryFromDuration = (entryTime: string, duration: string) => {
  if (!entryTime || !duration) return '';
  const durationNumber = Number(duration);
  if (!Number.isFinite(durationNumber)) return '';
  const base = new Date(entryTime);
  if (Number.isNaN(base.getTime())) return '';
  return toLocalInputValue(new Date(base.getTime() + durationNumber * 1000));
};

const calcDurationFromTimes = (entryTime: string, expiryTime: string) => {
  if (!entryTime || !expiryTime) return '';
  const entry = new Date(entryTime);
  const expiry = new Date(expiryTime);
  if (Number.isNaN(entry.getTime()) || Number.isNaN(expiry.getTime())) return '';
  const seconds = Math.max(0, Math.round((expiry.getTime() - entry.getTime()) / 1000));
  return seconds.toString();
};

const calculateReturnRate = (duration: number) => {
  if (!duration || Number.isNaN(duration)) return 0;
  return (duration / 30) * 5;
};

type TransactionFormState = {
  assetType: string;
  direction: TradeDirection;
  accountType: AccountType;
  entryTime: string;
  expiryTime: string;
  duration: string;
  entryPrice: string;
  exitPrice: string;
  spread: string;
  investAmount: string;
  returnRate: string;
  actualReturn: string;
  status: TransactionStatus;
};

const buildInitialCreateForm = (): TransactionFormState => {
  const defaultDuration = 60;
  const entry = toLocalInputValue(new Date());
  const expiry = entry ? calcExpiryFromDuration(entry, defaultDuration.toString()) : '';

  return {
    assetType: TRADING_PAIRS[0],
    direction: 'CALL',
    accountType: 'DEMO',
    entryTime: entry,
    expiryTime: expiry,
    duration: defaultDuration.toString(),
    entryPrice: '50000',
    exitPrice: '',
    spread: '20',
    investAmount: '100',
    returnRate: calculateReturnRate(defaultDuration).toString(),
    actualReturn: '0',
    status: 'SETTLED',
  };
};

const emptyFormState: TransactionFormState = {
  assetType: '',
  direction: 'CALL',
  accountType: 'DEMO',
  entryTime: '',
  expiryTime: '',
  duration: '',
  entryPrice: '',
  exitPrice: '',
  spread: '',
  investAmount: '',
  returnRate: '',
  actualReturn: '',
  status: 'PENDING',
};

const buildTransactionDto = (
  form: TransactionFormState,
): { errors: Record<string, string>; dto?: CreateTransactionDto } => {
  const errors: Record<string, string> = {};

  if (!form.assetType.trim()) {
    errors.assetType = '請選擇交易對';
  }

  const parseDateField = (value: string, field: string, label: string) => {
    if (!value) {
      errors[field] = label;
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      errors[field] = '時間格式不正確';
      return null;
    }
    return date.toISOString();
  };

  const parseNumberField = (
    value: string,
    field: string,
    label: string,
    {
      optional = false,
      min,
      allowNegative = false,
    }: { optional?: boolean; min?: number; allowNegative?: boolean } = {},
  ): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      if (optional) {
        return undefined;
      }
      errors[field] = `${label} 必須填寫`;
      return undefined;
    }
    const numberValue = Number(trimmed);
    if (Number.isNaN(numberValue)) {
      errors[field] = `${label} 必須為數字`;
      return undefined;
    }
    if (!allowNegative && numberValue < 0) {
      errors[field] = `${label} 不能為負數`;
      return undefined;
    }
    if (min !== undefined && numberValue < min) {
      errors[field] = `${label} 需大於等於 ${min}`;
      return undefined;
    }
    return numberValue;
  };

  const entryTime = parseDateField(form.entryTime, 'entryTime', '請輸入入場時間');
  const expiryTime = parseDateField(form.expiryTime, 'expiryTime', '請輸入出場時間');
  const duration = parseNumberField(form.duration, 'duration', '交易秒數', { min: 1 });
  const entryPrice = parseNumberField(form.entryPrice, 'entryPrice', '入場價', { min: 0 });
  const exitPrice = parseNumberField(form.exitPrice, 'exitPrice', '出場價', { min: 0, optional: true });
  const spread = parseNumberField(form.spread, 'spread', '點差', { min: 0 });
  const investAmount = parseNumberField(form.investAmount, 'investAmount', '投資金額', { min: 0 });
  const returnRate = parseNumberField(form.returnRate, 'returnRate', '盈利率', {});
  const actualReturn = parseNumberField(form.actualReturn, 'actualReturn', '實際收益', {
    allowNegative: true,
  });

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const dto: CreateTransactionDto = {
    assetType: form.assetType,
    direction: form.direction,
    accountType: form.accountType,
    entryTime: entryTime!,
    expiryTime: expiryTime!,
    duration: duration!,
    entryPrice: entryPrice!,
    spread: spread!,
    investAmount: investAmount!,
    returnRate: returnRate!,
    actualReturn: actualReturn!,
    status: form.status,
  };

  if (typeof exitPrice === 'number') {
    dto.exitPrice = exitPrice;
  }

  return { errors, dto };
};

export const OperatorDetailPage = () => {
  const { operatorId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToastContext();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editOperatorDialogOpen, setEditOperatorDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<OperatorTransaction | null>(null);
  const [createForm, setCreateForm] = useState<TransactionFormState>(() => buildInitialCreateForm());
  const [editForm, setEditForm] = useState<TransactionFormState>(emptyFormState);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  const operatorQuery = useQuery({
    queryKey: ['operator', operatorId],
    enabled: Boolean(operatorId),
    queryFn: () => operatorService.getById(api, operatorId as string),
  });

  const transactionsQuery = useQuery({
    queryKey: ['operator-transactions', operatorId, pagination.page, pagination.pageSize],
    enabled: Boolean(operatorId),
    queryFn: () =>
      operatorService.getTransactions(api, operatorId as string, pagination.page, pagination.pageSize),
  });

  const transactions = transactionsQuery.data?.data ?? [];
  const totalTransactions = transactionsQuery.data?.total ?? 0;
  const totalPages = transactionsQuery.data?.totalPages ?? 0;

  const totalProfit = useMemo(
    () => transactions.reduce((sum, txn) => sum + (txn.actualReturn || 0), 0),
    [transactions],
  );

  useEffect(() => {
    if (transactionToEdit) {
      setEditForm({
        assetType: transactionToEdit.assetType,
        direction: transactionToEdit.direction,
        accountType: transactionToEdit.accountType,
        entryTime: toLocalInputValue(transactionToEdit.entryTime),
        expiryTime: toLocalInputValue(transactionToEdit.expiryTime || transactionToEdit.entryTime),
        duration: transactionToEdit.duration.toString(),
        entryPrice: transactionToEdit.entryPrice.toString(),
        exitPrice: transactionToEdit.exitPrice?.toString() || '',
        spread: transactionToEdit.spread.toString(),
        investAmount: transactionToEdit.investAmount.toString(),
        returnRate: transactionToEdit.returnRate.toString(),
        actualReturn: transactionToEdit.actualReturn.toString(),
        status: transactionToEdit.status,
      });
      setEditErrors({});
    } else {
      setEditForm(emptyFormState);
    }
  }, [transactionToEdit]);

  const handleCreateFieldChange = (field: keyof TransactionFormState, value: string) => {
    setCreateErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      delete next.submit;
      return next;
    });

    setCreateForm((prev) => {
      const next = { ...prev, [field]: value };
      if ((field === 'entryTime' || field === 'duration') && next.entryTime && next.duration) {
        const calculatedExpiry = calcExpiryFromDuration(next.entryTime, next.duration);
        if (calculatedExpiry) {
          next.expiryTime = calculatedExpiry;
        }
      }
      if (field === 'expiryTime' && next.entryTime) {
        const durationValue = calcDurationFromTimes(next.entryTime, next.expiryTime);
        if (durationValue) {
          next.duration = durationValue;
          next.returnRate = calculateReturnRate(Number(durationValue)).toString();
        }
      }
      if (field === 'duration') {
        if (value) {
          next.returnRate = calculateReturnRate(Number(value)).toString();
        } else {
          next.returnRate = '';
        }
      }
      return next;
    });
  };

  const handleEditFieldChange = (field: keyof TransactionFormState, value: string) => {
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      delete next.submit;
      return next;
    });

    setEditForm((prev) => {
      const next = { ...prev, [field]: value };
      if ((field === 'entryTime' || field === 'duration') && next.entryTime && next.duration) {
        const calculatedExpiry = calcExpiryFromDuration(next.entryTime, next.duration);
        if (calculatedExpiry) {
          next.expiryTime = calculatedExpiry;
        }
      }
      if (field === 'expiryTime' && next.entryTime) {
        const durationValue = calcDurationFromTimes(next.entryTime, next.expiryTime);
        if (durationValue) {
          next.duration = durationValue;
          next.returnRate = calculateReturnRate(Number(durationValue)).toString();
        }
      }
      if (field === 'duration') {
        if (value) {
          next.returnRate = calculateReturnRate(Number(value)).toString();
        } else {
          next.returnRate = '';
        }
      }
      return next;
    });
  };

  const createTransactionMutation = useMutation({
    mutationFn: (payload: CreateTransactionDto) =>
      operatorService.createTransaction(api, operatorId as string, payload),
    onSuccess: () => {
      toast({
        title: '交易已建立',
        description: '新的交易流水已加入列表',
      });
      queryClient.invalidateQueries({ queryKey: ['operator-transactions', operatorId] });
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '建立交易失敗，請稍後再試';
      setCreateErrors({ submit: message });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ txId, payload }: { txId: string; payload: UpdateTransactionDto }) =>
      operatorService.updateTransaction(api, operatorId as string, txId, payload),
    onSuccess: () => {
      toast({
        title: '交易已更新',
        description: '交易流水資料已成功保存',
      });
      queryClient.invalidateQueries({ queryKey: ['operator-transactions', operatorId] });
      setEditDialogOpen(false);
      setTransactionToEdit(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '更新交易失敗，請稍後再試';
      setEditErrors({ submit: message });
    },
  });

  const updateOperatorMutation = useMutation({
    mutationFn: (payload: UpdateOperatorDto) =>
      operatorService.update(api, operatorId as string, payload),
  });

  const handleSaveOperator = async (data: {
    displayName: string;
    email: string;
    phoneNumber?: string;
    isActive: boolean;
    demoBalance?: number;
    realBalance?: number;
  }) => {
    const payload: UpdateOperatorDto = {
      displayName: data.displayName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      isActive: data.isActive,
      demoBalance: data.demoBalance,
      realBalance: data.realBalance,
    };
    await updateOperatorMutation.mutateAsync(payload);
    toast({
      title: '操作員已更新',
      description: '基本資料已成功保存',
    });
    queryClient.invalidateQueries({ queryKey: ['operator', operatorId] });
  };

  const handleCreateTransaction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { errors, dto } = buildTransactionDto(createForm);
    if (!dto) {
      setCreateErrors(errors);
      return;
    }
    setCreateErrors({});
    createTransactionMutation.mutate(dto);
  };

  const handleUpdateTransaction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!transactionToEdit) return;
    const { errors, dto } = buildTransactionDto(editForm);
    if (!dto) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});
    const payload: UpdateTransactionDto = { ...dto };
    updateTransactionMutation.mutate({ txId: transactionToEdit.id, payload });
  };

  const handleOpenCreateDialog = () => {
    setCreateForm(buildInitialCreateForm());
    setCreateErrors({});
    setCreateDialogOpen(true);
  };

  const columns: ColumnDef<OperatorTransaction>[] = [
    {
      accessorKey: 'orderNumber',
      header: '訂單號',
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('orderNumber')}</div>,
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
      meta: { minWidth: '90px' },
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
      cell: ({ row }) => <div className="text-sm">{formatDateTime(row.getValue('entryTime'))}</div>,
    },
    {
      accessorKey: 'expiryTime',
      header: '出場時間',
      cell: ({ row }) => <div className="text-sm">{formatDateTime(row.getValue('expiryTime'))}</div>,
    },
    {
      accessorKey: 'duration',
      header: '交易秒數',
      cell: ({ row }) => <div className="text-right">{row.getValue('duration')} 秒</div>,
    },
    {
      accessorKey: 'investAmount',
      header: '投資金額',
      cell: ({ row }) => (
        <div className="text-right">
          ${Number(row.getValue('investAmount')).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: 'entryPrice',
      header: '入場價',
      cell: ({ row }) => (
        <div className="text-right">
          ${Number(row.getValue('entryPrice')).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'exitPrice',
      header: '出場價',
      cell: ({ row }) => {
        const value = row.getValue('exitPrice') as number | null;
        return (
          <div className="text-right">
            {value !== null
              ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'spread',
      header: '點差',
      cell: ({ row }) => <div className="text-right">{row.getValue('spread')}</div>,
    },
    {
      accessorKey: 'returnRate',
      header: '盈利率',
      cell: ({ row }) => <div className="text-right">{Number(row.getValue('returnRate')).toFixed(2)}%</div>,
    },
    {
      accessorKey: 'actualReturn',
      header: '實際收益',
      cell: ({ row }) => {
        const value = row.getValue('actualReturn') as number;
        const isPositive = value >= 0;
        return (
          <div className={cn('text-right font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? '+' : ''}${value.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => {
        const status = row.getValue('status') as TransactionStatus;
        const config = STATUS_DISPLAY[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
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

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (!operatorId) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">缺少操作員 ID，無法載入資料。</p>
        <Button variant="outline" onClick={() => navigate({ to: '/operators' })}>
          返回列表
        </Button>
      </div>
    );
  }

  if (operatorQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>載入操作員資料...</span>
      </div>
    );
  }

  if (operatorQuery.isError || !operatorQuery.data) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">
          {operatorQuery.error instanceof Error
            ? operatorQuery.error.message
            : '無法取得操作員資料'}
        </p>
        <Button variant="outline" onClick={() => navigate({ to: '/operators' })}>
          返回列表
        </Button>
      </div>
    );
  }

  const operator = operatorQuery.data as Operator;
  const formatBalance = (value?: number | null) =>
    typeof value === 'number' && !Number.isNaN(value) ? value.toLocaleString() : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate({ to: '/operators' })} className="mb-4 md:mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-3xl font-bold">{operator.displayName} - 交易流水</h1>
          <p className="text-muted-foreground">查看並人工管理此操作員的每一筆交易</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOperatorDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            編輯操作員
          </Button>
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            新增交易
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>操作員資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">姓名</p>
              <p className="font-medium">{operator.displayName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">郵箱</p>
              <p className="font-medium">{operator.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">電話</p>
              <p className="font-medium">{operator.phoneNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">狀態</p>
              <Badge variant={operator.isActive ? 'success' : 'destructive'}>
                {operator.isActive ? '啟用' : '停用'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">模擬餘額</p>
              <p className="font-medium">${formatBalance(operator.demoBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">真實餘額</p>
              <p className="font-medium">${formatBalance(operator.realBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">總收益（根據列表計算）</p>
              <p className={cn('font-medium', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">身份驗證</p>
              <Badge variant="secondary">{operator.verificationStatus}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>交易流水</CardTitle>
              <CardDescription>共 {totalTransactions} 筆交易記錄</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                每頁
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(value) =>
                    setPagination((prev) => ({ ...prev, pageSize: Number(value), page: 1 }))
                  }
                >
                  <SelectTrigger className="ml-2 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">載入交易資料...</span>
            </div>
          ) : transactionsQuery.isError ? (
            <div className="text-red-600">
              {transactionsQuery.error instanceof Error
                ? transactionsQuery.error.message
                : '載入交易資料失敗'}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">暫無交易記錄</div>
          ) : (
            <>
              <div className="overflow-auto rounded-md border">
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
                                      : '',
                                  )}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {header.column.getCanSort() && (
                                    <span className="ml-1 flex-shrink-0">
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
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  第 {pagination.page} / {totalPages || 1} 頁
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  >
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={totalPages === 0 || pagination.page >= totalPages}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: totalPages ? Math.min(totalPages, prev.page + 1) : prev.page,
                      }))
                    }
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增交易流水</DialogTitle>
            <DialogDescription>所有欄位皆可人工輸入以對應實際情況</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-asset">交易對 *</Label>
              <Select value={createForm.assetType} onValueChange={(value) => handleCreateFieldChange('assetType', value)}>
                <SelectTrigger id="create-asset">
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
              {createErrors.assetType && <p className="text-sm text-destructive">{createErrors.assetType}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>方向 *</Label>
                <Select value={createForm.direction} onValueChange={(value) => handleCreateFieldChange('direction', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">看漲</SelectItem>
                    <SelectItem value="PUT">看跌</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>帳戶類型 *</Label>
                <Select
                  value={createForm.accountType}
                  onValueChange={(value) => handleCreateFieldChange('accountType', value as AccountType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === 'DEMO' ? '模擬' : '真實'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>入場時間 *</Label>
                <Input
                  type="datetime-local"
                  value={createForm.entryTime}
                  onChange={(event) => handleCreateFieldChange('entryTime', event.target.value)}
                />
                {createErrors.entryTime && <p className="text-sm text-destructive">{createErrors.entryTime}</p>}
              </div>
              <div className="space-y-2">
                <Label>出場時間 *</Label>
                <Input
                  type="datetime-local"
                  value={createForm.expiryTime}
                  onChange={(event) => handleCreateFieldChange('expiryTime', event.target.value)}
                />
                {createErrors.expiryTime && <p className="text-sm text-destructive">{createErrors.expiryTime}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>交易秒數 *</Label>
                <Select value={createForm.duration} onValueChange={(value) => handleCreateFieldChange('duration', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((duration) => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration} 秒
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.duration && <p className="text-sm text-destructive">{createErrors.duration}</p>}
              </div>
              <div className="space-y-2">
                <Label>盈利率 % *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={createForm.returnRate}
                  onChange={(event) => handleCreateFieldChange('returnRate', event.target.value)}
                />
                {createErrors.returnRate && <p className="text-sm text-destructive">{createErrors.returnRate}</p>}
              </div>
              <div className="space-y-2">
                <Label>點差 *</Label>
                <Input
                  type="number"
                  value={createForm.spread}
                  onChange={(event) => handleCreateFieldChange('spread', event.target.value)}
                />
                {createErrors.spread && <p className="text-sm text-destructive">{createErrors.spread}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>入場價 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={createForm.entryPrice}
                  onChange={(event) => handleCreateFieldChange('entryPrice', event.target.value)}
                />
                {createErrors.entryPrice && <p className="text-sm text-destructive">{createErrors.entryPrice}</p>}
              </div>
              <div className="space-y-2">
                <Label>出場價</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={createForm.exitPrice}
                  onChange={(event) => handleCreateFieldChange('exitPrice', event.target.value)}
                  placeholder="可留空"
                />
                {createErrors.exitPrice && <p className="text-sm text-destructive">{createErrors.exitPrice}</p>}
              </div>
              <div className="space-y-2">
                <Label>投資金額 *</Label>
                <Input
                  type="number"
                  value={createForm.investAmount}
                  onChange={(event) => handleCreateFieldChange('investAmount', event.target.value)}
                />
                {createErrors.investAmount && <p className="text-sm text-destructive">{createErrors.investAmount}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>實際收益 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={createForm.actualReturn}
                  onChange={(event) => handleCreateFieldChange('actualReturn', event.target.value)}
                />
                {createErrors.actualReturn && <p className="text-sm text-destructive">{createErrors.actualReturn}</p>}
              </div>
              <div className="space-y-2">
                <Label>狀態 *</Label>
                <Select value={createForm.status} onValueChange={(value) => handleCreateFieldChange('status', value as TransactionStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_DISPLAY[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createErrors.submit && <p className="text-sm text-destructive">{createErrors.submit}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={createTransactionMutation.isPending}>
                {createTransactionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                建立交易
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setTransactionToEdit(null);
            setEditErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯交易流水</DialogTitle>
            <DialogDescription>手動更新交易 {transactionToEdit?.orderNumber}</DialogDescription>
          </DialogHeader>
          {transactionToEdit && (
            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <div className="space-y-2">
                <Label>交易對 *</Label>
                <Select value={editForm.assetType} onValueChange={(value) => handleEditFieldChange('assetType', value)}>
                  <SelectTrigger>
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
                {editErrors.assetType && <p className="text-sm text-destructive">{editErrors.assetType}</p>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>方向 *</Label>
                  <Select value={editForm.direction} onValueChange={(value) => handleEditFieldChange('direction', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">看漲</SelectItem>
                      <SelectItem value="PUT">看跌</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>帳戶類型 *</Label>
                  <Select
                    value={editForm.accountType}
                    onValueChange={(value) => handleEditFieldChange('accountType', value as AccountType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === 'DEMO' ? '模擬' : '真實'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>入場時間 *</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.entryTime}
                    onChange={(event) => handleEditFieldChange('entryTime', event.target.value)}
                  />
                  {editErrors.entryTime && <p className="text-sm text-destructive">{editErrors.entryTime}</p>}
                </div>
                <div className="space-y-2">
                  <Label>出場時間 *</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.expiryTime}
                    onChange={(event) => handleEditFieldChange('expiryTime', event.target.value)}
                  />
                  {editErrors.expiryTime && <p className="text-sm text-destructive">{editErrors.expiryTime}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>交易秒數 *</Label>
                  <Input
                    type="number"
                    value={editForm.duration}
                    onChange={(event) => handleEditFieldChange('duration', event.target.value)}
                  />
                  {editErrors.duration && <p className="text-sm text-destructive">{editErrors.duration}</p>}
                </div>
                <div className="space-y-2">
                  <Label>盈利率 % *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.returnRate}
                    onChange={(event) => handleEditFieldChange('returnRate', event.target.value)}
                  />
                  {editErrors.returnRate && <p className="text-sm text-destructive">{editErrors.returnRate}</p>}
                </div>
                <div className="space-y-2">
                  <Label>點差 *</Label>
                  <Input
                    type="number"
                    value={editForm.spread}
                    onChange={(event) => handleEditFieldChange('spread', event.target.value)}
                  />
                  {editErrors.spread && <p className="text-sm text-destructive">{editErrors.spread}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>入場價 *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.entryPrice}
                    onChange={(event) => handleEditFieldChange('entryPrice', event.target.value)}
                  />
                  {editErrors.entryPrice && <p className="text-sm text-destructive">{editErrors.entryPrice}</p>}
                </div>
                <div className="space-y-2">
                  <Label>出場價</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.exitPrice}
                    onChange={(event) => handleEditFieldChange('exitPrice', event.target.value)}
                    placeholder="可留空"
                  />
                  {editErrors.exitPrice && <p className="text-sm text-destructive">{editErrors.exitPrice}</p>}
                </div>
                <div className="space-y-2">
                  <Label>投資金額 *</Label>
                  <Input
                    type="number"
                    value={editForm.investAmount}
                    onChange={(event) => handleEditFieldChange('investAmount', event.target.value)}
                  />
                  {editErrors.investAmount && <p className="text-sm text-destructive">{editErrors.investAmount}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>實際收益 *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.actualReturn}
                    onChange={(event) => handleEditFieldChange('actualReturn', event.target.value)}
                  />
                  {editErrors.actualReturn && <p className="text-sm text-destructive">{editErrors.actualReturn}</p>}
                </div>
                <div className="space-y-2">
                  <Label>狀態 *</Label>
                  <Select value={editForm.status} onValueChange={(value) => handleEditFieldChange('status', value as TransactionStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_DISPLAY[status].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editErrors.submit && <p className="text-sm text-destructive">{editErrors.submit}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateTransactionMutation.isPending}>
                  {updateTransactionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存變更
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <EditOperatorDialog
        operator={operator}
        open={editOperatorDialogOpen}
        onOpenChange={setEditOperatorDialogOpen}
        onSave={handleSaveOperator}
      />
    </div>
  );
};

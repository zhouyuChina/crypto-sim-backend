import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ArrowRight, UserCheck, UserX } from 'lucide-react';

import type { Operator } from '@/types/operator';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 硬編碼的操作員數據
const MOCK_OPERATORS: Operator[] = [
  {
    id: 'op-001',
    name: '張三',
    email: 'zhangsan@example.com',
    phone: '0912-345-678',
    status: 'active',
    totalTransactions: 156,
    totalProfit: 12500.50,
    demoAccountBalance: 50000,
    realAccountBalance: 125000,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: 'op-002',
    name: '李四',
    email: 'lisi@example.com',
    phone: '0913-456-789',
    status: 'active',
    totalTransactions: 89,
    totalProfit: 8750.25,
    demoAccountBalance: 35000,
    realAccountBalance: 98000,
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-01-21T10:15:00Z',
  },
  {
    id: 'op-003',
    name: '王五',
    email: 'wangwu@example.com',
    phone: '0914-567-890',
    status: 'inactive',
    totalTransactions: 234,
    totalProfit: -3450.75,
    demoAccountBalance: 20000,
    realAccountBalance: 45000,
    createdAt: '2023-12-10T10:00:00Z',
    updatedAt: '2024-01-18T16:45:00Z',
  },
  {
    id: 'op-004',
    name: '趙六',
    email: 'zhaoliu@example.com',
    phone: '0915-678-901',
    status: 'active',
    totalTransactions: 312,
    totalProfit: 18900.00,
    demoAccountBalance: 75000,
    realAccountBalance: 200000,
    createdAt: '2023-11-20T11:00:00Z',
    updatedAt: '2024-01-22T09:20:00Z',
  },
  {
    id: 'op-005',
    name: '孫七',
    email: 'sunqi@example.com',
    phone: '0916-789-012',
    status: 'active',
    totalTransactions: 67,
    totalProfit: 5230.80,
    demoAccountBalance: 28000,
    realAccountBalance: 72000,
    createdAt: '2024-02-05T12:00:00Z',
    updatedAt: '2024-01-23T11:30:00Z',
  },
];

export const OperatorsPage = () => {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');

  // 過濾操作員
  const filteredOperators = MOCK_OPERATORS.filter((operator) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      operator.name.toLowerCase().includes(searchLower) ||
      operator.email.toLowerCase().includes(searchLower) ||
      operator.phone?.includes(searchLower)
    );
  });

  // 表格欄位
  const columns: ColumnDef<Operator>[] = [
    {
      accessorKey: 'name',
      header: '姓名',
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'email',
      header: '郵箱',
      cell: ({ row }) => <div>{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'phone',
      header: '電話',
      cell: ({ row }) => <div>{row.getValue('phone') || '-'}</div>,
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={status === 'active' ? 'success' : 'destructive'}>
            {status === 'active' ? '啟用' : '停用'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'totalTransactions',
      header: '交易筆數',
      cell: ({ row }) => {
        const count = row.getValue('totalTransactions') as number;
        return <div className="text-right">{count}</div>;
      },
      meta: {
        minWidth: '100px',
      },
    },
    {
      accessorKey: 'totalProfit',
      header: '總收益',
      cell: ({ row }) => {
        const profit = row.getValue('totalProfit') as number;
        const isPositive = profit >= 0;
        return (
          <div className={cn('text-right font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? '+' : ''}${profit.toFixed(2)}
          </div>
        );
      },
      meta: {
        minWidth: '120px',
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const operator = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: `/operators/${operator.id}` })}
          >
            查看詳情
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  // 表格實例
  const table = useReactTable({
    data: filteredOperators,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">操作員列表</h1>
        <p className="text-muted-foreground">管理操作員並查看他們的交易流水</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>操作員</CardTitle>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="搜索操作員..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      沒有找到操作員
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


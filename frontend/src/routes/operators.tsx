import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { operatorService } from '@/services/operators';
import type { Operator, QueryOperatorsParams } from '@/types/operator';
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

export const OperatorsPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  // 查询参数
  const queryParams: QueryOperatorsParams = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: search || undefined,
    sortBy: sorting[0]?.id as any,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  };

  // 获取操作员列表
  const { data: operatorsData, isLoading, error } = useQuery({
    queryKey: ['operators', queryParams],
    queryFn: () => operatorService.list(api, queryParams),
  });

  // 表格欄位
  const columns: ColumnDef<Operator>[] = [
    {
      accessorKey: 'displayName',
      header: '姓名',
      cell: ({ row }) => <div className="font-medium">{row.getValue('displayName')}</div>,
    },
    {
      accessorKey: 'email',
      header: '郵箱',
      cell: ({ row }) => <div>{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'phoneNumber',
      header: '電話',
      cell: ({ row }) => <div>{row.getValue('phoneNumber') || '-'}</div>,
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
      accessorKey: 'totalTrades',
      header: '交易筆數',
      cell: ({ row }) => {
        const count = row.getValue('totalTrades') as number;
        return <div className="text-right">{count}</div>;
      },
      meta: {
        minWidth: '100px',
      },
    },
    {
      accessorKey: 'totalProfitLoss',
      header: '總收益',
      cell: ({ row }) => {
        const profit = row.getValue('totalProfitLoss') as number;
        const isPositive = profit >= 0;
        return (
          <div className={cn('text-right font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? '+' : ''}${Number(profit).toFixed(2)}
          </div>
        );
      },
      meta: {
        minWidth: '120px',
      },
    },
    {
      accessorKey: 'demoBalance',
      header: '虛擬餘額',
      cell: ({ row }) => {
        const balance = row.getValue('demoBalance') as number;
        return <div className="text-right">${Number(balance).toFixed(2)}</div>;
      },
      meta: {
        minWidth: '120px',
      },
    },
    {
      accessorKey: 'realBalance',
      header: '真實餘額',
      cell: ({ row }) => {
        const balance = row.getValue('realBalance') as number;
        return <div className="text-right font-medium">${Number(balance).toFixed(2)}</div>;
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
    data: operatorsData?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true,
    pageCount: operatorsData?.totalPages || 0,
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-64"
              />
              <Button onClick={() => navigate({ to: '/operators/new' })}>
                <Plus className="mr-2 h-4 w-4" />
                新增操作員
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : error ? (
            <div className="text-red-600">載入失敗: {(error as Error).message}</div>
          ) : (
            <>
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

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  共 {operatorsData?.total || 0} 個操作員，第 {operatorsData?.page || 0} / {operatorsData?.totalPages || 0} 頁
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
                    disabled={pagination.page >= (operatorsData?.totalPages || 0)}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

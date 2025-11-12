import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, ChevronUp, ChevronDown, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/users';
import type { User, QueryUsersParams } from '@/types/user';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { EditUserDialog } from '@/components/users/edit-user-dialog';

export const UsersPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Query params
  const queryParams: QueryUsersParams = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: search || undefined,
    sortBy: sorting[0]?.id as any,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  };

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => userService.list(api, queryParams),
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (id: string) => userService.activate(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userService.deactivate(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
  });

  // Table columns
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      header: '郵箱',
      cell: ({ row }) => <div className="font-medium">{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'displayName',
      header: '顯示名稱',
    },
    // 暂时注释掉手机号列，以后可能会用到
    // {
    //   accessorKey: 'phoneNumber',
    //   header: '手机号',
    // },
    {
      accessorKey: 'roles',
      header: '角色',
      cell: ({ row }) => {
        const roles = row.getValue('roles') as string[];
        return (
          <div className="flex gap-1">
            {roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: '狀態',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive');
        return (
          <Badge variant={isActive ? 'success' : 'destructive'}>
            {isActive ? '活躍' : '停用'}
          </Badge>
        );
      },
      meta: {
        minWidth: '90px',
      },
    },
    {
      accessorKey: 'verificationStatus',
      header: '身份驗證',
      cell: ({ row }) => {
        const status = row.getValue('verificationStatus') as string;
        const statusConfig = {
          PENDING: { label: '待審核', variant: 'secondary' as const },
          IN_REVIEW: { label: '審核中', variant: 'default' as const },
          VERIFIED: { label: '驗證成功', variant: 'success' as const },
          REJECTED: { label: '驗證失敗', variant: 'destructive' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'demoBalance',
      header: '模擬餘額',
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue('demoBalance'));
        return <div className="text-right">${balance.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'realBalance',
      header: '真實餘額',
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue('realBalance'));
        return <div className="text-right">${balance.toFixed(2)}</div>;
      },
    },
    {
      id: 'view',
      header: '詳情',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: `/users/${user.id}` })}
          >
            查看詳情
          </Button>
        );
      },
      meta: {
        minWidth: '110px',
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: '最後登入',
      cell: ({ row }) => {
        const date = row.getValue('lastLoginAt') as string | null;
        return date ? new Date(date).toLocaleString('zh-CN') : '從未登入';
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
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                複製用戶 ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setUserToEdit(user);
                setEditDialogOpen(true);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              {user.isActive ? (
                <DropdownMenuItem onClick={() => deactivateMutation.mutate(user.id)}>
                  <UserX className="mr-2 h-4 w-4" />
                  停用用戶
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => activateMutation.mutate(user.id)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  激活用戶
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  setUserToDelete(user);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除用戶
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Table instance
  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true,
    pageCount: data?.totalPages || 0,
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>用戶管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">載入失敗: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>用戶管理</CardTitle>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="搜索用戶..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
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
                          沒有找到用戶
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  共 {data?.total || 0} 個用戶，第 {data?.page || 0} / {data?.totalPages || 0} 頁
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
                    disabled={pagination.page >= (data?.totalPages || 0)}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除用戶 "{userToDelete?.displayName}" ({userToDelete?.email}) 嗎？
              此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={userToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
};

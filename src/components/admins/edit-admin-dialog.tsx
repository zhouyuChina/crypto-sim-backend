import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '@/services/admins';
import type { Admin, CreateAdminDto, UpdateAdminDto } from '@/types/admin';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface EditAdminDialogProps {
  admin: Admin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreating?: boolean;
}

export const EditAdminDialog = ({ admin, open, onOpenChange, isCreating = false }: EditAdminDialogProps) => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (admin) {
      setFormData({
        username: admin.username,
        password: '', // 編輯時不預填密碼
        displayName: admin.displayName || '',
        isActive: admin.isActive,
      });
    } else {
      setFormData({
        username: '',
        password: '',
        displayName: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [admin, open]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateAdminDto) => {
      return await adminService.create(api, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      setErrors({
        submit: error.response?.data?.message || '創建管理員失敗',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateAdminDto) => {
      if (!admin) return;
      return await adminService.update(api, admin.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      setErrors({
        submit: error.response?.data?.message || '更新管理員失敗',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 驗證
    if (!formData.username.trim()) {
      setErrors({ username: '請輸入用戶名' });
      return;
    }

    if (isCreating && !formData.password.trim()) {
      setErrors({ password: '請輸入密碼' });
      return;
    }

    if (isCreating) {
      const createDto: CreateAdminDto = {
        username: formData.username.trim(),
        password: formData.password,
        displayName: formData.displayName.trim() || undefined,
      };
      createMutation.mutate(createDto);
    } else {
      const updateDto: UpdateAdminDto = {
        username: formData.username.trim(),
        displayName: formData.displayName.trim() || undefined,
        isActive: formData.isActive,
      };
      // 只有當密碼不為空時才更新密碼
      if (formData.password.trim()) {
        updateDto.password = formData.password;
      }
      updateMutation.mutate(updateDto);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreating ? '新增管理員' : '編輯管理員'}</DialogTitle>
          <DialogDescription>
            {isCreating ? '創建新的管理員帳號' : '修改管理員信息'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">用戶名 *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="輸入用戶名"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                密碼 {isCreating ? '*' : '(留空則不修改)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isCreating ? '輸入密碼' : '輸入新密碼（可選）'}
                disabled={isLoading}
                required={isCreating}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">顯示名稱</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="輸入顯示名稱（可選）"
                disabled={isLoading}
              />
            </div>

            {!isCreating && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">狀態</Label>
                  <p className="text-sm text-muted-foreground">
                    啟用或停用此管理員帳號
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                  disabled={isLoading}
                />
              </div>
            )}

            {errors.submit && (
              <p className="text-sm text-destructive">{errors.submit}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isCreating
                  ? '創建中...'
                  : '更新中...'
                : isCreating
                  ? '創建'
                  : '更新'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


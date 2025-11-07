import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ipWhitelistService } from '@/services/ip-whitelist';
import type { IpWhitelist, CreateIpWhitelistDto, UpdateIpWhitelistDto } from '@/types/settings';

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

interface EditIpWhitelistDialogProps {
  ipWhitelist: IpWhitelist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreating?: boolean;
}

// IP地址驗證函數
const validateIpAddress = (ip: string): boolean => {
  // IPv4 地址驗證（支持 CIDR 格式）
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!ipv4Regex.test(ip)) return false;

  // 檢查各部分是否在有效範圍內
  const parts = ip.split('/');
  const addressParts = parts[0].split('.');
  
  for (const part of addressParts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
  }

  // 如果有 CIDR 前綴，檢查範圍
  if (parts.length > 1) {
    const prefix = parseInt(parts[1], 10);
    if (prefix < 0 || prefix > 32) return false;
  }

  return true;
};

export const EditIpWhitelistDialog = ({
  ipWhitelist,
  open,
  onOpenChange,
  isCreating = false,
}: EditIpWhitelistDialogProps) => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    ipAddress: '',
    description: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ipWhitelist) {
      setFormData({
        ipAddress: ipWhitelist.ipAddress,
        description: ipWhitelist.description || '',
        isActive: ipWhitelist.isActive,
      });
    } else {
      setFormData({
        ipAddress: '',
        description: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [ipWhitelist, open]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateIpWhitelistDto) => {
      return await ipWhitelistService.create(api, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      setErrors({
        submit: error.response?.data?.message || '創建IP白名單失敗',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateIpWhitelistDto) => {
      if (!ipWhitelist) return;
      return await ipWhitelistService.update(api, ipWhitelist.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      setErrors({
        submit: error.response?.data?.message || '更新IP白名單失敗',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 驗證IP地址
    if (!formData.ipAddress.trim()) {
      setErrors({ ipAddress: '請輸入IP地址' });
      return;
    }

    if (!validateIpAddress(formData.ipAddress.trim())) {
      setErrors({
        ipAddress: 'IP地址格式不正確，請輸入有效的IPv4地址或CIDR格式（如：192.168.1.1 或 192.168.1.0/24）',
      });
      return;
    }

    if (isCreating) {
      const createDto: CreateIpWhitelistDto = {
        ipAddress: formData.ipAddress.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };
      createMutation.mutate(createDto);
    } else {
      const updateDto: UpdateIpWhitelistDto = {
        ipAddress: formData.ipAddress.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };
      updateMutation.mutate(updateDto);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreating ? '新增IP白名單' : '編輯IP白名單'}</DialogTitle>
          <DialogDescription>
            {isCreating
              ? '添加新的IP地址到白名單'
              : '修改IP白名單信息'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ipAddress">
                IP地址 * <span className="text-xs text-muted-foreground">(支持CIDR格式)</span>
              </Label>
              <Input
                id="ipAddress"
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="例如：192.168.1.1 或 192.168.1.0/24"
                disabled={isLoading}
              />
              {errors.ipAddress && (
                <p className="text-sm text-destructive">{errors.ipAddress}</p>
              )}
              <p className="text-xs text-muted-foreground">
                支持單個IP地址（如：192.168.1.1）或CIDR格式（如：192.168.1.0/24）
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="輸入描述或備註（可選）"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">狀態</Label>
                <p className="text-sm text-muted-foreground">
                  啟用或停用此IP白名單條目
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


import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/users';
import { appConfig } from '@/config/env';
import type { User, UpdateUserDto, AdjustBalanceDto } from '@/types/user';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditUserDialog = ({ user, open, onOpenChange }: EditUserDialogProps) => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    phoneNumber: '',
    verificationStatus: 'PENDING' as 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED',
    demoBalance: '',
    realBalance: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        verificationStatus: user.verificationStatus,
        demoBalance: parseFloat(user.demoBalance).toFixed(2),
        realBalance: parseFloat(user.realBalance).toFixed(2),
      });
      setErrors({});
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      // 1. 更新用戶基本信息
      const updateDto: UpdateUserDto = {
        email: formData.email,
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        verificationStatus: formData.verificationStatus,
      };

      const updatedUser = await userService.update(api, user.id, updateDto);

      // 2. 如果余额有变化，调整余额
      const originalDemoBalance = parseFloat(user.demoBalance);
      const newDemoBalance = parseFloat(formData.demoBalance);

      if (newDemoBalance !== originalDemoBalance) {
        const adjustDto: AdjustBalanceDto = {
          balanceType: 'demo',
          adjustmentType: 'set',
          amount: newDemoBalance,
        };
        await userService.adjustBalance(api, user.id, adjustDto);
      }

      const originalRealBalance = parseFloat(user.realBalance);
      const newRealBalance = parseFloat(formData.realBalance);

      if (newRealBalance !== originalRealBalance) {
        const adjustDto: AdjustBalanceDto = {
          balanceType: 'real',
          adjustmentType: 'set',
          amount: newRealBalance,
        };
        await userService.adjustBalance(api, user.id, adjustDto);
      }

      return updatedUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗';
      setErrors({ general: message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = '郵箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '郵箱格式不正确';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = '顯示名稱不能为空';
    }

    // 暂时注释掉手机号验证
    // if (!formData.phoneNumber.trim()) {
    //   newErrors.phoneNumber = '手机号不能为空';
    // }

    const demoBalance = parseFloat(formData.demoBalance);
    if (isNaN(demoBalance) || demoBalance < 0) {
      newErrors.demoBalance = '虚拟盘金額必須是非負數';
    }

    const realBalance = parseFloat(formData.realBalance);
    if (isNaN(realBalance) || realBalance < 0) {
      newErrors.realBalance = '實際交易金額必須是非負數';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    updateMutation.mutate();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>編輯用戶</DialogTitle>
            <DialogDescription>
              修改用戶信息和账户余额
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errors.general && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {errors.general}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">郵箱 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <span className="text-sm text-red-600">{errors.email}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">顯示名稱 *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                className={errors.displayName ? 'border-red-500' : ''}
              />
              {errors.displayName && (
                <span className="text-sm text-red-600">{errors.displayName}</span>
              )}
            </div>

            {/* 暂时注释掉手机号字段，以后可能会用到 */}
            {/* <div className="grid gap-2">
              <Label htmlFor="phoneNumber">手机号 *</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                className={errors.phoneNumber ? 'border-red-500' : ''}
              />
              {errors.phoneNumber && (
                <span className="text-sm text-red-600">{errors.phoneNumber}</span>
              )}
            </div> */}

            <div className="grid gap-2">
              <Label htmlFor="verificationStatus">身份驗證狀態</Label>
              <Select
                value={formData.verificationStatus}
                onValueChange={(value) => handleChange('verificationStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">待審核</SelectItem>
                  <SelectItem value="IN_REVIEW">審核中</SelectItem>
                  <SelectItem value="VERIFIED">驗證成功</SelectItem>
                  <SelectItem value="REJECTED">验证失敗</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="demoBalance">虚拟盘金額 ($) *</Label>
                <Input
                  id="demoBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.demoBalance}
                  onChange={(e) => handleChange('demoBalance', e.target.value)}
                  className={errors.demoBalance ? 'border-red-500' : ''}
                />
                {errors.demoBalance && (
                  <span className="text-sm text-red-600">{errors.demoBalance}</span>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="realBalance">實際交易金額 ($) *</Label>
                <Input
                  id="realBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.realBalance}
                  onChange={(e) => handleChange('realBalance', e.target.value)}
                  className={errors.realBalance ? 'border-red-500' : ''}
                />
                {errors.realBalance && (
                  <span className="text-sm text-red-600">{errors.realBalance}</span>
                )}
              </div>
            </div>

            {/* 身份證信息 */}
            {user && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-sm mb-3">身份證信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 正面 */}
                  <div>
                    <p className="text-sm text-gray-500 mb-2">身份證正面</p>
                    <img
                      src={user.idCardFront ? (() => {
                        // 如果已經是完整 URL，直接使用
                        if (user.idCardFront.startsWith('http://') || user.idCardFront.startsWith('https://')) {
                          return user.idCardFront;
                        }
                        // 如果是相對路徑，拼接 base URL（去掉 /api 部分）
                        const baseUrl = appConfig.apiUrl.replace('/api', '');
                        return `${baseUrl}${user.idCardFront}`;
                      })() : '/id-card-placeholder.svg'}
                      alt="身份證正面"
                      className={`w-full h-48 object-contain border rounded ${user.idCardFront ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
                      onClick={() => {
                        if (user.idCardFront) {
                          const url = user.idCardFront.startsWith('http://') || user.idCardFront.startsWith('https://')
                            ? user.idCardFront
                            : `${appConfig.apiUrl.replace('/api', '')}${user.idCardFront}`;
                          window.open(url, '_blank');
                        }
                      }}
                    />
                  </div>

                  {/* 反面 */}
                  <div>
                    <p className="text-sm text-gray-500 mb-2">身份證反面</p>
                    <img
                      src={user.idCardBack ? (() => {
                        // 如果已經是完整 URL，直接使用
                        if (user.idCardBack.startsWith('http://') || user.idCardBack.startsWith('https://')) {
                          return user.idCardBack;
                        }
                        // 如果是相對路徑，拼接 base URL（去掉 /api 部分）
                        const baseUrl = appConfig.apiUrl.replace('/api', '');
                        return `${baseUrl}${user.idCardBack}`;
                      })() : '/id-card-placeholder.svg'}
                      alt="身份證反面"
                      className={`w-full h-48 object-contain border rounded ${user.idCardBack ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
                      onClick={() => {
                        if (user.idCardBack) {
                          const url = user.idCardBack.startsWith('http://') || user.idCardBack.startsWith('https://')
                            ? user.idCardBack
                            : `${appConfig.apiUrl.replace('/api', '')}${user.idCardBack}`;
                          window.open(url, '_blank');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Operator } from '@/types/operator';

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

interface EditOperatorDialogProps {
  operator: Operator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    displayName: string;
    email: string;
    phoneNumber?: string;
    isActive: boolean;
    demoBalance?: number;
    realBalance?: number;
  }) => Promise<void> | void;
}

export const EditOperatorDialog = ({ operator, open, onOpenChange, onSave }: EditOperatorDialogProps) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    isActive: 'active' as 'active' | 'inactive',
    demoBalance: '',
    realBalance: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (operator) {
      setFormData({
        displayName: operator.displayName || '',
        email: operator.email || '',
        phoneNumber: operator.phoneNumber || '',
        isActive: operator.isActive ? 'active' : 'inactive',
        demoBalance: operator.demoBalance?.toString() || '',
        realBalance: operator.realBalance?.toString() || '',
      });
      setErrors({});
    }
  }, [operator]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = '姓名不能為空';
    }

    if (!formData.email.trim()) {
      newErrors.email = '郵箱不能為空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '郵箱格式不正確';
    }

    if (formData.demoBalance && isNaN(parseFloat(formData.demoBalance))) {
      newErrors.demoBalance = '虛擬帳戶餘額必須為數字';
    }

    if (formData.realBalance && isNaN(parseFloat(formData.realBalance))) {
      newErrors.realBalance = '真實帳戶餘額必須為數字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !operator) return;

    setIsSubmitting(true);
    try {
      await onSave({
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        isActive: formData.isActive === 'active',
        demoBalance: formData.demoBalance ? parseFloat(formData.demoBalance) : undefined,
        realBalance: formData.realBalance ? parseFloat(formData.realBalance) : undefined,
      });
      onOpenChange(false);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || '更新操作員失敗';
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!operator) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>編輯操作員</DialogTitle>
          <DialogDescription>修改操作員 {operator.displayName} 的資訊</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="請輸入姓名"
              disabled={isSubmitting}
            />
            {errors.displayName && <p className="text-sm text-red-600">{errors.displayName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">郵箱</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="請輸入郵箱"
              disabled={isSubmitting}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">電話</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="請輸入電話（選填）"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">狀態</Label>
            <Select
              value={formData.isActive}
              onValueChange={(value) => setFormData({ ...formData, isActive: value as 'active' | 'inactive' })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">啟用</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="demoBalance">虛擬帳戶餘額</Label>
              <Input
                id="demoBalance"
                type="number"
                value={formData.demoBalance}
                onChange={(e) => setFormData({ ...formData, demoBalance: e.target.value })}
                placeholder="0"
                disabled={isSubmitting}
              />
              {errors.demoBalance && (
                <p className="text-sm text-red-600">{errors.demoBalance}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="realBalance">真實帳戶餘額</Label>
              <Input
                id="realBalance"
                type="number"
                value={formData.realBalance}
                onChange={(e) => setFormData({ ...formData, realBalance: e.target.value })}
                placeholder="0"
                disabled={isSubmitting}
              />
              {errors.realBalance && (
                <p className="text-sm text-red-600">{errors.realBalance}</p>
              )}
            </div>
          </div>
        </div>
        {errors.submit && <p className="px-1 text-sm text-destructive">{errors.submit}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

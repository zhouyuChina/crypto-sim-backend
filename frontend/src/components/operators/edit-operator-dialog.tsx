import { useState, useEffect } from 'react';
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
  onSave: (data: Partial<Operator>) => void;
}

export const EditOperatorDialog = ({ operator, open, onOpenChange, onSave }: EditOperatorDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    demoAccountBalance: '',
    realAccountBalance: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (operator) {
      setFormData({
        name: operator.name || '',
        email: operator.email || '',
        phone: operator.phone || '',
        status: operator.status || 'active',
        demoAccountBalance: operator.demoAccountBalance?.toString() || '',
        realAccountBalance: operator.realAccountBalance?.toString() || '',
      });
      setErrors({});
    }
  }, [operator]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '姓名不能為空';
    }

    if (!formData.email.trim()) {
      newErrors.email = '郵箱不能為空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '郵箱格式不正確';
    }

    if (formData.demoAccountBalance && isNaN(parseFloat(formData.demoAccountBalance))) {
      newErrors.demoAccountBalance = '虛擬帳戶餘額必須為數字';
    }

    if (formData.realAccountBalance && isNaN(parseFloat(formData.realAccountBalance))) {
      newErrors.realAccountBalance = '真實帳戶餘額必須為數字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSave({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      status: formData.status,
      demoAccountBalance: formData.demoAccountBalance ? parseFloat(formData.demoAccountBalance) : 0,
      realAccountBalance: formData.realAccountBalance ? parseFloat(formData.realAccountBalance) : 0,
    });

    onOpenChange(false);
  };

  if (!operator) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>編輯操作員</DialogTitle>
          <DialogDescription>
            修改操作員 {operator.name} 的資訊
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="請輸入姓名"
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">郵箱</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="請輸入郵箱"
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">電話</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="請輸入電話（選填）"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">狀態</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}
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
              <Label htmlFor="demoAccountBalance">虛擬帳戶餘額</Label>
              <Input
                id="demoAccountBalance"
                type="number"
                value={formData.demoAccountBalance}
                onChange={(e) => setFormData({ ...formData, demoAccountBalance: e.target.value })}
                placeholder="0"
              />
              {errors.demoAccountBalance && (
                <p className="text-sm text-red-600">{errors.demoAccountBalance}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="realAccountBalance">真實帳戶餘額</Label>
              <Input
                id="realAccountBalance"
                type="number"
                value={formData.realAccountBalance}
                onChange={(e) => setFormData({ ...formData, realAccountBalance: e.target.value })}
                placeholder="0"
              />
              {errors.realAccountBalance && (
                <p className="text-sm text-red-600">{errors.realAccountBalance}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


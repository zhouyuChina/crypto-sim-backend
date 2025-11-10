import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { operatorService } from '@/services/operators';
import type { CreateOperatorDto, Operator } from '@/types/operator';
import { useToastContext } from '@/providers/toast-provider';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

const VERIFICATION_STATUS_OPTIONS = [
  { value: 'PENDING', label: '待審核' },
  { value: 'IN_REVIEW', label: '審核中' },
  { value: 'VERIFIED', label: '已驗證' },
  { value: 'REJECTED', label: '已拒絕' },
] as const;

type VerificationStatus = (typeof VERIFICATION_STATUS_OPTIONS)[number]['value'];

interface FormState {
  displayName: string;
  email: string;
  phoneNumber: string;
  avatar: string;
  demoBalance: string;
  realBalance: string;
  verificationStatus: VerificationStatus;
}

export const OperatorCreatePage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext();

  const [formData, setFormData] = useState<FormState>({
    displayName: '',
    email: '',
    phoneNumber: '',
    avatar: '',
    demoBalance: '10000',
    realBalance: '0',
    verificationStatus: 'PENDING',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (payload: CreateOperatorDto) => operatorService.create(api, payload),
    onSuccess: (operator: Operator) => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      toast({
        title: '操作員已建立',
        description: `${operator.displayName} 可以開始執行模擬交易`
      });
      navigate({ to: '/operators' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '新增操作員失敗，請稍後再試';
      setErrors({ submit: message });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = '請輸入姓名';
    }

    if (!formData.email.trim()) {
      newErrors.email = '請輸入郵箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '郵箱格式不正確';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '請輸入電話';
    }

    if (formData.avatar.trim()) {
      try {
        new URL(formData.avatar.trim());
      } catch {
        newErrors.avatar = '請輸入有效的 URL';
      }
    }

    if (formData.demoBalance && isNaN(Number(formData.demoBalance))) {
      newErrors.demoBalance = '請輸入合法的數字';
    }

    if (formData.realBalance && isNaN(Number(formData.realBalance))) {
      newErrors.realBalance = '請輸入合法的數字';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const payload: CreateOperatorDto = {
      email: formData.email.trim(),
      displayName: formData.displayName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      verificationStatus: formData.verificationStatus,
    };

    if (formData.avatar.trim()) {
      payload.avatar = formData.avatar.trim();
    }
    if (formData.demoBalance) {
      payload.demoBalance = Number(formData.demoBalance);
    }
    if (formData.realBalance) {
      payload.realBalance = Number(formData.realBalance);
    }

    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending;

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">新增操作員</h1>
          <p className="text-muted-foreground">設定專屬操盤員的基本資料及初始餘額</p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: '/operators' })} type="button">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>操作員資訊</CardTitle>
            <CardDescription>請完成必填欄位，保存後即可在列表中看到新的操作員。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">姓名 *</Label>
                  <Input
                    id="displayName"
                    placeholder="輸入操作員姓名"
                    value={formData.displayName}
                    onChange={(event) => updateField('displayName', event.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.displayName && (
                    <p className="text-sm text-destructive">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">郵箱 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="operator@example.com"
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">電話 *</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="0912-345-678"
                    value={formData.phoneNumber}
                    onChange={(event) => updateField('phoneNumber', event.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-destructive">{errors.phoneNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar">頭像 URL</Label>
                  <Input
                    id="avatar"
                    type="url"
                    placeholder="https://example.com/avatar.png"
                    value={formData.avatar}
                    onChange={(event) => updateField('avatar', event.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.avatar && <p className="text-sm text-destructive">{errors.avatar}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationStatus">身份驗證</Label>
                  <Select
                    value={formData.verificationStatus}
                    onValueChange={(value) => updateField('verificationStatus', value as VerificationStatus)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="verificationStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VERIFICATION_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demoBalance">模擬帳戶餘額</Label>
                  <Input
                    id="demoBalance"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="預設 10000"
                    value={formData.demoBalance}
                    onChange={(event) => updateField('demoBalance', event.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.demoBalance && (
                    <p className="text-sm text-destructive">{errors.demoBalance}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="realBalance">真實帳戶餘額</Label>
                  <Input
                    id="realBalance"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="預設 0"
                    value={formData.realBalance}
                    onChange={(event) => updateField('realBalance', event.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.realBalance && (
                    <p className="text-sm text-destructive">{errors.realBalance}</p>
                  )}
                </div>
              </div>
            </div>

            {errors.submit && (
              <p className="text-sm text-destructive">{errors.submit}</p>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/operators' })}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              建立操作員
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};


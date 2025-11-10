import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { cmsService } from '@/services/cms';
import type {
  Testimonial,
  TestimonialPayload,
  CarouselItem,
  CarouselPayload,
  LeaderboardEntry,
  LeaderboardPayload,
  LeaderboardType,
  TradingPerformanceEntry,
  TradingPerformancePayload
} from '@/types/cms';

const tabs = [
  {
    value: 'testimonials',
    label: '用戶見證管理',
    description: '管理展示在登入前首頁上的用戶見證內容'
  },
  {
    value: 'carousel',
    label: '公告輪播管理',
    description: '配置登入後首頁公告輪播文字'
  },
  {
    value: 'leaderboard',
    label: '排行榜管理',
    description: '維護排行榜展示的數據來源與排版'
  },
  {
    value: 'trading-performance',
    label: '交易時長/盈利率管理',
    description: '維護不同交易時長對應的盈利率配置'
  }
] as const;

const placeholder = (
  <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
    模块待开发，后续补充列表与操作。
  </div>
);

const leaderboardTypeOptions: Array<{ label: string; value: LeaderboardType }> = [
  { label: '日榜', value: 'DAILY' },
  { label: '周榜', value: 'WEEKLY' },
  { label: '月榜', value: 'MONTHLY' }
];

const leaderboardTypeLabel: Record<LeaderboardType, string> = {
  DAILY: '日榜',
  WEEKLY: '周榜',
  MONTHLY: '月榜'
};

// 格式化日期時間為兩行顯示
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  return `${dateStr}\n${timeStr}`;
};

type TestimonialFormState = {
  name: string;
  title: string;
  rating: string;
  content: string;
};

const initialTestimonialFormState: TestimonialFormState = {
  name: '',
  title: '',
  rating: '5',
  content: ''
};

type CarouselFormState = {
  sortOrder: string;
  content: string;
};

const initialCarouselFormState: CarouselFormState = {
  sortOrder: '0',
  content: ''
};

type LeaderboardFormState = {
  type: LeaderboardType;
  avatar: string;
  country: string;
  name: string;
  tradeCount: string;
  winRate: string;
  volume: string;
};

const initialLeaderboardFormState: LeaderboardFormState = {
  type: 'DAILY',
  avatar: '',
  country: '',
  name: '',
  tradeCount: '0',
  winRate: '0',
  volume: '0'
};

type TradingPerformanceFormState = {
  tradeDuration: string;
  winRate: string;
};

const initialTradingPerformanceFormState: TradingPerformanceFormState = {
  tradeDuration: '1',
  winRate: '0'
};

export const CmsPage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState<TestimonialFormState>(() => ({
    ...initialTestimonialFormState
  }));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [carouselDialogOpen, setCarouselDialogOpen] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<CarouselItem | null>(null);
  const [carouselFormData, setCarouselFormData] = useState<CarouselFormState>(() => ({
    ...initialCarouselFormState
  }));
  const [carouselFormErrors, setCarouselFormErrors] = useState<Record<string, string>>({});

  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [editingLeaderboard, setEditingLeaderboard] = useState<LeaderboardEntry | null>(null);
  const [leaderboardFormData, setLeaderboardFormData] = useState<LeaderboardFormState>(() => ({
    ...initialLeaderboardFormState
  }));
  const [leaderboardFormErrors, setLeaderboardFormErrors] = useState<Record<string, string>>({});

  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<TradingPerformanceEntry | null>(null);
  const [performanceFormData, setPerformanceFormData] = useState<TradingPerformanceFormState>(() => ({
    ...initialTradingPerformanceFormState
  }));
  const [performanceFormErrors, setPerformanceFormErrors] = useState<Record<string, string>>({});

  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardType | 'all'>('all');

  const {
    data: testimonials = [],
    isLoading: testimonialsLoading
  } = useQuery({
    queryKey: ['cms', 'testimonials'],
    queryFn: () => cmsService.listTestimonials(api)
  });

  const {
    data: carousels = [],
    isLoading: carouselsLoading
  } = useQuery({
    queryKey: ['cms', 'carousels'],
    queryFn: () => cmsService.listCarousels(api)
  });

  const {
    data: leaderboard = [],
    isLoading: leaderboardLoading
  } = useQuery({
    queryKey: ['cms', 'leaderboard'],
    queryFn: () => cmsService.listLeaderboard(api)
  });

  const {
    data: tradingPerformance = [],
    isLoading: tradingPerformanceLoading
  } = useQuery({
    queryKey: ['cms', 'trading-performance'],
    queryFn: () => cmsService.listTradingPerformance(api)
  });

  const createMutation = useMutation({
    mutationFn: (payload: TestimonialPayload) => cmsService.createTestimonial(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍后再试';
      setFormErrors({ general: message });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TestimonialPayload }) =>
      cmsService.updateTestimonial(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍后再试';
      setFormErrors({ general: message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteTestimonial(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] });
    }
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const createCarouselMutation = useMutation({
    mutationFn: (payload: CarouselPayload) => cmsService.createCarousel(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'carousels'] });
      setCarouselDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍后再试';
      setCarouselFormErrors({ general: message });
    }
  });

  const updateCarouselMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CarouselPayload }) =>
      cmsService.updateCarousel(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'carousels'] });
      setCarouselDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍后再试';
      setCarouselFormErrors({ general: message });
    }
  });

  const deleteCarouselMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteCarousel(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'carousels'] });
    }
  });

  const isCarouselSubmitting =
    createCarouselMutation.isPending || updateCarouselMutation.isPending;

  const createLeaderboardMutation = useMutation({
    mutationFn: (payload: LeaderboardPayload) => cmsService.createLeaderboard(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'leaderboard'] });
      setLeaderboardDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍后再试';
      setLeaderboardFormErrors({ general: message });
    }
  });

  const updateLeaderboardMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LeaderboardPayload }) =>
      cmsService.updateLeaderboard(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'leaderboard'] });
      setLeaderboardDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍后再试';
      setLeaderboardFormErrors({ general: message });
    }
  });

  const deleteLeaderboardMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteLeaderboard(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'leaderboard'] });
    }
  });

  const isLeaderboardSubmitting =
    createLeaderboardMutation.isPending || updateLeaderboardMutation.isPending;

  const createPerformanceMutation = useMutation({
    mutationFn: (payload: TradingPerformancePayload) =>
      cmsService.createTradingPerformance(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'trading-performance'] });
      setPerformanceDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍后再试';
      setPerformanceFormErrors({ general: message });
    }
  });

  const updatePerformanceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TradingPerformancePayload }) =>
      cmsService.updateTradingPerformance(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'trading-performance'] });
      setPerformanceDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍后再试';
      setPerformanceFormErrors({ general: message });
    }
  });

  const deletePerformanceMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteTradingPerformance(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'trading-performance'] });
    }
  });

  const isPerformanceSubmitting =
    createPerformanceMutation.isPending || updatePerformanceMutation.isPending;

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      setFormErrors({});
      setFormData(() => ({ ...initialTestimonialFormState }));
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setFormErrors({});
    setFormData(() => ({ ...initialTestimonialFormState }));
    setDialogOpen(true);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
    setFormErrors({});
    setFormData({
      name: testimonial.name,
      title: testimonial.title,
      rating: String(testimonial.rating),
      content: testimonial.content
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '名稱不能为空';
    }

    if (!formData.title.trim()) {
      errors.title = '稱號不能为空';
    }

    const rating = Number(formData.rating);
    if (Number.isNaN(rating)) {
      errors.rating = '評價星必须是数字';
    } else if (rating < 1 || rating > 5) {
      errors.rating = '評價星范围为 1-5';
    }

    if (!formData.content.trim()) {
      errors.content = '評論內容不能为空';
    }

    return errors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload: TestimonialPayload = {
      name: formData.name.trim(),
      title: formData.title.trim(),
      rating: Number(formData.rating),
      content: formData.content.trim()
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (testimonial: Testimonial) => {
    if (deleteMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除「${testimonial.name}」的用戶見證嗎？`);
    if (confirmed) {
      deleteMutation.mutate(testimonial.id);
    }
  };

  const handleCarouselDialogOpenChange = (open: boolean) => {
    setCarouselDialogOpen(open);
    if (!open) {
      setEditingCarousel(null);
      setCarouselFormErrors({});
      setCarouselFormData(() => ({ ...initialCarouselFormState }));
    }
  };

  const handleCreateCarousel = () => {
    setEditingCarousel(null);
    setCarouselFormErrors({});
    setCarouselFormData(() => ({ ...initialCarouselFormState }));
    setCarouselDialogOpen(true);
  };

  const handleEditCarousel = (item: CarouselItem) => {
    setEditingCarousel(item);
    setCarouselFormErrors({});
    setCarouselFormData({
      sortOrder: String(item.sortOrder),
      content: item.content
    });
    setCarouselDialogOpen(true);
  };

  const validateCarouselForm = () => {
    const errors: Record<string, string> = {};

    const sortOrder = Number(carouselFormData.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      errors.sortOrder = '排序必須是整數';
    } else if (sortOrder < 0) {
      errors.sortOrder = '排序不能小于 0';
    }

    if (!carouselFormData.content.trim()) {
      errors.content = '內文不能为空';
    }

    return errors;
  };

  const handleCarouselSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateCarouselForm();

    if (Object.keys(errors).length > 0) {
      setCarouselFormErrors(errors);
      return;
    }

    const payload: CarouselPayload = {
      sortOrder: Number(carouselFormData.sortOrder),
      content: carouselFormData.content.trim()
    };

    if (editingCarousel) {
      updateCarouselMutation.mutate({ id: editingCarousel.id, payload });
    } else {
      createCarouselMutation.mutate(payload);
    }
  };

  const handleCarouselDelete = (item: CarouselItem) => {
    if (deleteCarouselMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除排序為 ${item.sortOrder} 的公告輪播嗎？`);
    if (confirmed) {
      deleteCarouselMutation.mutate(item.id);
    }
  };

  const handleLeaderboardDialogOpenChange = (open: boolean) => {
    setLeaderboardDialogOpen(open);
    if (!open) {
      setEditingLeaderboard(null);
      setLeaderboardFormErrors({});
      setLeaderboardFormData(() => ({ ...initialLeaderboardFormState }));
    }
  };

  const handleCreateLeaderboard = () => {
    setEditingLeaderboard(null);
    setLeaderboardFormErrors({});
    setLeaderboardFormData(() => ({ ...initialLeaderboardFormState }));
    setLeaderboardDialogOpen(true);
  };

  const handleEditLeaderboard = (entry: LeaderboardEntry) => {
    setEditingLeaderboard(entry);
    setLeaderboardFormErrors({});
    setLeaderboardFormData({
      type: entry.type,
      avatar: entry.avatar ?? '',
      country: entry.country,
      name: entry.name,
      tradeCount: String(entry.tradeCount),
      winRate: entry.winRate.toString(),
      volume: entry.volume.toString()
    });
    setLeaderboardDialogOpen(true);
  };

  const validateLeaderboardForm = () => {
    const errors: Record<string, string> = {};

    if (!leaderboardFormData.country.trim()) {
      errors.country = '國家不能为空';
    }

    if (!leaderboardFormData.name.trim()) {
      errors.name = '姓名不能为空';
    }

    const tradeCount = Number(leaderboardFormData.tradeCount);
    if (!Number.isInteger(tradeCount) || tradeCount < 0) {
      errors.tradeCount = '成交筆數必須是 >= 0 的整數';
    }

    const winRate = Number(leaderboardFormData.winRate);
    if (Number.isNaN(winRate) || winRate < 0 || winRate > 100) {
      errors.winRate = '勝率需在 0-100 之間';
    }

    const volume = Number(leaderboardFormData.volume);
    if (Number.isNaN(volume) || volume < 0) {
      errors.volume = '成交金額必須是非負數';
    }

    if (leaderboardFormData.avatar.trim()) {
      try {
        new URL(leaderboardFormData.avatar.trim());
      } catch {
        errors.avatar = '頭像地址不是有效的 URL';
      }
    }

    return errors;
  };

  const handleLeaderboardSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLeaderboardForm();

    if (Object.keys(errors).length > 0) {
      setLeaderboardFormErrors(errors);
      return;
    }

    const payload: LeaderboardPayload = {
      type: leaderboardFormData.type,
      avatar: leaderboardFormData.avatar.trim() || undefined,
      country: leaderboardFormData.country.trim(),
      name: leaderboardFormData.name.trim(),
      tradeCount: Number(leaderboardFormData.tradeCount),
      winRate: Number(leaderboardFormData.winRate),
      volume: Number(leaderboardFormData.volume)
    };

    if (editingLeaderboard) {
      updateLeaderboardMutation.mutate({ id: editingLeaderboard.id, payload });
    } else {
      createLeaderboardMutation.mutate(payload);
    }
  };

  const handleLeaderboardDelete = (entry: LeaderboardEntry) => {
    if (deleteLeaderboardMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除 ${leaderboardTypeLabel[entry.type]} 的 ${entry.name} 嗎？`);
    if (confirmed) {
      deleteLeaderboardMutation.mutate(entry.id);
    }
  };

  const handlePerformanceDialogOpenChange = (open: boolean) => {
    setPerformanceDialogOpen(open);
    if (!open) {
      setEditingPerformance(null);
      setPerformanceFormErrors({});
      setPerformanceFormData(() => ({ ...initialTradingPerformanceFormState }));
    }
  };

  const handleCreatePerformance = () => {
    setEditingPerformance(null);
    setPerformanceFormErrors({});
    setPerformanceFormData(() => ({ ...initialTradingPerformanceFormState }));
    setPerformanceDialogOpen(true);
  };

  const handleEditPerformance = (entry: TradingPerformanceEntry) => {
    setEditingPerformance(entry);
    setPerformanceFormErrors({});
    setPerformanceFormData({
      tradeDuration: String(entry.tradeDuration),
      winRate: entry.winRate.toString()
    });
    setPerformanceDialogOpen(true);
  };

  const validatePerformanceForm = () => {
    const errors: Record<string, string> = {};

    const duration = Number(performanceFormData.tradeDuration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
      errors.tradeDuration = '交易時長必須是 1~300 的整數（單位：秒）';
    }

    const winRate = Number(performanceFormData.winRate);
    if (Number.isNaN(winRate) || winRate < 0 || winRate > 100) {
      errors.winRate = '盈利率需在 0-100 之間';
    }

    return errors;
  };

  const handlePerformanceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validatePerformanceForm();

    if (Object.keys(errors).length > 0) {
      setPerformanceFormErrors(errors);
      return;
    }

    const payload: TradingPerformancePayload = {
      tradeDuration: Number(performanceFormData.tradeDuration),
      winRate: Number(performanceFormData.winRate)
    };

    if (editingPerformance) {
      updatePerformanceMutation.mutate({ id: editingPerformance.id, payload });
    } else {
      createPerformanceMutation.mutate(payload);
    }
  };

  const handlePerformanceDelete = (entry: TradingPerformanceEntry) => {
    if (deletePerformanceMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除交易時長 ${entry.tradeDuration} 秒的配置嗎？`);
    if (confirmed) {
      deletePerformanceMutation.mutate(entry.id);
    }
  };

  const renderTestimonialsTable = () => {
    if (testimonialsLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入用戶見證...
        </div>
      );
    }

    if (testimonials.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暫無用戶見證，點擊右上角按鈕新增一條吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead style={{ minWidth: '100px' }}>名稱</TableHead>
                <TableHead style={{ minWidth: '120px' }}>稱號</TableHead>
              <TableHead className="w-24">評價星</TableHead>
                <TableHead style={{ minWidth: '200px' }}>評論內容</TableHead>
                <TableHead style={{ minWidth: '150px' }}>更新時間</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials.map(testimonial => (
              <TableRow key={testimonial.id}>
                <TableCell className="font-medium">{testimonial.name}</TableCell>
                <TableCell>{testimonial.title}</TableCell>
                <TableCell>
                  <span className="font-medium text-amber-500">
                    {'★'.repeat(testimonial.rating)}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    {testimonial.rating}/5
                  </span>
                </TableCell>
                <TableCell className="max-w-xl whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {testimonial.content}
                </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatDateTime(testimonial.updatedAt)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(testimonial)}
                  >
                    <Edit2 className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(testimonial)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  const renderCarouselsTable = () => {
    if (carouselsLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入公告輪播...
        </div>
      );
    }

    if (carousels.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暫無公告輪播，點擊右上角按鈕新增一條吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">排序</TableHead>
              <TableHead>內容</TableHead>
              <TableHead className="w-40">更新時間</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carousels.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.sortOrder}</TableCell>
                <TableCell className="max-w-2xl whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {item.content}
                </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatDateTime(item.updatedAt)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditCarousel(item)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleCarouselDelete(item)}
                    disabled={deleteCarouselMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  const renderLeaderboardTable = () => {
    if (leaderboardLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入排行榜...
        </div>
      );
    }

    const filteredLeaderboard = leaderboardFilter === 'all' 
      ? leaderboard 
      : leaderboard.filter(entry => entry.type === leaderboardFilter);

    if (filteredLeaderboard.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">篩選：</span>
            <Select
              value={leaderboardFilter}
              onValueChange={(value) => setLeaderboardFilter(value as LeaderboardType | 'all')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="DAILY">日榜</SelectItem>
                <SelectItem value="WEEKLY">週榜</SelectItem>
                <SelectItem value="MONTHLY">月榜</SelectItem>
              </SelectContent>
            </Select>
          </div>
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {leaderboard.length === 0 
              ? '暫無排行榜數據，點擊右上角按鈕新增一條吧。'
              : `暫無${leaderboardFilter === 'DAILY' ? '日榜' : leaderboardFilter === 'WEEKLY' ? '週榜' : '月榜'}數據`}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">篩選：</span>
          <Select
            value={leaderboardFilter}
            onValueChange={(value) => setLeaderboardFilter(value as LeaderboardType | 'all')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="DAILY">日榜</SelectItem>
              <SelectItem value="WEEKLY">週榜</SelectItem>
              <SelectItem value="MONTHLY">月榜</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead className="w-24">類型</TableHead>
                <TableHead style={{ minWidth: '90px' }}>頭像</TableHead>
                <TableHead className="w-28">國家/地區</TableHead>
              <TableHead className="w-32">姓名</TableHead>
              <TableHead className="w-28">成交筆數</TableHead>
              <TableHead className="w-24">勝率</TableHead>
              <TableHead className="w-32">成交金額</TableHead>
              <TableHead className="w-40">更新時間</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredLeaderboard.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{leaderboardTypeLabel[entry.type]}</TableCell>
                <TableCell>
                  {entry.avatar ? (
                    <img
                      src={entry.avatar}
                      alt={entry.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">未上传</span>
                  )}
                </TableCell>
                <TableCell>{entry.country}</TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell>{entry.tradeCount.toLocaleString()}</TableCell>
                <TableCell>{entry.winRate.toFixed(2)}%</TableCell>
                  <TableCell>${entry.volume.toLocaleString()} USDT</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatDateTime(entry.updatedAt)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditLeaderboard(entry)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleLeaderboardDelete(entry)}
                    disabled={deleteLeaderboardMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  const renderPerformanceTable = () => {
    if (tradingPerformanceLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入交易時長与盈利率配置...
        </div>
      );
    }

    if (tradingPerformance.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暫無交易時長配置，點擊右上角按鈕新增一條吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead className="w-40">交易時長 (秒)</TableHead>
                <TableHead className="w-32">盈利率 (%)</TableHead>
              <TableHead className="w-40">更新時間</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tradingPerformance.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.tradeDuration}</TableCell>
                <TableCell>{entry.winRate.toFixed(2)}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatDateTime(entry.updatedAt)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditPerformance(entry)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handlePerformanceDelete(entry)}
                    disabled={deletePerformanceMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CMS 內容管理</h1>
        <p className="text-muted-foreground">集中管理網頁前端營銷與展示內容</p>
      </div>

      <Tabs defaultValue={tabs[0]?.value ?? ''} className="space-y-4">
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(tab => {
          const isTestimonials = tab.value === 'testimonials';
          const isCarousel = tab.value === 'carousel';
          const isLeaderboard = tab.value === 'leaderboard';
          const isTradingPerformanceTab = tab.value === 'trading-performance';

          return (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>{tab.label}</CardTitle>
                    <CardDescription>{tab.description}</CardDescription>
                  </div>
                  {isTestimonials ? (
                    <Button size="sm" onClick={handleCreate}>
                      新增用戶見證
                    </Button>
                  ) : null}
                  {isCarousel ? (
                    <Button size="sm" onClick={handleCreateCarousel}>
                      新增公告輪播
                    </Button>
                  ) : null}
                  {isLeaderboard ? (
                    <Button size="sm" onClick={handleCreateLeaderboard}>
                      新增排行榜记录
                    </Button>
                  ) : null}
                  {isTradingPerformanceTab ? (
                    <Button size="sm" onClick={handleCreatePerformance}>
                      新增交易時長配置
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {isTestimonials
                    ? renderTestimonialsTable()
                    : isCarousel
                      ? renderCarouselsTable()
                      : isLeaderboard
                        ? renderLeaderboardTable()
                        : isTradingPerformanceTab
                          ? renderPerformanceTable()
                          : placeholder}
                </CardContent>
              </Card>

              {isTestimonials ? (
                <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogContent className="sm:max-w-[520px]">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>{editing ? '編輯用戶見證' : '新增用戶見證'}</DialogTitle>
                      </DialogHeader>

                      {formErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {formErrors.general}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-name">名稱</Label>
                        <Input
                          id="testimonial-name"
                          value={formData.name}
                          onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))}
                          placeholder="例如：張偉"
                          disabled={isSubmitting}
                        />
                        {formErrors.name ? (
                          <p className="text-sm text-destructive">{formErrors.name}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-title">稱號</Label>
                        <Input
                          id="testimonial-title"
                          value={formData.title}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="例如：資深交易員"
                          disabled={isSubmitting}
                        />
                        {formErrors.title ? (
                          <p className="text-sm text-destructive">{formErrors.title}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-rating">評價星</Label>
                        <Input
                          id="testimonial-rating"
                          type="number"
                          min={1}
                          max={5}
                          value={formData.rating}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, rating: event.target.value }))
                          }
                          disabled={isSubmitting}
                        />
                        {formErrors.rating ? (
                          <p className="text-sm text-destructive">{formErrors.rating}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">輸入 1-5 之间的整数</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-content">評論內文</Label>
                        <textarea
                          id="testimonial-content"
                          value={formData.content}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, content: event.target.value }))
                          }
                          rows={5}
                          className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="請輸入详细的评價內容..."
                          disabled={isSubmitting}
                        />
                        {formErrors.content ? (
                          <p className="text-sm text-destructive">{formErrors.content}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            建議 20-200 字，突出體驗亮點
                          </p>
                        )}
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isSubmitting}
                          onClick={() => handleDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? '提交中…' : editing ? '保存修改' : '創建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}

              {isCarousel ? (
                <Dialog open={carouselDialogOpen} onOpenChange={handleCarouselDialogOpenChange}>
                  <DialogContent className="sm:max-w-[520px]">
                    <form onSubmit={handleCarouselSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>{editingCarousel ? '編輯公告輪播' : '新增公告輪播'}</DialogTitle>
                      </DialogHeader>

                      {carouselFormErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {carouselFormErrors.general}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="carousel-sortOrder">排序</Label>
                        <Input
                          id="carousel-sortOrder"
                          type="number"
                          min={0}
                          value={carouselFormData.sortOrder}
                          onChange={event =>
                            setCarouselFormData(prev => ({
                              ...prev,
                              sortOrder: event.target.value
                            }))
                          }
                          disabled={isCarouselSubmitting}
                        />
                        {carouselFormErrors.sortOrder ? (
                          <p className="text-sm text-destructive">{carouselFormErrors.sortOrder}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            數值越小越靠前，建議從 0 或 1 開始遞增
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="carousel-content">內文</Label>
                        <textarea
                          id="carousel-content"
                          value={carouselFormData.content}
                          onChange={event =>
                            setCarouselFormData(prev => ({ ...prev, content: event.target.value }))
                          }
                          rows={4}
                          className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="請輸入公告內容..."
                          disabled={isCarouselSubmitting}
                        />
                        {carouselFormErrors.content ? (
                          <p className="text-sm text-destructive">{carouselFormErrors.content}</p>
                        ) : null}
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isCarouselSubmitting}
                          onClick={() => handleCarouselDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isCarouselSubmitting}>
                          {isCarouselSubmitting ? '提交中…' : editingCarousel ? '保存修改' : '創建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}

              {isLeaderboard ? (
                <Dialog
                  open={leaderboardDialogOpen}
                  onOpenChange={handleLeaderboardDialogOpenChange}
                >
                  <DialogContent className="sm:max-w-[560px]">
                    <form onSubmit={handleLeaderboardSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>
                          {editingLeaderboard ? '編輯排行榜记录' : '新增排行榜记录'}
                        </DialogTitle>
                      </DialogHeader>

                      {leaderboardFormErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {leaderboardFormErrors.general}
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-type">排行榜類型</Label>
                          <Select
                            value={leaderboardFormData.type}
                            onValueChange={value =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                type: value as LeaderboardType
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          >
                            <SelectTrigger id="leaderboard-type">
                              <SelectValue placeholder="選擇類型" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaderboardTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-avatar">頭像链接</Label>
                          <Input
                            id="leaderboard-avatar"
                            value={leaderboardFormData.avatar}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                avatar: event.target.value
                              }))
                            }
                            placeholder="https://..."
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.avatar ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.avatar}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">可選，建議使用 CDN 圖片地址</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-country">國家/地區</Label>
                          <Input
                            id="leaderboard-country"
                            value={leaderboardFormData.country}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                country: event.target.value
                              }))
                            }
                            placeholder="例如：中國"
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.country ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.country}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-name">姓名</Label>
                          <Input
                            id="leaderboard-name"
                            value={leaderboardFormData.name}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                name: event.target.value
                              }))
                            }
                            placeholder="例如：陳睿"
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.name ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.name}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-tradeCount">成交筆數</Label>
                          <Input
                            id="leaderboard-tradeCount"
                            type="number"
                            min={0}
                            value={leaderboardFormData.tradeCount}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                tradeCount: event.target.value
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.tradeCount ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.tradeCount}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-winRate">勝率 (%)</Label>
                          <Input
                            id="leaderboard-winRate"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={leaderboardFormData.winRate}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                winRate: event.target.value
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.winRate ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.winRate}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">範圍 0-100，保留 2 位小数</p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="leaderboard-volume">成交金額</Label>
                          <Input
                            id="leaderboard-volume"
                            type="number"
                            min={0}
                            step={0.01}
                            value={leaderboardFormData.volume}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                volume: event.target.value
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.volume ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.volume}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">支持兩位小數，單位：平台默認貨幣</p>
                          )}
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isLeaderboardSubmitting}
                          onClick={() => handleLeaderboardDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isLeaderboardSubmitting}>
                          {isLeaderboardSubmitting ? '提交中…' : editingLeaderboard ? '保存修改' : '創建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}

              {isTradingPerformanceTab ? (
                <Dialog open={performanceDialogOpen} onOpenChange={handlePerformanceDialogOpenChange}>
                  <DialogContent className="sm:max-w-[420px]">
                    <form onSubmit={handlePerformanceSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>
                          {editingPerformance ? '編輯交易時長配置' : '新增交易時長配置'}
                        </DialogTitle>
                      </DialogHeader>

                      {performanceFormErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {performanceFormErrors.general}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="performance-duration">交易時長 (秒)</Label>
                        <Input
                          id="performance-duration"
                          type="number"
                          min={1}
                          max={300}
                          value={performanceFormData.tradeDuration}
                          onChange={event =>
                            setPerformanceFormData(prev => ({
                              ...prev,
                              tradeDuration: event.target.value
                            }))
                          }
                          disabled={isPerformanceSubmitting}
                        />
                        {performanceFormErrors.tradeDuration ? (
                          <p className="text-sm text-destructive">
                            {performanceFormErrors.tradeDuration}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">可設置 1~300 的整數，單位為秒</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="performance-winRate">盈利率 (%)</Label>
                        <Input
                          id="performance-winRate"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={performanceFormData.winRate}
                          onChange={event =>
                            setPerformanceFormData(prev => ({
                              ...prev,
                              winRate: event.target.value
                            }))
                          }
                          disabled={isPerformanceSubmitting}
                        />
                        {performanceFormErrors.winRate ? (
                          <p className="text-sm text-destructive">{performanceFormErrors.winRate}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">範圍 0-100，可保留兩位小數</p>
                        )}
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isPerformanceSubmitting}
                          onClick={() => handlePerformanceDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isPerformanceSubmitting}>
                          {isPerformanceSubmitting ? '提交中…' : editingPerformance ? '保存修改' : '創建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

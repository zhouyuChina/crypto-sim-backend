import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

import { supportService } from '@/services/support';
import type {
  SupportConversation,
  SupportMessage,
  SupportConversationStatus
} from '@/types/support';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const CustomerServicePage = () => {
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: listLoading } = useQuery({
    queryKey: ['support', 'conversations'],
    queryFn: () => supportService.listConversations(),
    staleTime: 30_000
  });

  const [search, setSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Record<string, SupportMessage[]>>({});
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const STATUS_META: Record<
    SupportConversationStatus,
    { label: string; badge: 'destructive' | 'info' | 'success' }
  > = {
    PENDING: {
      label: '待處理',
      badge: 'destructive'
    },
    IN_PROGRESS: {
      label: '處理中',
      badge: 'info'
    },
    RESOLVED: {
      label: '處理完畢',
      badge: 'success'
    }
  };

  useEffect(() => {
    if (selectedConversationId) return;
    if (conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const filteredConversations = useMemo<SupportConversation[]>(() => {
    if (!search.trim()) return conversations;
    const keyword = search.trim().toLowerCase();
    return conversations.filter(conversation =>
      conversation.userName.toLowerCase().includes(keyword) ||
      conversation.userId.toLowerCase().includes(keyword)
    );
  }, [conversations, search]);

  const {
    data: conversationDetail,
    isLoading: detailLoading,
    isRefetching: detailRefetching
  } = useQuery({
    queryKey: ['support', 'conversation', selectedConversationId],
    queryFn: () => supportService.getConversation(null, selectedConversationId ?? ''),
    enabled: Boolean(selectedConversationId),
    refetchInterval: 15_000
  });

  useEffect(() => {
    if (!selectedConversationId) return;
    supportService
      .markConversationRead(null, selectedConversationId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
      })
      .catch(() => {
        // ignore errors for marking read
      });
  }, [queryClient, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !conversationDetail) {
      return;
    }
    setLocalMessages(prev => {
      const remote = conversationDetail.messages ?? [];
      const existing = prev[selectedConversationId] ?? [];
      const mergedMap = new Map<string, SupportMessage>();
      [...remote, ...existing].forEach(message => {
        mergedMap.set(message.id, message);
      });
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return {
        ...prev,
        [selectedConversationId]: merged
      };
    });
  }, [conversationDetail, selectedConversationId]);

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId) {
        throw new Error('未選擇對話');
      }
      const trimmed = replyContent.trim();
      if (!trimmed) {
        throw new Error('回覆內容不可為空');
      }
      const optimisticMessage: SupportMessage = {
        id: `local-${Date.now()}`,
        sender: 'ADMIN',
        content: trimmed,
        createdAt: new Date().toISOString(),
        read: true
      };
      setLocalMessages(prev => {
        const existing = prev[selectedConversationId] ?? [];
        const nextMessages = [...existing, optimisticMessage];
        return {
          ...prev,
          [selectedConversationId]: nextMessages
        };
      });
      queryClient.setQueryData<SupportConversation | undefined>(
        ['support', 'conversation', selectedConversationId],
        previous =>
          previous
            ? {
                ...previous,
                lastMessageAt: optimisticMessage.createdAt,
                messages: [...previous.messages, optimisticMessage]
              }
            : previous
      );
      queryClient.setQueryData<SupportConversation[] | undefined>(
        ['support', 'conversations'],
        previous =>
          previous
            ? previous.map(conversation =>
                conversation.id === selectedConversationId
                  ? {
                      ...conversation,
                      lastMessageAt: optimisticMessage.createdAt,
                      unreadCount: 0,
                      messages: [...conversation.messages, optimisticMessage]
                    }
                  : conversation
              )
            : previous
      );
      const response = await supportService.replyConversation(null, selectedConversationId, {
        content: trimmed
      });
      return { optimisticMessage, response };
    },
    onSuccess: ({ optimisticMessage, response }) => {
      setReplyContent('');
      setSubmitError(null);
      if (!selectedConversationId) {
        return;
      }
      setLocalMessages(prev => {
        const existing = prev[selectedConversationId] ?? [];
        const replaced = existing.map(message =>
          message.id === optimisticMessage.id ? response : message
        );
        return {
          ...prev,
          [selectedConversationId]: replaced
        };
      });
      queryClient.setQueryData<SupportConversation | undefined>(
        ['support', 'conversation', selectedConversationId],
        previous =>
          previous
            ? {
                ...previous,
                lastMessageAt: response.createdAt,
                messages: previous.messages.map(message =>
                  message.id === optimisticMessage.id ? response : message
                )
              }
            : previous
      );
      queryClient.setQueryData<SupportConversation[] | undefined>(
        ['support', 'conversations'],
        previous =>
          previous
            ? previous.map(conversation =>
                conversation.id === selectedConversationId
                  ? {
                      ...conversation,
                      lastMessageAt: response.createdAt,
                      messages: conversation.messages.map(message =>
                        message.id === optimisticMessage.id ? response : message
                      )
                    }
                  : conversation
              )
            : previous
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '訊息送出失敗，請稍後再試';
      setSubmitError(message);
      if (selectedConversationId) {
        setLocalMessages(prev => {
          const existing = prev[selectedConversationId] ?? [];
          const filtered = existing.filter(msg => !msg.id.startsWith('local-'));
          return {
            ...prev,
            [selectedConversationId]: filtered
          };
        });
        queryClient.invalidateQueries({ queryKey: ['support', 'conversation', selectedConversationId] });
        queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
      }
    },
    onSettled: () => {
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ['support', 'conversation', selectedConversationId] });
        queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
      }
    }
  });

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: SupportConversationStatus) => {
      if (!selectedConversationId) {
        throw new Error('未選擇對話');
      }
      return supportService.updateConversationStatus(null, selectedConversationId, {
        status: nextStatus
      });
    },
    onMutate: async nextStatus => {
      if (!selectedConversationId) {
        return;
      }
      const queryKey = ['support', 'conversation', selectedConversationId] as const;
      const listKey = ['support', 'conversations'] as const;

      const previousConversation = queryClient.getQueryData<SupportConversation | undefined>(queryKey);
      const previousList = queryClient.getQueryData<SupportConversation[] | undefined>(listKey);

      queryClient.setQueryData<SupportConversation | undefined>(queryKey, previous =>
        previous ? { ...previous, status: nextStatus } : previous
      );
      queryClient.setQueryData<SupportConversation[] | undefined>(listKey, previous =>
        previous
          ? previous.map(conversation =>
              conversation.id === selectedConversationId
                ? { ...conversation, status: nextStatus }
                : conversation
            )
          : previous
      );

      return { previousConversation, previousList };
    },
    onError: (_error, _status, context) => {
      if (!context || !selectedConversationId) {
        return;
      }
      const queryKey = ['support', 'conversation', selectedConversationId] as const;
      const listKey = ['support', 'conversations'] as const;

      if (context.previousConversation) {
        queryClient.setQueryData(queryKey, context.previousConversation);
      }
      if (context.previousList) {
        queryClient.setQueryData(listKey, context.previousList);
      }
    },
    onSuccess: updated => {
      if (!selectedConversationId) return;
      const queryKey = ['support', 'conversation', selectedConversationId] as const;
      queryClient.setQueryData<SupportConversation | undefined>(queryKey, previous =>
        previous ? { ...previous, status: updated.status } : previous
      );
    },
    onSettled: () => {
      if (!selectedConversationId) return;
      queryClient.invalidateQueries({ queryKey: ['support', 'conversation', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
    }
  });

  const clearMutation = useMutation({
    mutationFn: () => supportService.clearConversations(),
    onSuccess: () => {
      setLocalMessages({});
      setSelectedConversationId(null);
      setReplyContent('');
      queryClient.removeQueries({ queryKey: ['support', 'conversation'] });
      queryClient.invalidateQueries({ queryKey: ['support', 'conversations'] });
    },
    onSettled: () => {
      setIsClearDialogOpen(false);
    }
  });

  const baseConversation = useMemo(() => {
    if (conversationDetail) {
      return conversationDetail;
    }
    if (!selectedConversationId) {
      return null;
    }
    return filteredConversations.find(item => item.id === selectedConversationId) ?? null;
  }, [conversationDetail, filteredConversations, selectedConversationId]);

  const displayedMessages = useMemo(() => {
    if (!selectedConversationId) {
      return [];
    }
    const remoteMessages = baseConversation?.messages ?? [];
    const local = localMessages[selectedConversationId] ?? [];
    const mergedMap = new Map<string, SupportMessage>();
    [...remoteMessages, ...local].forEach(message => {
      mergedMap.set(message.id, message);
    });
    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return merged;
  }, [baseConversation, localMessages, selectedConversationId]);

  const currentConversation = baseConversation
    ? {
        ...baseConversation,
        messages: displayedMessages
      }
    : null;
  const currentStatus: SupportConversationStatus = currentConversation?.status ?? 'PENDING';
  const currentStatusMeta = STATUS_META[currentStatus];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversationId) return;
    const trimmed = replyContent.trim();
    if (!trimmed) {
      setSubmitError('回覆內容不可為空');
      return;
    }
    replyMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">客服管理</h1>
        <p className="text-muted-foreground">
          查看用戶反饋並即時回應訊息，維持良好客戶體驗。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px,1fr] lg:grid-cols-[360px,1fr]">
        <Card className="h-full min-h-[560px] overflow-hidden">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              用戶對話
            </CardTitle>
            <CardDescription>選擇要查看的用戶訊息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="搜尋用戶名稱或 ID..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {listLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  讀取中...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  尚無符合條件的對話
                </div>
              ) : (
                filteredConversations.map(conversation => {
                  const isActive = conversation.id === selectedConversationId;
                  const lastMessage =
                    conversation.messages?.[conversation.messages.length - 1]?.content ?? '（無訊息）';
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                        isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{conversation.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={STATUS_META[conversation.status ?? 'PENDING'].badge}>
                          {STATUS_META[conversation.status ?? 'PENDING'].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {lastMessage}
                        </span>
                      </div>
                      {conversation.unreadCount ? (
                        <span className="mt-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                          未讀 {conversation.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full min-h-[560px] flex-col overflow-hidden">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>
                {currentConversation ? currentConversation.userName : '尚未選擇對話'}
              </CardTitle>
              <CardDescription>
                {currentConversation
                  ? `用戶 ID：${currentConversation.userId}`
                  : '請從左側列表選擇一位用戶'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    disabled={clearMutation.isPending || conversations.length === 0}
                  >
                    清除所有對話
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>確定要清除所有對話紀錄？</DialogTitle>
                    <DialogDescription>
                      此操作將刪除所有客服對話的訊息記錄，執行後無法復原。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <DialogClose asChild>
                      <Button variant="outline" disabled={clearMutation.isPending}>
                        取消
                      </Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={() => clearMutation.mutate()}
                      disabled={clearMutation.isPending}
                    >
                      {clearMutation.isPending ? '刪除中...' : '確認刪除'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {currentConversation ? (
                <div className="flex items-center gap-2">
                  <Badge variant={currentStatusMeta.badge}>{currentStatusMeta.label}</Badge>
                  <Select
                    value={currentStatus}
                    onValueChange={value => {
                      if (!currentConversation || value === currentStatus) return;
                      statusMutation.mutate(value as SupportConversationStatus);
                    }}
                    disabled={statusMutation.isPending}
                  >
                    <SelectTrigger className="h-9 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_META).map(([value, meta]) => (
                        <SelectItem value={value} key={value}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {detailRefetching ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  更新中...
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3 overflow-hidden">
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-md border p-4">
              {detailLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  正在載入訊息...
                </div>
              ) : currentConversation && currentConversation.messages?.length ? (
                currentConversation.messages.map(message => {
                  const isAdmin = message.sender === 'ADMIN';
                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                          isAdmin
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.content}
                      </div>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {isAdmin ? '管理員' : '用戶'} · {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  尚未有訊息記錄
                </div>
              )}
            </div>

            <form
              className="space-y-3 rounded-md border border-muted bg-card/95 p-3"
              onSubmit={handleSubmit}
            >
              <Label htmlFor="reply-content">回覆訊息</Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
                <Input
                  id="reply-content"
                  className="flex-1 h-11"
                  placeholder="請輸入要回覆用戶的內容..."
                  value={replyContent}
                  onChange={event => {
                    setReplyContent(event.target.value);
                    setSubmitError(null);
                  }}
                  disabled={!currentConversation || replyMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={!currentConversation || replyMutation.isPending}
                  className="inline-flex h-11 shrink-0 items-center gap-2 px-4"
                >
                  {replyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      送出中...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      發送回覆
                    </>
                  )}
                </Button>
              </div>
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


'use client';

import { useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  onSelect: (conversationId: string) => void;
  selectedId?: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateMessage(text: string, maxLength = 45): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function ConversationSkeleton() {
  return (
    <div className="animate-pulse px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-48 rounded bg-gray-200" />
        </div>
        <div className="h-3 w-10 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export function ConversationList({ onSelect, selectedId }: ConversationListProps) {
  const conversations = useChat((s) => s.conversations);
  const unreadCounts = useChat((s) => s.unreadCounts);
  const isLoadingConversations = useChat((s) => s.isLoadingConversations);
  const fetchConversations = useChat((s) => s.fetchConversations);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (isLoadingConversations && conversations.length === 0) {
    return (
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-sm text-gray-500">No conversations yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Start a conversation by booking a consultation.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 overflow-y-auto">
      {conversations.map((conversation) => {
        const unread = unreadCounts[conversation.id] || 0;
        const otherParty = conversation.otherParty;
        const displayName = otherParty
          ? `${otherParty.firstName} ${otherParty.lastName}`
          : 'Unknown';

        const lastMessagePreview = conversation.lastMessage
          ? conversation.lastMessage.type === 'IMAGE'
            ? 'Sent an image'
            : conversation.lastMessage.type === 'FILE'
              ? 'Sent a file'
              : conversation.lastMessage.content
          : 'No messages yet';

        const lastMessageTime = conversation.lastMessage?.createdAt || conversation.createdAt;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
              selectedId === conversation.id && 'bg-blue-50 hover:bg-blue-50'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
                selectedId === conversation.id ? 'bg-blue-600' : 'bg-gray-400'
              )}
            >
              {otherParty
                ? `${otherParty.firstName[0]}${otherParty.lastName[0]}`.toUpperCase()
                : '?'}
            </div>

            {/* Conversation info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    'truncate text-sm',
                    unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  )}
                >
                  {displayName}
                </p>
                <span className="ml-2 shrink-0 text-xs text-gray-400">
                  {formatRelativeTime(lastMessageTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    'truncate text-xs',
                    unread > 0 ? 'font-medium text-gray-700' : 'text-gray-500'
                  )}
                >
                  {truncateMessage(lastMessagePreview)}
                </p>
                {unread > 0 && (
                  <Badge
                    variant="info"
                    size="sm"
                    className="ml-2 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                  >
                    {unread > 99 ? '99+' : unread}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

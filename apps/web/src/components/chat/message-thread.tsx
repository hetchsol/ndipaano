'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChat } from '@/hooks/use-chat';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { Loader2 } from 'lucide-react';

interface MessageThreadProps {
  conversationId: string;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) return 'Today';
  if (messageDate.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isSameDay(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const user = useAuth((s) => s.user);
  const messages = useChat((s) => s.messagesByConversation[conversationId] || []);
  const typingUser = useChat((s) => s.typingUsers[conversationId]);
  const isLoadingMessages = useChat((s) => s.isLoadingMessages);
  const fetchMessages = useChat((s) => s.fetchMessages);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const initialLoadDoneRef = useRef(false);

  // Initial fetch
  useEffect(() => {
    initialLoadDoneRef.current = false;
    hasMoreRef.current = true;
    prevMessageCountRef.current = 0;

    fetchMessages(conversationId).then((hasMore) => {
      hasMoreRef.current = hasMore;
      initialLoadDoneRef.current = true;
    });
  }, [conversationId, fetchMessages]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;

    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;
    prevMessageCountRef.current = currentCount;

    // Scroll to bottom on initial load or when a new message arrives at the end
    if (prevCount === 0 || currentCount > prevCount) {
      // Only auto-scroll if user is near the bottom already (or it's the initial load)
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom =
          prevCount === 0 ||
          container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (isNearBottom) {
          bottomRef.current?.scrollIntoView({ behavior: prevCount === 0 ? 'auto' : 'smooth' });
        }
      }
    }
  }, [messages]);

  // Infinite scroll upward
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (!hasMoreRef.current || isLoadingMoreRef.current || isLoadingMessages) return;

    // When scrolled near the top, load older messages
    if (container.scrollTop < 80) {
      const oldestMessage = messages[0];
      if (!oldestMessage) return;

      isLoadingMoreRef.current = true;
      const prevScrollHeight = container.scrollHeight;

      fetchMessages(conversationId, oldestMessage.id).then((hasMore) => {
        hasMoreRef.current = hasMore;
        isLoadingMoreRef.current = false;

        // Preserve scroll position after prepending messages
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      });
    }
  }, [conversationId, fetchMessages, isLoadingMessages, messages]);

  // Grouped messages with date separators
  const groupedMessages = useMemo(() => {
    const groups: Array<{ type: 'separator'; label: string } | { type: 'message'; message: typeof messages[0] }> = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      // Add date separator if this is the first message or a new day
      if (i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt)) {
        groups.push({ type: 'separator', label: formatDateSeparator(msg.createdAt) });
      }

      groups.push({ type: 'message', message: msg });
    }

    return groups;
  }, [messages]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col overflow-y-auto"
    >
      {/* Loading indicator at top for older messages */}
      {isLoadingMessages && messages.length > 0 && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoadingMessages && messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
        </div>
      )}

      {/* Loading state for initial fetch */}
      {isLoadingMessages && messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1" />
      {groupedMessages.map((item, idx) => {
        if (item.type === 'separator') {
          return (
            <div key={`sep-${idx}`} className="flex items-center gap-3 px-4 py-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium text-gray-400">{item.label}</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          );
        }

        return (
          <MessageBubble
            key={item.message.id}
            message={item.message}
            isOwn={item.message.senderId === user?.id}
          />
        );
      })}

      {/* Typing indicator */}
      {typingUser && <TypingIndicator firstName={typingUser.firstName} />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}

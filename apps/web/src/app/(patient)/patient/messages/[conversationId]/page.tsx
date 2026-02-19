'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@/hooks/use-chat';
import { useSocket } from '@/hooks/use-socket';
import { useAuth } from '@/hooks/use-auth';
import { MessageThread } from '@/components/chat/message-thread';
import { MessageInput } from '@/components/chat/message-input';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PatientChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const { user } = useAuth();
  const { socket, isConnected } = useSocket('chat');
  const {
    sendMessage,
    markAsRead,
    addIncomingMessage,
    setTypingUser,
    updateMessagesRead,
    conversations,
  } = useChat();
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const otherParty = conversation?.otherParty;

  // Join conversation room
  useEffect(() => {
    if (!socket || !isConnected || !conversationId) return;
    socket.emit('joinConversation', { conversationId });
    return () => {
      socket.emit('leaveConversation', { conversationId });
    };
  }, [socket, isConnected, conversationId]);

  // Listen for real-time events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      if (message.conversationId === conversationId && message.senderId !== user?.id) {
        addIncomingMessage(message);
        // Auto mark as read since we're viewing this conversation
        markAsRead(conversationId);
        socket.emit('markRead', { conversationId });
      }
    };

    const handleTyping = (data: any) => {
      if (data.userId !== user?.id) {
        setTypingUser(conversationId, { userId: data.userId, firstName: data.firstName });
        // Clear typing after 3 seconds
        setTimeout(() => setTypingUser(conversationId, null), 3000);
      }
    };

    const handleMessagesRead = (data: any) => {
      if (data.conversationId === conversationId) {
        updateMessagesRead(conversationId, data.userId);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('userTyping', handleTyping);
    socket.on('messagesRead', handleMessagesRead);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userTyping', handleTyping);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [socket, conversationId, user?.id, addIncomingMessage, markAsRead, setTypingUser, updateMessagesRead]);

  // Mark as read on mount
  useEffect(() => {
    if (conversationId) {
      markAsRead(conversationId);
    }
  }, [conversationId, markAsRead]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!conversationId) return;
      // Send via REST (more reliable) - WebSocket broadcast will happen server-side
      await sendMessage(conversationId, content);
    },
    [conversationId, sendMessage],
  );

  const handleTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socket.emit('typing', { conversationId });
    typingTimeout.current = setTimeout(() => {}, 2000);
  }, [socket, conversationId]);

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/patient/messages')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-gray-900">
            {otherParty ? `${otherParty.firstName} ${otherParty.lastName}` : 'Chat'}
          </h2>
          <p className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Connecting...'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageThread conversationId={conversationId} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} onTyping={handleTyping} disabled={!isConnected} />
    </div>
  );
}

'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/use-chat';
import { useSocket } from '@/hooks/use-socket';
import { useAuth } from '@/hooks/use-auth';
import { ConversationList } from '@/components/chat/conversation-list';
import { MessageCircle } from 'lucide-react';

export default function PatientMessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket('chat');
  const { fetchConversations, addIncomingMessage, fetchUnreadCount } = useChat();

  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();
  }, [fetchConversations, fetchUnreadCount]);

  // Listen for new messages globally to update conversation list
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (message: any) => {
      if (message.senderId !== user?.id) {
        addIncomingMessage(message);
      }
    };
    socket.on('newMessage', handleNewMessage);
    return () => { socket.off('newMessage', handleNewMessage); };
  }, [socket, user?.id, addIncomingMessage]);

  const handleSelect = useCallback(
    (conversationId: string) => {
      router.push(`/patient/messages/${conversationId}`);
    },
    [router],
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Messages
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Chat with your healthcare practitioners
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <ConversationList onSelect={handleSelect} />
      </div>
    </div>
  );
}

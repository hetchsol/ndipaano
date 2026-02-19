'use client';

import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  content: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  readAt?: string;
  createdAt: string;
  sender?: ChatUser;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  // System messages are rendered centered
  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center px-4 py-2">
        <span className="text-xs italic text-gray-400">{message.content}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full px-4 py-1',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'relative max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
          isOwn
            ? 'rounded-br-md bg-blue-600 text-white'
            : 'rounded-bl-md bg-gray-100 text-gray-900'
        )}
      >
        {/* Sender name for non-own messages */}
        {!isOwn && message.sender && (
          <p className="mb-0.5 text-xs font-semibold text-gray-500">
            {message.sender.firstName}
          </p>
        )}

        {/* Message content by type */}
        {message.type === 'IMAGE' && (
          <div className="mb-1">
            <a href={message.content} target="_blank" rel="noopener noreferrer">
              <img
                src={message.content}
                alt={message.fileName || 'Image'}
                className="max-h-60 max-w-full rounded-lg object-cover"
                loading="lazy"
              />
            </a>
            {message.fileName && (
              <p className={cn('mt-1 text-xs', isOwn ? 'text-blue-100' : 'text-gray-500')}>
                {message.fileName}
              </p>
            )}
          </div>
        )}

        {message.type === 'FILE' && (
          <a
            href={message.content}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              isOwn
                ? 'bg-blue-500/30 hover:bg-blue-500/40'
                : 'bg-gray-200 hover:bg-gray-300'
            )}
          >
            <FileText className={cn('h-8 w-8 shrink-0', isOwn ? 'text-blue-100' : 'text-gray-500')} />
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-sm font-medium', isOwn ? 'text-white' : 'text-gray-900')}>
                {message.fileName || 'File'}
              </p>
              {message.fileSize && (
                <p className={cn('text-xs', isOwn ? 'text-blue-200' : 'text-gray-500')}>
                  {formatFileSize(message.fileSize)}
                </p>
              )}
            </div>
            <Download className={cn('h-5 w-5 shrink-0', isOwn ? 'text-blue-100' : 'text-gray-500')} />
          </a>
        )}

        {message.type === 'TEXT' && (
          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        )}

        {/* Timestamp and read receipt */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'text-[10px] leading-none',
              isOwn ? 'text-blue-200' : 'text-gray-400'
            )}
          >
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            message.readAt ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-200" />
            ) : (
              <Check className="h-3.5 w-3.5 text-blue-200" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

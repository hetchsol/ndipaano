'use client';

export function TypingIndicator({ firstName }: { firstName: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
      <span>{firstName} is typing</span>
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}

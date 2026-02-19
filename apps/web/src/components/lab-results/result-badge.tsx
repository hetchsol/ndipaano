'use client';

import React from 'react';

interface ResultBadgeProps {
  interpretation: 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | string;
}

export function ResultBadge({ interpretation }: ResultBadgeProps) {
  const colors: Record<string, string> = {
    NORMAL: 'bg-green-100 text-green-800',
    ABNORMAL: 'bg-yellow-100 text-yellow-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[interpretation] || 'bg-gray-100 text-gray-800'}`}>
      {interpretation}
    </span>
  );
}

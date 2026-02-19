'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { schedulingAPI } from '@/lib/api';

interface CalendarViewProps {
  practitionerId: string;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
}

interface DayData {
  date: string;
  availableSlots: number;
  isBlackout: boolean;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthDays(year: number, month: number) {
  // month is 1-indexed (1 = January)
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  // getDay() returns 0 for Sunday, we want Monday = 0
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  return { daysInMonth, startDayOfWeek };
}

function formatYYYYMMDD(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-ZM', { month: 'long', year: 'numeric' });
}

export function CalendarView({ practitionerId, onDateSelect, selectedDate }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [calendarData, setCalendarData] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayStr = formatYYYYMMDD(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await schedulingAPI.getCalendarView(practitionerId, year, month);
      const data = response.data?.data || response.data || [];
      const days: DayData[] = Array.isArray(data) ? data : [];

      const map = new Map<string, DayData>();
      for (const day of days) {
        map.set(day.date, day);
      }
      setCalendarData(map);
    } catch (err) {
      setError('Failed to load calendar data.');
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [practitionerId, year, month]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dateStr: string, dayData?: DayData) => {
    // Only allow selecting days with available slots, not in the past, and not blacked out
    if (dateStr < todayStr) return;
    if (dayData?.isBlackout) return;
    if (dayData && dayData.availableSlots > 0) {
      onDateSelect(dateStr);
    }
  };

  const { daysInMonth, startDayOfWeek } = getMonthDays(year, month);

  // Check if we can go to the previous month (don't go before the current month)
  const canGoPrevious =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth() + 1);

  // Build calendar cells
  const cells: Array<{ day: number | null; dateStr: string }> = [];

  // Empty cells before the first day
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, dateStr: '' });
  }

  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: formatYYYYMMDD(year, month, d) });
  }

  // Fill remaining cells to complete the last row
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ day: null, dateStr: '' });
    }
  }

  return (
    <div className="w-full">
      {/* Navigation header */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold text-gray-900">
          {getMonthLabel(year, month)}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-xs font-medium text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (cell.day === null) {
              return <div key={`empty-${index}`} className="h-12" />;
            }

            const dayData = calendarData.get(cell.dateStr);
            const isPast = cell.dateStr < todayStr;
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDate;
            const isBlackout = dayData?.isBlackout === true;
            const hasSlots = (dayData?.availableSlots ?? 0) > 0;
            const isClickable = !isPast && !isBlackout && hasSlots;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleDayClick(cell.dateStr, dayData)}
                disabled={!isClickable}
                className={cn(
                  'relative flex h-12 flex-col items-center justify-center rounded-md text-sm transition-colors',
                  // Base
                  'focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-1',
                  // Past days
                  isPast && 'cursor-default text-gray-300',
                  // Blackout days
                  isBlackout &&
                    !isPast &&
                    'cursor-default bg-gray-100 text-gray-400 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]',
                  // Available days
                  hasSlots &&
                    !isPast &&
                    !isBlackout &&
                    !isSelected &&
                    'cursor-pointer bg-green-50 text-green-800 hover:bg-green-100',
                  // No slots, not past, not blackout
                  !hasSlots &&
                    !isPast &&
                    !isBlackout &&
                    'cursor-default text-gray-500',
                  // Selected day
                  isSelected &&
                    'ring-2 ring-primary-700 bg-primary-50 text-primary-900 font-semibold',
                  // Today indicator
                  isToday && !isSelected && 'font-bold'
                )}
              >
                <span>{cell.day}</span>
                {hasSlots && !isPast && !isBlackout && (
                  <Badge
                    variant="success"
                    size="sm"
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center p-0 text-[10px]"
                  >
                    {dayData!.availableSlots}
                  </Badge>
                )}
                {isToday && (
                  <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary-700" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { schedulingAPI } from '@/lib/api';

interface Slot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface SlotPickerProps {
  practitionerId: string;
  date: string; // YYYY-MM-DD
  onSlotSelect: (slot: { startTime: string; endTime: string }) => void;
  selectedSlot?: { startTime: string; endTime: string };
}

function formatTime(time: string): string {
  // Accepts HH:mm or HH:mm:ss, returns HH:mm
  return time.slice(0, 5);
}

export function SlotPicker({
  practitionerId,
  date,
  onSlotSelect,
  selectedSlot,
}: SlotPickerProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await schedulingAPI.getAvailableSlots(
        practitionerId,
        date,
        date
      );
      const data = response.data?.data || response.data || [];
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load available time slots.');
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  }, [practitionerId, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const isSlotSelected = (slot: Slot) => {
    if (!selectedSlot) return false;
    return (
      slot.startTime === selectedSlot.startTime &&
      slot.endTime === selectedSlot.endTime
    );
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-ZM', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading available slots...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.isAvailable);
  const unavailableSlots = slots.filter((s) => !s.isAvailable);

  if (slots.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">
          No available slots
        </p>
        <p className="text-xs text-gray-400">
          There are no time slots available for {formatDateLabel(date)}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <p className="text-sm font-medium text-gray-700">
          {formatDateLabel(date)}
        </p>
      </div>

      {availableSlots.length === 0 && (
        <div className="mb-4 rounded-md bg-yellow-50 p-3 text-center text-sm text-yellow-700">
          All slots for this day have been booked.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((slot) => {
          const selected = isSlotSelected(slot);
          const available = slot.isAvailable;

          return (
            <button
              key={`${slot.startTime}-${slot.endTime}`}
              type="button"
              onClick={() => {
                if (available) {
                  onSlotSelect({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                  });
                }
              }}
              disabled={!available}
              className={cn(
                'rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-1',
                // Available, not selected
                available &&
                  !selected &&
                  'cursor-pointer border-gray-300 bg-white text-gray-700 hover:border-primary-700 hover:bg-primary-50 hover:text-primary-700',
                // Selected
                selected &&
                  'border-primary-700 bg-primary-700 text-white shadow-sm',
                // Unavailable
                !available &&
                  'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 line-through'
              )}
            >
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </button>
          );
        })}
      </div>

      {availableSlots.length > 0 && unavailableSlots.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          {availableSlots.length} of {slots.length} slots available.
          Crossed-out slots have already been booked.
        </p>
      )}
    </div>
  );
}

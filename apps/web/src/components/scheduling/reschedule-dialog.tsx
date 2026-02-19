'use client';

import React, { useState } from 'react';
import { ChevronLeft, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { CalendarView } from '@/components/scheduling/calendar-view';
import { SlotPicker } from '@/components/scheduling/slot-picker';
import { schedulingAPI } from '@/lib/api';

interface RescheduleDialogProps {
  bookingId: string;
  practitionerId: string;
  open: boolean;
  onClose: () => void;
  onRescheduled: () => void;
}

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Select a New Date',
  2: 'Select a Time Slot',
  3: 'Confirm Reschedule',
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  1: 'Choose a new date for your appointment.',
  2: 'Pick an available time slot for the selected date.',
  3: 'Optionally provide a reason and confirm the reschedule.',
};

export function RescheduleDialog({
  bookingId,
  practitionerId,
  open,
  onClose,
  onRescheduled,
}: RescheduleDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetState = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedSlot(null);
    setReason('');
    setSubmitting(false);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleSlotSelect = (slot: { startTime: string; endTime: string }) => {
    setSelectedSlot(slot);
  };

  const handleBack = () => {
    setError(null);
    if (step === 2) {
      setSelectedSlot(null);
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleNextFromSlot = () => {
    if (selectedSlot) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) return;

    try {
      setSubmitting(true);
      setError(null);

      // Combine date and time into ISO datetime
      const scheduledAt = `${selectedDate}T${selectedSlot.startTime}`;

      await schedulingAPI.rescheduleBooking(bookingId, {
        scheduledAt,
        reason: reason.trim() || undefined,
      });

      setSuccess(true);

      // Brief delay to show success state, then close
      setTimeout(() => {
        onRescheduled();
        handleClose();
      }, 1500);
    } catch (err) {
      setError('Failed to reschedule the appointment. Please try again.');
      console.error('Failed to reschedule:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatSelectedDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-ZM', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => time.slice(0, 5);

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-xl">
      <DialogClose onClose={handleClose} />
      <DialogHeader>
        <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
        <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
      </DialogHeader>

      {/* Step indicators */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              s === step
                ? 'bg-primary-700 text-white'
                : s < step
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            {s < step ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              s
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success ? (
        <div className="flex flex-col items-center py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <p className="mt-3 text-sm font-medium text-green-800">
            Appointment rescheduled successfully!
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {formatSelectedDate(selectedDate)} at{' '}
            {selectedSlot && formatTime(selectedSlot.startTime)} -{' '}
            {selectedSlot && formatTime(selectedSlot.endTime)}
          </p>
        </div>
      ) : (
        <>
          {/* Step 1: Calendar */}
          {step === 1 && (
            <div className="py-2">
              <CalendarView
                practitionerId={practitionerId}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate || undefined}
              />
            </div>
          )}

          {/* Step 2: Slot Picker */}
          {step === 2 && selectedDate && (
            <div className="py-2">
              <SlotPicker
                practitionerId={practitionerId}
                date={selectedDate}
                onSlotSelect={handleSlotSelect}
                selectedSlot={selectedSlot || undefined}
              />
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && selectedDate && selectedSlot && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-900">
                  New Appointment Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatSelectedDate(selectedDate)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {formatTime(selectedSlot.startTime)} -{' '}
                    {formatTime(selectedSlot.endTime)}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label
                  htmlFor="reschedule-reason"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Reason for rescheduling (optional)
                </label>
                <textarea
                  id="reschedule-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Schedule conflict, personal reasons..."
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <DialogFooter>
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            {step === 2 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNextFromSlot}
                disabled={!selectedSlot}
              >
                Next
              </Button>
            )}
            {step === 3 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={submitting}
              >
                Confirm Reschedule
              </Button>
            )}
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}

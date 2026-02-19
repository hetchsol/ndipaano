'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { schedulingAPI } from '@/lib/api';

interface Blackout {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export function BlackoutDateManager() {
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formReason, setFormReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadBlackouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await schedulingAPI.getBlackouts();
      const data = response.data?.data || response.data || [];
      setBlackouts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load blackout dates. Please try again.');
      console.error('Failed to load blackouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlackouts();
  }, [loadBlackouts]);

  const resetForm = () => {
    setFormDate('');
    setFormStartTime('');
    setFormEndTime('');
    setFormReason('');
  };

  const handleAdd = async () => {
    if (!formDate) {
      setError('Please select a date.');
      return;
    }

    if (formStartTime && formEndTime && formStartTime >= formEndTime) {
      setError('End time must be after start time.');
      return;
    }

    try {
      setAdding(true);
      setError(null);

      const data: { date: string; startTime?: string; endTime?: string; reason?: string } = {
        date: formDate,
      };

      if (formStartTime) data.startTime = formStartTime;
      if (formEndTime) data.endTime = formEndTime;
      if (formReason.trim()) data.reason = formReason.trim();

      await schedulingAPI.createBlackout(data);

      resetForm();
      setShowForm(false);
      setSuccessMessage('Blackout date added successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadBlackouts();
    } catch (err) {
      setError('Failed to add blackout date. Please try again.');
      console.error('Failed to create blackout:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);

      await schedulingAPI.deleteBlackout(id);

      setConfirmDeleteId(null);
      setSuccessMessage('Blackout date removed successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadBlackouts();
    } catch (err) {
      setError('Failed to remove blackout date. Please try again.');
      console.error('Failed to delete blackout:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-ZM', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTimeRange = (startTime?: string | null, endTime?: string | null) => {
    if (!startTime && !endTime) return 'Full day';
    if (startTime && endTime) return `${startTime} - ${endTime}`;
    if (startTime) return `From ${startTime}`;
    return `Until ${endTime}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading blackout dates...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Blackout Dates
            </CardTitle>
            <CardDescription>
              Block off dates or times when you are unavailable for appointments.
            </CardDescription>
          </div>
          {!showForm && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Blackout
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {/* Add blackout form */}
        {showForm && (
          <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Add Blackout Date</h4>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                label="Date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="time"
                  label="Start Time (optional)"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
                <Input
                  type="time"
                  label="End Time (optional)"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3">
              <label
                htmlFor="blackout-reason"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Reason (optional)
              </label>
              <textarea
                id="blackout-reason"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="e.g., Conference, Personal leave, Holiday..."
                rows={2}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
              />
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdd}
                isLoading={adding}
                disabled={adding || !formDate}
              >
                Add Blackout
              </Button>
            </div>
          </div>
        )}

        {/* Blackout list */}
        {blackouts.length === 0 && !showForm && (
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No blackout dates set.</p>
            <p className="text-xs text-gray-400">
              Add blackout dates to block off times when you are unavailable.
            </p>
          </div>
        )}

        {blackouts.length > 0 && (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {blackouts.map((blackout) => (
              <div
                key={blackout.id}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDisplayDate(blackout.date)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          !blackout.startTime && !blackout.endTime
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {formatTimeRange(blackout.startTime, blackout.endTime)}
                      </Badge>
                      {blackout.reason && (
                        <span className="text-xs text-gray-500">
                          {blackout.reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {confirmDeleteId === blackout.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(blackout.id)}
                        isLoading={deletingId === blackout.id}
                        disabled={deletingId === blackout.id}
                      >
                        Yes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(blackout.id)}
                      className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

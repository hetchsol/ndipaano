'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { medicationRemindersAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Pill,
  Clock,
  Bell,
  AlertTriangle,
  Pause,
  Play,
  XCircle,
} from 'lucide-react';

interface ReminderDetail {
  id: string;
  frequency: string;
  timesOfDay: string[];
  startDate: string;
  endDate: string | null;
  status: string;
  notifyVia: string[];
  missedWindowMinutes: number;
  totalQuantity: number | null;
  prescription: {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string | null;
    quantity: number | null;
    practitioner: { id: string; firstName: string; lastName: string };
  };
  adherenceLogs: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    respondedAt: string | null;
    reason: string | null;
  }>;
}

interface RefillStatus {
  medicationName: string;
  dosage: string;
  totalQuantity: number;
  dosesTaken: number;
  remaining: number;
  dosesPerDay: number;
  estimatedDaysRemaining: number;
  needsRefillSoon: boolean;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const logStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  TAKEN: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-orange-100 text-orange-800',
  MISSED: 'bg-red-100 text-red-800',
};

export default function ReminderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [reminder, setReminder] = useState<ReminderDetail | null>(null);
  const [refill, setRefill] = useState<RefillStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTimes, setEditTimes] = useState<string[]>([]);
  const [editMissedWindow, setEditMissedWindow] = useState(120);

  const fetchData = useCallback(async () => {
    try {
      const [reminderRes, refillRes] = await Promise.all([
        medicationRemindersAPI.getById(id),
        medicationRemindersAPI.getRefillStatus(id).catch(() => null),
      ]);
      const r = reminderRes.data.data || reminderRes.data;
      setReminder(r);
      setEditTimes(r.timesOfDay);
      setEditMissedWindow(r.missedWindowMinutes);
      if (refillRes) {
        setRefill(refillRes.data.data || refillRes.data);
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePause = async () => {
    try {
      await medicationRemindersAPI.pause(id);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleResume = async () => {
    try {
      await medicationRemindersAPI.resume(id);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this reminder?')) return;
    try {
      await medicationRemindersAPI.cancel(id);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleSaveSettings = async () => {
    try {
      await medicationRemindersAPI.update(id, {
        timesOfDay: editTimes,
        missedWindowMinutes: editMissedWindow,
      });
      setIsEditing(false);
      fetchData();
    } catch { /* ignore */ }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500">Reminder not found.</p>
      </div>
    );
  }

  const refillPercent = refill && refill.totalQuantity > 0
    ? Math.round((refill.dosesTaken / refill.totalQuantity) * 100)
    : 0;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.push('/patient/reminders')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reminders
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {reminder.prescription.medicationName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {reminder.prescription.dosage} &mdash; {reminder.prescription.frequency}
          </p>
        </div>
        <Badge className={statusColors[reminder.status] || 'bg-gray-100 text-gray-800'}>
          {reminder.status}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Medication info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Medication Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Medication</span>
                <p className="font-medium">{reminder.prescription.medicationName}</p>
              </div>
              <div>
                <span className="text-gray-500">Dosage</span>
                <p className="font-medium">{reminder.prescription.dosage}</p>
              </div>
              <div>
                <span className="text-gray-500">Frequency</span>
                <p className="font-medium">{reminder.frequency.replace(/_/g, ' ').toLowerCase()}</p>
              </div>
              <div>
                <span className="text-gray-500">Prescriber</span>
                <p className="font-medium">
                  {reminder.prescription.practitioner.firstName}{' '}
                  {reminder.prescription.practitioner.lastName}
                </p>
              </div>
              {reminder.prescription.duration && (
                <div>
                  <span className="text-gray-500">Duration</span>
                  <p className="font-medium">{reminder.prescription.duration}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminder settings */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Reminder Settings</h3>
              {!isEditing && reminder.status === 'ACTIVE' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Times of Day</label>
                  {editTimes.map((t, i) => (
                    <input
                      key={i}
                      type="time"
                      value={t}
                      onChange={(e) => {
                        const newTimes = [...editTimes];
                        newTimes[i] = e.target.value;
                        setEditTimes(newTimes);
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  ))}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Missed Window (minutes)</label>
                  <input
                    type="number"
                    value={editMissedWindow}
                    onChange={(e) => setEditMissedWindow(parseInt(e.target.value) || 120)}
                    min={15}
                    max={480}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSettings}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Times</span>
                    <p className="font-medium">{reminder.timesOfDay.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Bell className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Notify via</span>
                    <p className="font-medium">
                      {reminder.notifyVia.map((c) => c.replace(/_/g, ' ')).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Missed Window</span>
                    <p className="font-medium">{reminder.missedWindowMinutes} min</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refill status */}
        {refill && refill.totalQuantity > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Refill Status</h3>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {refill.dosesTaken} of {refill.totalQuantity} doses taken
                </span>
                <span className="font-medium">{refillPercent}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className={`h-3 rounded-full transition-all ${
                    refill.needsRefillSoon ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${refillPercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{refill.remaining} doses remaining</span>
                <span>~{refill.estimatedDaysRemaining} days left</span>
              </div>
              {refill.needsRefillSoon && (
                <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Running low - consider ordering a refill</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent adherence logs */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Recent Adherence Log</h3>
            {reminder.adherenceLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No adherence data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reminder.adherenceLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2">
                          {new Date(log.scheduledAt).toLocaleDateString('en-ZM', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2">
                          {new Date(log.scheduledAt).toLocaleTimeString('en-ZM', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2">
                          <Badge
                            className={
                              logStatusColors[log.status] || 'bg-gray-100 text-gray-800'
                            }
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-gray-500">{log.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        {(reminder.status === 'ACTIVE' || reminder.status === 'PAUSED') && (
          <div className="flex gap-3">
            {reminder.status === 'ACTIVE' && (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200"
              >
                <Pause className="h-4 w-4" />
                Pause Reminder
              </button>
            )}
            {reminder.status === 'PAUSED' && (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-200"
              >
                <Play className="h-4 w-4" />
                Resume Reminder
              </button>
            )}
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              <XCircle className="h-4 w-4" />
              Cancel Reminder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

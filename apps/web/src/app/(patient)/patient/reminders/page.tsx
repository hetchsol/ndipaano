'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { medicationRemindersAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlarmClock,
  Plus,
  Pill,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface Reminder {
  id: string;
  frequency: string;
  timesOfDay: string[];
  startDate: string;
  endDate: string | null;
  status: string;
  prescription: {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    practitioner?: { firstName: string; lastName: string };
  };
}

interface TodayLog {
  id: string;
  scheduledAt: string;
  status: string;
  respondedAt: string | null;
  reason: string | null;
  reminder: {
    id: string;
    prescription: {
      id: string;
      medicationName: string;
      dosage: string;
      frequency: string;
    };
  };
}

interface AdherenceSummary {
  overallCompliance: number;
  currentStreak: number;
  longestStreak: number;
  totalDoses: number;
  dosesTaken: number;
  dosesMissed: number;
  dosesSkipped: number;
  perMedication: Array<{
    medicationName: string;
    dosage: string;
    total: number;
    taken: number;
    compliance: number;
  }>;
  weeklyTrend: Array<{
    date: string;
    taken: number;
    total: number;
    compliance: number;
  }>;
}

const tabs = [
  { key: 'today', label: 'Today' },
  { key: 'all', label: 'All Reminders' },
  { key: 'compliance', label: 'Compliance' },
];

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

export default function RemindersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('today');
  const [todayLogs, setTodayLogs] = useState<TodayLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [summary, setSummary] = useState<AdherenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    try {
      const res = await medicationRemindersAPI.getToday();
      setTodayLogs(res.data.data || res.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await medicationRemindersAPI.list({ limit: 50 });
      setReminders(res.data.data?.data || res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await medicationRemindersAPI.getSummary();
      setSummary(res.data.data || res.data || null);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchToday(), fetchReminders(), fetchSummary()]).finally(() =>
      setIsLoading(false),
    );
  }, [fetchToday, fetchReminders, fetchSummary]);

  const handleLogAdherence = async (logId: string, status: 'TAKEN' | 'SKIPPED') => {
    try {
      await medicationRemindersAPI.logAdherence({ adherenceLogId: logId, status });
      await fetchToday();
      await fetchSummary();
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Medication Reminders</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medication Reminders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your medications and stay on schedule
          </p>
        </div>
        <button
          onClick={() => router.push('/patient/reminders/new')}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Add Reminder
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Today Tab */}
      {activeTab === 'today' && (
        <div>
          {todayLogs.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto h-16 w-16 text-gray-300" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">No Doses Scheduled Today</h2>
              <p className="mt-2 text-sm text-gray-500">
                You don&apos;t have any medication doses scheduled for today.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                          <Pill className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {log.reminder.prescription.medicationName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {log.reminder.prescription.dosage} &mdash; {formatTime(log.scheduledAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleLogAdherence(log.id, 'TAKEN')}
                              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Take
                            </button>
                            <button
                              onClick={() => handleLogAdherence(log.id, 'SKIPPED')}
                              className="flex items-center gap-1 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Skip
                            </button>
                          </>
                        ) : (
                          <Badge className={logStatusColors[log.status] || 'bg-gray-100 text-gray-800'}>
                            {log.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Reminders Tab */}
      {activeTab === 'all' && (
        <div>
          {reminders.length === 0 ? (
            <div className="py-16 text-center">
              <AlarmClock className="mx-auto h-16 w-16 text-gray-300" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">No Reminders</h2>
              <p className="mt-2 text-sm text-gray-500">
                You haven&apos;t set up any medication reminders yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <Card
                  key={reminder.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/patient/reminders/${reminder.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <AlarmClock className="h-5 w-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {reminder.prescription.medicationName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {reminder.prescription.dosage} &mdash;{' '}
                            {reminder.frequency.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{reminder.timesOfDay.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={statusColors[reminder.status] || 'bg-gray-100 text-gray-800'}>
                        {reminder.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && summary && (
        <div className="space-y-6">
          {/* Overall stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{summary.overallCompliance}%</p>
                <p className="mt-1 text-sm text-gray-500">Overall Compliance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{summary.currentStreak}</p>
                <p className="mt-1 text-sm text-gray-500">Current Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{summary.longestStreak}</p>
                <p className="mt-1 text-sm text-gray-500">Longest Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-gray-700">{summary.totalDoses}</p>
                <p className="mt-1 text-sm text-gray-500">Total Doses</p>
              </CardContent>
            </Card>
          </div>

          {/* Dose breakdown */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Dose Summary</h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">Taken: {summary.dosesTaken}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600">Missed: {summary.dosesMissed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-gray-600">Skipped: {summary.dosesSkipped}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-medication compliance */}
          {summary.perMedication.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Per-Medication Compliance</h3>
                <div className="space-y-3">
                  {summary.perMedication.map((med, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {med.medicationName} ({med.dosage})
                        </span>
                        <span className="font-medium text-gray-900">{med.compliance}%</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${med.compliance}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly trend */}
          {summary.weeklyTrend.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Weekly Trend</h3>
                </div>
                <div className="flex items-end gap-2">
                  {summary.weeklyTrend.map((day, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="relative w-full" style={{ height: '100px' }}>
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-green-500 transition-all"
                          style={{
                            height: `${Math.max(day.compliance, 4)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'narrow' })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'compliance' && !summary && (
        <div className="py-16 text-center">
          <TrendingUp className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Compliance Data</h2>
          <p className="mt-2 text-sm text-gray-500">
            Start tracking your medication to see compliance data.
          </p>
        </div>
      )}
    </div>
  );
}

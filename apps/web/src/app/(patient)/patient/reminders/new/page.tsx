'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { prescriptionsAPI, medicationRemindersAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  dispensed: boolean;
}

const frequencyOptions = [
  { value: 'ONCE_DAILY', label: 'Once Daily', defaultTimes: ['08:00'] },
  { value: 'TWICE_DAILY', label: 'Twice Daily', defaultTimes: ['08:00', '20:00'] },
  { value: 'THREE_TIMES_DAILY', label: 'Three Times Daily', defaultTimes: ['08:00', '14:00', '20:00'] },
  { value: 'FOUR_TIMES_DAILY', label: 'Four Times Daily', defaultTimes: ['08:00', '12:00', '16:00', '20:00'] },
  { value: 'EVERY_OTHER_DAY', label: 'Every Other Day', defaultTimes: ['08:00'] },
  { value: 'WEEKLY', label: 'Weekly', defaultTimes: ['08:00'] },
];

const channelOptions = [
  { value: 'IN_APP', label: 'In-App' },
  { value: 'PUSH', label: 'Push Notification' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

export default function NewReminderPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [prescriptionId, setPrescriptionId] = useState('');
  const [frequency, setFrequency] = useState('TWICE_DAILY');
  const [timesOfDay, setTimesOfDay] = useState(['08:00', '20:00']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notifyVia, setNotifyVia] = useState<string[]>(['IN_APP']);
  const [missedWindowMinutes, setMissedWindowMinutes] = useState(120);

  useEffect(() => {
    async function fetchPrescriptions() {
      try {
        const res = await prescriptionsAPI.list({ limit: 100 });
        const all = res.data.data?.data || res.data.data || [];
        // Only show dispensed prescriptions
        setPrescriptions(all.filter((p: Prescription) => p.dispensed));
      } catch { /* ignore */ }
      setIsLoading(false);
    }
    fetchPrescriptions();
  }, []);

  const handleFrequencyChange = (newFreq: string) => {
    setFrequency(newFreq);
    const option = frequencyOptions.find((f) => f.value === newFreq);
    if (option) {
      setTimesOfDay(option.defaultTimes);
    }
  };

  const handleChannelToggle = (channel: string) => {
    setNotifyVia((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionId) {
      setError('Please select a prescription');
      return;
    }
    if (notifyVia.length === 0) {
      setError('Please select at least one notification channel');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await medicationRemindersAPI.create({
        prescriptionId,
        frequency,
        timesOfDay,
        startDate,
        endDate: endDate || undefined,
        notifyVia,
        missedWindowMinutes,
      });
      router.push('/patient/reminders');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.push('/patient/reminders')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reminders
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Medication Reminder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a reminder for your dispensed prescription
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-5 p-6">
            {/* Prescription selector */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prescription</label>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No dispensed prescriptions available. Reminders can only be created for dispensed prescriptions.
                </p>
              ) : (
                <select
                  value={prescriptionId}
                  onChange={(e) => setPrescriptionId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a prescription...</option>
                  {prescriptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.medicationName} ({p.dosage}) - {p.frequency}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {frequencyOptions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Times of day */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Times of Day
              </label>
              <div className="space-y-2">
                {timesOfDay.map((time, i) => (
                  <input
                    key={i}
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const newTimes = [...timesOfDay];
                      newTimes[i] = e.target.value;
                      setTimesOfDay(newTimes);
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Notification channels */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Notification Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {channelOptions.map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => handleChannelToggle(ch.value)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      notifyVia.includes(ch.value)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Missed window */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Missed Window (minutes)
              </label>
              <input
                type="number"
                value={missedWindowMinutes}
                onChange={(e) => setMissedWindowMinutes(parseInt(e.target.value) || 120)}
                min={15}
                max={480}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                How long after the scheduled time before a dose is marked as missed
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || prescriptions.length === 0}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Reminder'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/patient/reminders')}
                className="rounded-lg bg-gray-200 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { schedulingAPI } from '@/lib/api';

type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

interface TimeWindow {
  id?: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  enabled: boolean;
  windows: TimeWindow[];
}

type WeekSchedule = Record<DayOfWeek, DaySchedule>;

const DAYS_OF_WEEK: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

function createEmptyWeek(): WeekSchedule {
  const week = {} as WeekSchedule;
  for (const day of DAYS_OF_WEEK) {
    week[day] = { enabled: false, windows: [] };
  }
  return week;
}

export function WeeklyAvailabilityEditor() {
  const [schedule, setSchedule] = useState<WeekSchedule>(createEmptyWeek);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await schedulingAPI.getMyAvailability();
      const slots = response.data?.data || response.data || [];

      const week = createEmptyWeek();
      for (const slot of slots) {
        const day = slot.dayOfWeek as DayOfWeek;
        if (week[day]) {
          week[day].enabled = true;
          week[day].windows.push({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }

      setSchedule(week);
    } catch (err) {
      setError('Failed to load availability. Please try again.');
      console.error('Failed to load availability:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const toggleDay = (day: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        windows: !prev[day].enabled && prev[day].windows.length === 0
          ? [{ startTime: '09:00', endTime: '17:00' }]
          : prev[day].windows,
      },
    }));
  };

  const addWindow = (day: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        windows: [...prev[day].windows, { startTime: '09:00', endTime: '17:00' }],
      },
    }));
  };

  const removeWindow = (day: DayOfWeek, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        windows: prev[day].windows.filter((_, i) => i !== index),
      },
    }));
  };

  const updateWindow = (
    day: DayOfWeek,
    index: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        windows: prev[day].windows.map((w, i) =>
          i === index ? { ...w, [field]: value } : w
        ),
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const slots: Array<{ dayOfWeek: string; startTime: string; endTime: string; isActive: boolean }> = [];

      for (const day of DAYS_OF_WEEK) {
        const daySchedule = schedule[day];
        if (daySchedule.enabled) {
          for (const window of daySchedule.windows) {
            if (window.startTime && window.endTime) {
              slots.push({
                dayOfWeek: day,
                startTime: window.startTime,
                endTime: window.endTime,
                isActive: true,
              });
            }
          }
        }
      }

      await schedulingAPI.setBulkAvailability(slots);
      setSuccessMessage('Availability saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to save availability. Please try again.');
      console.error('Failed to save availability:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading availability...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Weekly Availability
        </CardTitle>
        <CardDescription>
          Set your available hours for each day of the week. Patients will only be
          able to book during these time windows.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {DAYS_OF_WEEK.map((day) => {
          const daySchedule = schedule[day];
          return (
            <div
              key={day}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={daySchedule.enabled}
                    onClick={() => toggleDay(day)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 ${
                      daySchedule.enabled ? 'bg-primary-700' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                        daySchedule.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-900">
                    {DAY_LABELS[day]}
                  </span>
                </div>

                {daySchedule.enabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addWindow(day)}
                    className="text-primary-700"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Window
                  </Button>
                )}
              </div>

              {daySchedule.enabled && (
                <div className="mt-3 space-y-2">
                  {daySchedule.windows.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No time windows set. Click &quot;Add Window&quot; to add one.
                    </p>
                  )}
                  {daySchedule.windows.map((window, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={window.startTime}
                          onChange={(e) =>
                            updateWindow(day, index, 'startTime', e.target.value)
                          }
                          className="w-32"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <Input
                          type="time"
                          value={window.endTime}
                          onChange={(e) =>
                            updateWindow(day, index, 'endTime', e.target.value)
                          }
                          className="w-32"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWindow(day, index)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <CardFooter className="justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          disabled={saving}
        >
          <Save className="mr-2 h-4 w-4" />
          Save All
        </Button>
      </CardFooter>
    </Card>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { WeeklyAvailabilityEditor } from '@/components/scheduling/weekly-availability-editor';
import { BlackoutDateManager } from '@/components/scheduling/blackout-date-manager';
import { schedulingAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Save } from 'lucide-react';

export default function PractitionerAvailabilityPage() {
  const [activeTab, setActiveTab] = useState<'availability' | 'blackouts' | 'settings'>('availability');
  const [slotDuration, setSlotDuration] = useState(60);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    schedulingAPI.getSettings().then((res) => {
      const data = res.data.data || res.data;
      setSlotDuration(data.slotDurationMinutes || 60);
      setBufferMinutes(data.bufferMinutes || 15);
    }).catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      await schedulingAPI.updateSettings({
        slotDurationMinutes: slotDuration,
        bufferMinutes: bufferMinutes,
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Availability Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Set your weekly schedule, blackout dates, and booking preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {(['availability', 'blackouts', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'availability' ? 'Weekly Schedule' : tab === 'blackouts' ? 'Blackout Dates' : 'Settings'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'availability' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <WeeklyAvailabilityEditor />
        </div>
      )}

      {activeTab === 'blackouts' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <BlackoutDateManager />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduling Settings</h3>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slot Duration (minutes)
              </label>
              <Input
                type="number"
                min={15}
                max={240}
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-gray-500">
                How long each appointment slot lasts (15-240 minutes)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Between Appointments (minutes)
              </label>
              <Input
                type="number"
                min={0}
                max={60}
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Break time between consecutive appointments (0-60 minutes)
              </p>
            </div>
            <Button onClick={handleSaveSettings} disabled={settingsLoading}>
              <Save className="h-4 w-4 mr-2" />
              {settingsLoading ? 'Saving...' : settingsSaved ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

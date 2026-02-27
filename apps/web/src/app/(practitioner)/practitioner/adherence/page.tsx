'use client';

import React, { useState } from 'react';
import { medicationRemindersAPI, usersAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Search, Pill, TrendingUp } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface PatientAdherence {
  patient: { id: string; firstName: string; lastName: string };
  summary: {
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
      compliance: number;
      total: number;
      taken: number;
    }>;
    weeklyTrend: Array<{
      date: string;
      taken: number;
      total: number;
      compliance: number;
    }>;
  };
  activeReminders: Array<{
    id: string;
    frequency: string;
    timesOfDay: string[];
    prescription: {
      medicationName: string;
      dosage: string;
      frequency: string;
    };
  }>;
  recentLogs: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    reason: string | null;
    reminder: {
      prescription: { medicationName: string; dosage: string };
    };
  }>;
}

const logStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  TAKEN: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-orange-100 text-orange-800',
  MISSED: 'bg-red-100 text-red-800',
};

export default function PractitionerAdherencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [adherenceData, setAdherenceData] = useState<PatientAdherence | null>(null);
  const [isLoadingAdherence, setIsLoadingAdherence] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError('');
    try {
      const res = await usersAPI.searchPatients({ search: searchQuery, limit: 10 });
      setPatients(res.data.data?.data || res.data.data || []);
    } catch {
      setPatients([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPatient = async (patientId: string) => {
    setSelectedPatient(patientId);
    setIsLoadingAdherence(true);
    setError('');
    try {
      const res = await medicationRemindersAPI.getPatientAdherence(patientId);
      setAdherenceData(res.data.data || res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load adherence data');
      setAdherenceData(null);
    } finally {
      setIsLoadingAdherence(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Adherence</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor medication adherence for your patients
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {patients.length > 0 && (
            <div className="mt-3 divide-y rounded-md border">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    selectedPatient === patient.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </span>
                  <span className="text-gray-500">{patient.email || patient.phone}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {isLoadingAdherence && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {adherenceData && !isLoadingAdherence && (
        <div className="space-y-4">
          {/* Patient header */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {adherenceData.patient.firstName} {adherenceData.patient.lastName}
            </h2>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {adherenceData.summary.overallCompliance}%
                </p>
                <p className="mt-1 text-sm text-gray-500">Compliance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {adherenceData.summary.currentStreak}
                </p>
                <p className="mt-1 text-sm text-gray-500">Current Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-gray-700">
                  {adherenceData.summary.dosesTaken}
                </p>
                <p className="mt-1 text-sm text-gray-500">Doses Taken</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {adherenceData.summary.dosesMissed}
                </p>
                <p className="mt-1 text-sm text-gray-500">Doses Missed</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-medication breakdown */}
          {adherenceData.summary.perMedication.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Per-Medication Compliance
                </h3>
                <div className="space-y-3">
                  {adherenceData.summary.perMedication.map((med, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {med.medicationName} ({med.dosage})
                        </span>
                        <span className="font-medium">{med.compliance}%</span>
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

          {/* Active reminders */}
          {adherenceData.activeReminders.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Active Reminders</h3>
                </div>
                <div className="space-y-2">
                  {adherenceData.activeReminders.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{r.prescription.medicationName}</span>
                        <span className="ml-2 text-gray-500">{r.prescription.dosage}</span>
                      </div>
                      <span className="text-gray-500">
                        {r.timesOfDay.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly trend */}
          {adherenceData.summary.weeklyTrend.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Weekly Trend</h3>
                </div>
                <div className="flex items-end gap-2">
                  {adherenceData.summary.weeklyTrend.map((day, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="relative w-full" style={{ height: '80px' }}>
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-green-500 transition-all"
                          style={{ height: `${Math.max(day.compliance, 4)}%` }}
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

          {/* Recent logs */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Recent Adherence Logs</h3>
              {adherenceData.recentLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No adherence logs yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-medium">Medication</th>
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Time</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {adherenceData.recentLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2">
                            {log.reminder.prescription.medicationName}
                          </td>
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
                            <Badge className={logStatusColors[log.status] || 'bg-gray-100 text-gray-800'}>
                              {log.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!adherenceData && !isLoadingAdherence && !error && (
        <div className="py-16 text-center">
          <Activity className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Search for a Patient</h2>
          <p className="mt-2 text-sm text-gray-500">
            Search for a patient you&apos;ve prescribed to, to view their medication adherence.
          </p>
        </div>
      )}
    </div>
  );
}

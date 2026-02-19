'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { telehealthAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

interface TelehealthSession {
  id: string;
  status: string;
  createdAt: string;
  durationMinutes?: number;
  booking: {
    practitioner: { id: string; firstName: string; lastName: string };
    patient: { id: string; firstName: string; lastName: string };
  };
}

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

const statusColors: Record<string, string> = {
  WAITING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-gray-100 text-gray-800',
};

export default function PatientTelehealthSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await telehealthAPI.getMySessions({ limit: 50 });
        setSessions(res.data.data || []);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(true);
    fetchSessions();
  }, []);

  const filtered = sessions.filter((s) => {
    if (activeTab === 'upcoming') return s.status === 'WAITING' || s.status === 'ACTIVE';
    if (activeTab === 'completed') return s.status === 'ENDED';
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Telehealth</h1>
        <p className="mt-1 text-sm text-gray-500">Your virtual consultation sessions</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Video className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No telehealth sessions yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your virtual consultations will appear here once scheduled.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => (
            <Card key={session.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <Video className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Dr. {session.booking.practitioner.firstName} {session.booking.practitioner.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString('en-ZM', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(session.createdAt).toLocaleTimeString('en-ZM', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {session.status === 'ENDED' && session.durationMinutes != null && (
                        <p className="text-xs text-gray-400">Duration: {session.durationMinutes} min</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusColors[session.status] || 'bg-gray-100 text-gray-800'}>
                      {session.status}
                    </Badge>
                    {(session.status === 'WAITING' || session.status === 'ACTIVE') && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/patient/telehealth/${session.id}`)}
                      >
                        Join Call
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

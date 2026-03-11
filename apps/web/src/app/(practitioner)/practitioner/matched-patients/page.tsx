'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adoptionsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Users, MapPin, AlertTriangle, HeartHandshake, Clock } from 'lucide-react';

interface MatchedPatient {
  id: string;
  patientId: string;
  symptoms: string;
  serviceType: string;
  urgency: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  province?: string;
  additionalNotes?: string;
  createdAt: string;
  patientFirstName: string;
  patientLastName: string;
  distance?: number;
}

const urgencyColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

const urgencyIcons: Record<string, string> = {
  EMERGENCY: '!!!',
  HIGH: '!!',
  MODERATE: '!',
  LOW: '',
};

export default function MatchedPatientsPage() {
  const [patients, setPatients] = useState<MatchedPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchMatched() {
    try {
      const res = await adoptionsAPI.getMatchedPatients({ page, limit: 20 });
      const d = res.data.data || res.data;
      setPatients(d?.data || d || []);
      setTotal(d?.total || 0);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('HPCZ verification required to view matched patients');
      } else {
        toast.error('Failed to load matched patients');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchMatched();
  }, [page]);

  async function handleRequestAdopt(conditionSummaryId: string) {
    setRequestingId(conditionSummaryId);
    try {
      await adoptionsAPI.requestByPractitioner({ conditionSummaryId });
      toast.success('Adoption request sent! Waiting for patient consent.');
      fetchMatched();
    } catch {
      toast.error('Failed to send request');
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Matched Patients</h1>
        <p className="mt-1 text-sm text-gray-500">
          Patients seeking care that matches your specialty and location. Request to adopt their care.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : patients.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {patients.map((p) => (
              <Card
                key={p.id}
                className={`transition-all hover:shadow-md ${
                  p.urgency === 'EMERGENCY'
                    ? 'border-red-200 bg-red-50/30'
                    : p.urgency === 'HIGH'
                    ? 'border-orange-200'
                    : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={urgencyColors[p.urgency] || ''}>
                        {p.urgency === 'EMERGENCY' && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {p.urgency}
                      </Badge>
                      <span className="text-xs text-gray-500 capitalize">
                        {p.serviceType.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    {p.distance != null && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {p.distance.toFixed(1)} km
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {p.patientFirstName} {p.patientLastName}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-2">{p.symptoms}</p>

                  {p.additionalNotes && (
                    <p className="text-xs text-gray-500 italic line-clamp-1 mb-2">
                      Note: {p.additionalNotes}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {p.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(p.createdAt)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRequestAdopt(p.id)}
                      disabled={requestingId === p.id}
                    >
                      <HeartHandshake className="mr-1 h-3 w-3" />
                      {requestingId === p.id ? 'Requesting...' : 'Request to Adopt'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {total > 20 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-500">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No matching patients found right now
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Make sure your profile is available and HPCZ-verified to see matches.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adoptionsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { HeartHandshake, CheckCircle, XCircle, Unlock } from 'lucide-react';

interface Adoption {
  id: string;
  status: string;
  initiatedBy: string;
  createdAt: string;
  consentedAt?: string;
  conditionSummary: {
    id: string;
    symptoms: string;
    serviceType: string;
    urgency: string;
    status: string;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

const adoptionStatusColors: Record<string, string> = {
  PENDING_PRACTITIONER_CONSENT: 'bg-yellow-100 text-yellow-800',
  PENDING_PATIENT_CONSENT: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-green-100 text-green-800',
  RELEASED: 'bg-gray-100 text-gray-600',
  DECLINED: 'bg-red-100 text-red-800',
};

const urgencyColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

export default function PractitionerAdoptionsPage() {
  const [adoptions, setAdoptions] = useState<Adoption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  async function fetchAdoptions() {
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const res = await adoptionsAPI.getMyAdoptions(params);
      const d = res.data.data;
      setAdoptions(d?.data || d || []);
    } catch {
      toast.error('Failed to load adoptions');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAdoptions();
  }, [filter]);

  async function handleConsent(id: string) {
    try {
      await adoptionsAPI.consent(id);
      toast.success('Adoption accepted - you are now the care provider');
      fetchAdoptions();
    } catch {
      toast.error('Failed to accept');
    }
  }

  async function handleDecline(id: string) {
    const reason = prompt('Reason for declining (optional):');
    try {
      await adoptionsAPI.decline(id, { reason: reason || undefined });
      toast.success('Adoption declined');
      fetchAdoptions();
    } catch {
      toast.error('Failed to decline');
    }
  }

  async function handleRelease(id: string) {
    const reason = prompt('Reason for releasing (optional):');
    if (!confirm('Release this patient? They will become available for other practitioners.')) return;
    try {
      await adoptionsAPI.release(id, { reason: reason || undefined });
      toast.success('Patient released');
      fetchAdoptions();
    } catch {
      toast.error('Failed to release');
    }
  }

  const filters = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING_PRACTITIONER_CONSENT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Released', value: 'RELEASED' },
    { label: 'Declined', value: 'DECLINED' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Adoptions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your patient adoption requests and active care relationships.
        </p>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : adoptions.length > 0 ? (
        <div className="space-y-4">
          {adoptions.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={adoptionStatusColors[a.status] || ''}>
                        {a.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={urgencyColors[a.conditionSummary.urgency] || ''}>
                        {a.conditionSummary.urgency}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {a.initiatedBy === 'PATIENT' ? 'Requested by patient' : 'Requested by you'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.patient.firstName} {a.patient.lastName}
                    </p>
                    {a.status === 'ACTIVE' && a.patient.phone && (
                      <p className="text-xs text-gray-500">Phone: {a.patient.phone}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 line-clamp-1 capitalize">
                      {a.conditionSummary.serviceType.replace(/_/g, ' ').toLowerCase()}: {a.conditionSummary.symptoms}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(a.createdAt)}
                      {a.consentedAt && ` | Active since ${formatDate(a.consentedAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {a.status === 'PENDING_PRACTITIONER_CONSENT' && (
                      <>
                        <Button size="sm" onClick={() => handleConsent(a.id)}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDecline(a.id)}>
                          <XCircle className="mr-1 h-3 w-3" /> Decline
                        </Button>
                      </>
                    )}
                    {a.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => handleRelease(a.id)}>
                        <Unlock className="mr-1 h-3 w-3" /> Release
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <HeartHandshake className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No adoption requests yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Visit Matched Patients to find patients seeking your care.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

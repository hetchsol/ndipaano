'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adoptionsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  HeartPulse,
  Edit,
  XCircle,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

interface ConditionSummary {
  id: string;
  symptoms: string;
  serviceType: string;
  urgency: string;
  status: string;
  address?: string;
  city?: string;
  createdAt: string;
  adoptions: Array<{
    id: string;
    status: string;
    practitioner: { id: string; firstName: string; lastName: string };
  }>;
}

const urgencyColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800',
  ADOPTED: 'bg-green-100 text-green-800',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
};

export default function ConditionsPage() {
  const [conditions, setConditions] = useState<ConditionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchConditions() {
    try {
      const res = await adoptionsAPI.getMyConditionSummaries();
      const d = res.data.data;
      setConditions(d?.data || d || []);
    } catch {
      toast.error('Failed to load conditions');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchConditions();
  }, []);

  async function handleWithdraw(id: string) {
    if (!confirm('Withdraw this condition? Any pending adoption requests will be declined.')) return;
    try {
      await adoptionsAPI.withdrawConditionSummary(id);
      toast.success('Condition withdrawn');
      fetchConditions();
    } catch {
      toast.error('Failed to withdraw condition');
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Conditions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Describe your health conditions to be matched with practitioners.
          </p>
        </div>
        <Link href="/patient/conditions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Describe Condition
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : conditions.length > 0 ? (
        <div className="space-y-4">
          {conditions.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[c.status] || ''}>
                        {c.status}
                      </Badge>
                      <Badge className={urgencyColors[c.urgency] || ''}>
                        {c.urgency}
                      </Badge>
                      <span className="text-xs text-gray-400 capitalize">
                        {c.serviceType.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">{c.symptoms}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      {c.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {c.city}
                        </span>
                      )}
                      <span>{formatDate(c.createdAt)}</span>
                    </div>
                    {c.adoptions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.adoptions.map((a) => (
                          <span key={a.id} className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                            Dr. {a.practitioner.firstName} {a.practitioner.lastName} - {a.status.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {c.status === 'ACTIVE' && (
                    <div className="flex gap-2 ml-4">
                      <Link href={`/patient/conditions/new?edit=${c.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleWithdraw(c.id)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <HeartPulse className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No conditions described yet</p>
            <Link href="/patient/conditions/new">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Describe Your Condition
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

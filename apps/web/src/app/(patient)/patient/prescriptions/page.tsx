'use client';

import React, { useEffect, useState } from 'react';
import { prescriptionsAPI } from '../../../../lib/api';
import { formatDate } from '../../../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Select } from '../../../../components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../../components/ui/table';
import {
  Pill,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  status: 'active' | 'completed' | 'expired' | 'refill_requested';
  dispensed: boolean;
  prescribedBy: {
    firstName: string;
    lastName: string;
    type: string;
  };
  prescribedAt: string;
  expiresAt: string;
  refillsRemaining: number;
  pharmacy?: {
    name: string;
    address: string;
  };
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function fetchPrescriptions() {
    setIsLoading(true);
    try {
      const response = await prescriptionsAPI.list({ limit: 50 });
      setPrescriptions(response.data.data?.prescriptions || []);
    } catch {
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefillRequest(id: string) {
    try {
      await prescriptionsAPI.requestRefill(id);
      toast.success('Refill request submitted successfully.');
      fetchPrescriptions();
    } catch {
      toast.error('Failed to request refill. Please try again.');
    }
  }

  const filteredPrescriptions = prescriptions.filter((rx) => {
    switch (filter) {
      case 'pending':
        return !rx.dispensed;
      case 'dispensed':
        return rx.dispensed;
      default:
        return true;
    }
  });

  const getDispensedBadge = (dispensed: boolean) => {
    return dispensed ? (
      <Badge variant="success">Dispensed</Badge>
    ) : (
      <Badge variant="warning">Pending</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      active: 'success',
      refill_requested: 'info',
      expired: 'error',
      completed: 'default',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your prescriptions and track dispensing status.
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-48">
          <Select
            options={[
              { value: 'all', label: 'All Prescriptions' },
              { value: 'pending', label: 'Pending' },
              { value: 'dispensed', label: 'Dispensed' },
            ]}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <p className="text-sm text-gray-500">
          Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : filteredPrescriptions.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Prescribed By</TableHead>
                <TableHead>Prescribed Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dispensed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrescriptions.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-green-700" />
                      <span className="font-medium text-gray-900">{rx.medication}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{rx.dosage}</TableCell>
                  <TableCell className="text-gray-600">{rx.frequency}</TableCell>
                  <TableCell className="text-gray-600">
                    Dr. {rx.prescribedBy.firstName} {rx.prescribedBy.lastName}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {formatDate(rx.prescribedAt)}
                  </TableCell>
                  <TableCell>{getStatusBadge(rx.status)}</TableCell>
                  <TableCell>{getDispensedBadge(rx.dispensed)}</TableCell>
                  <TableCell>
                    {rx.status === 'active' && rx.refillsRemaining > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRefillRequest(rx.id)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Refill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="py-16 text-center">
          <Pill className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No prescriptions found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {filter !== 'all'
              ? 'No prescriptions match your current filter.'
              : 'Your prescriptions will appear here after consultations.'}
          </p>
        </div>
      )}

      {/* Prescription details for mobile */}
      <div className="mt-6 block lg:hidden">
        {!isLoading && filteredPrescriptions.length > 0 && (
          <div className="space-y-4">
            {filteredPrescriptions.map((rx) => (
              <Card key={`mobile-${rx.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-green-700" />
                      <h3 className="font-semibold text-gray-900">{rx.medication}</h3>
                    </div>
                    {getDispensedBadge(rx.dispensed)}
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Dosage:</span> {rx.dosage}</p>
                    <p><span className="font-medium">Frequency:</span> {rx.frequency}</p>
                    <p><span className="font-medium">By:</span> Dr. {rx.prescribedBy.firstName} {rx.prescribedBy.lastName}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(rx.prescribedAt)}</p>
                  </div>
                  {rx.instructions && (
                    <p className="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
                      {rx.instructions}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    {getStatusBadge(rx.status)}
                    {rx.status === 'active' && rx.refillsRemaining > 0 && (
                      <Button size="sm" variant="outline" onClick={() => handleRefillRequest(rx.id)}>
                        <RefreshCw className="mr-1 h-3 w-3" /> Refill
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

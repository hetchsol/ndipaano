'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { labResultsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ResultBadge } from '@/components/lab-results/result-badge';

interface LabOrder {
  id: string;
  diagnosticTest: { name: string; category: string };
  practitioner: { firstName: string; lastName: string };
  status: string;
  priority: string;
  orderedAt: string;
  results?: Array<{ interpretation: string }>;
}

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];

export default function PatientLabResultsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function fetchOrders() {
      try {
        const statusFilter = activeTab === 'pending' ? 'ORDERED' : activeTab === 'completed' ? 'COMPLETED' : undefined;
        const res = await labResultsAPI.getPatientOrders({ status: statusFilter, limit: 50 });
        setOrders(res.data.data?.data || res.data.data || []);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(true);
    fetchOrders();
  }, [activeTab]);

  const statusColors: Record<string, string> = {
    ORDERED: 'bg-blue-100 text-blue-800',
    SAMPLE_COLLECTED: 'bg-purple-100 text-purple-800',
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const priorityColors: Record<string, string> = {
    ROUTINE: 'bg-gray-100 text-gray-700',
    URGENT: 'bg-orange-100 text-orange-800',
    STAT: 'bg-red-100 text-red-800',
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
        <p className="mt-1 text-sm text-gray-500">View your lab orders and results</p>
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
      ) : orders.length === 0 ? (
        <div className="py-16 text-center">
          <TestTube className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Lab Orders</h2>
          <p className="mt-2 text-sm text-gray-500">You don&apos;t have any lab orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/patient/lab-results/${order.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                      <TestTube className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.diagnosticTest.name}</p>
                      <p className="text-xs text-gray-500">
                        Ordered by {order.practitioner.firstName} {order.practitioner.lastName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.orderedAt).toLocaleDateString('en-ZM', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                    {order.priority !== 'ROUTINE' && (
                      <Badge className={priorityColors[order.priority] || ''}>
                        {order.priority}
                      </Badge>
                    )}
                    {order.results?.[0] && (
                      <ResultBadge interpretation={order.results[0].interpretation} />
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

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { labResultsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { TestTube, Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface LabOrder {
  id: string;
  patient: { firstName: string; lastName: string };
  diagnosticTest: { name: string; category: string };
  status: string;
  priority: string;
  orderedAt: string;
}

const statusOptions = ['', 'ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

export default function PractitionerLabOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  async function fetchOrders() {
    setIsLoading(true);
    try {
      const res = await labResultsAPI.listOrders({ status: statusFilter || undefined, limit: 50 });
      setOrders(res.data.data?.data || res.data.data || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  async function handleQuickStatus(orderId: string, newStatus: string) {
    try {
      await labResultsAPI.updateOrderStatus(orderId, { status: newStatus });
      toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch {
      toast.error('Failed to update status');
    }
  }

  const statusColors: Record<string, string> = {
    ORDERED: 'bg-blue-100 text-blue-800',
    SAMPLE_COLLECTED: 'bg-purple-100 text-purple-800',
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const nextStatus: Record<string, string> = {
    ORDERED: 'SAMPLE_COLLECTED',
    SAMPLE_COLLECTED: 'PROCESSING',
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Manage lab orders and enter results</p>
        </div>
        <Link href="/practitioner/lab-orders/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New Lab Order</Button>
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
        >
          <option value="">All Statuses</option>
          {statusOptions.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-gray-100" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <TestTube className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No lab orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.patient.firstName} {order.patient.lastName}
                    </TableCell>
                    <TableCell>{order.diagnosticTest.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(order.orderedAt).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={order.priority === 'STAT' ? 'bg-red-100 text-red-800' : order.priority === 'URGENT' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}>
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status] || ''}>{order.status.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {nextStatus[order.status] && (
                          <Button size="sm" variant="outline" onClick={() => handleQuickStatus(order.id, nextStatus[order.status])}>
                            {nextStatus[order.status].replace(/_/g, ' ')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/practitioner/lab-orders/${order.id}`)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

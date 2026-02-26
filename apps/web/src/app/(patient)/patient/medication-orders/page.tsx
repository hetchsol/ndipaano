'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { medicationOrdersAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Pill, Store } from 'lucide-react';

interface MedicationOrder {
  id: string;
  status: string;
  quantity: number;
  totalAmount: string | number;
  createdAt: string;
  prescription: {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    quantity?: number;
  };
  pharmacy: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
}

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED'];

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-indigo-100 text-indigo-800',
  DISPATCHED: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function MedicationOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await medicationOrdersAPI.list({ limit: 50 });
        setOrders(res.data.data?.data || res.data.data || []);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(true);
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    switch (activeTab) {
      case 'active':
        return ACTIVE_STATUSES.includes(order.status);
      case 'delivered':
        return order.status === 'DELIVERED';
      case 'cancelled':
        return order.status === 'CANCELLED';
      default:
        return true;
    }
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medication Orders</h1>
        <p className="mt-1 text-sm text-gray-500">Track your medication orders and delivery status</p>
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
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Medication Orders</h2>
          <p className="mt-2 text-sm text-gray-500">
            {activeTab !== 'all'
              ? 'No orders match this filter.'
              : 'You haven\'t placed any medication orders yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/patient/medication-orders/${order.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                      <Pill className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.prescription.medicationName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Store className="h-3 w-3" />
                        <span>{order.pharmacy.name}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-ZM', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm font-medium text-gray-700">
                      {formatCurrency(Number(order.totalAmount))}
                    </span>
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

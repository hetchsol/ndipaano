'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { medicationOrdersAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Pill,
  Store,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Circle,
  Truck,
  AlertCircle,
  Phone,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

interface MedicationOrderDetail {
  id: string;
  status: string;
  quantity: number;
  unitPrice: string | number;
  totalAmount: string | number;
  deliveryAddress?: string;
  deliveryFee?: string | number;
  paymentMethod?: string;
  paymentStatus: string;
  notes?: string;
  cancelledReason?: string;
  confirmedAt?: string;
  readyAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  prescription: {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration?: string;
    quantity?: number;
    notes?: string;
  };
  pharmacy: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    email?: string;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const TIMELINE_STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: Circle },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { key: 'PREPARING', label: 'Preparing', icon: Package },
  { key: 'READY', label: 'Ready', icon: CheckCircle },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

function getTimelineIndex(status: string): number {
  const mapping: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    PREPARING: 2,
    READY: 3,
    DISPATCHED: 4,
    DELIVERED: 5,
    CANCELLED: -1,
  };
  return mapping[status] ?? 0;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-indigo-100 text-indigo-800',
  DISPATCHED: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function MedicationOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<MedicationOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await medicationOrdersAPI.getById(orderId);
        setOrder(res.data.data || res.data);
      } catch {
        toast.error('Failed to load order details.');
      } finally {
        setIsLoading(false);
      }
    }
    if (orderId) fetchOrder();
  }, [orderId]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setIsCancelling(true);
    try {
      await medicationOrdersAPI.cancel(orderId);
      toast.success('Order cancelled successfully.');
      router.push('/patient/medication-orders');
    } catch {
      toast.error('Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Order Not Found</h2>
        <p className="mt-2 text-sm text-gray-500">This order does not exist or you don&apos;t have access.</p>
        <Button onClick={() => router.push('/patient/medication-orders')} className="mt-4">
          Back to Orders
        </Button>
      </div>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const canCancel = !['DELIVERED', 'CANCELLED'].includes(order.status);
  const currentStepIndex = getTimelineIndex(order.status);

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="mt-1 text-sm text-gray-500">Order #{order.id.slice(0, 8)}</p>
        </div>
        <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'} size="md">
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Status Timeline */}
      {!isCancelled && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                          isCurrent
                            ? 'border-green-700 bg-green-700 text-white'
                            : isActive
                            ? 'border-green-700 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-400'
                        }`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <span
                        className={`mt-2 hidden text-xs font-medium sm:block ${
                          isCurrent ? 'text-green-700' : isActive ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 ${
                          index < currentStepIndex ? 'bg-green-700' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">This order has been cancelled</p>
              {order.cancelledReason && (
                <p className="text-sm text-red-600">Reason: {order.cancelledReason}</p>
              )}
              {order.cancelledAt && (
                <p className="text-sm text-red-600">
                  Cancelled on {new Date(order.cancelledAt).toLocaleDateString('en-ZM', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Prescription Details */}
          <Card>
            <CardHeader>
              <CardTitle>Prescription Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Pill className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Medication</p>
                    <p className="font-medium text-gray-900">{order.prescription.medicationName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dosage</p>
                  <p className="font-medium text-gray-900">{order.prescription.dosage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Frequency</p>
                  <p className="font-medium text-gray-900">{order.prescription.frequency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quantity</p>
                  <p className="font-medium text-gray-900">{order.quantity}</p>
                </div>
                {order.prescription.duration && (
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-medium text-gray-900">{order.prescription.duration}</p>
                  </div>
                )}
              </div>
              {order.prescription.notes && (
                <div className="mt-4 rounded-md bg-yellow-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Prescription Notes</p>
                  <p className="mt-1 text-sm text-yellow-800">{order.prescription.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unit Price</span>
                  <span>{formatCurrency(Number(order.unitPrice))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantity</span>
                  <span>&times; {order.quantity}</span>
                </div>
                {order.deliveryFee && Number(order.deliveryFee) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span>{formatCurrency(Number(order.deliveryFee))}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="text-green-700">{formatCurrency(Number(order.totalAmount))}</span>
                  </div>
                </div>
                {order.paymentMethod && (
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method</span>
                    <span>{order.paymentMethod.replace(/_/g, ' ')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Status</span>
                  <Badge className={
                    order.paymentStatus === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
            {canCancel && (
              <CardFooter>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  isLoading={isCancelling}
                >
                  Cancel Order
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Delivery info */}
          {order.deliveryAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Delivery Address</p>
                    <p className="font-medium text-gray-900">{order.deliveryAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pharmacy Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Store className="h-8 w-8 text-green-700" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{order.pharmacy.name}</h3>
                <p className="text-sm text-gray-500">{order.pharmacy.city}</p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{order.pharmacy.address}</span>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{order.pharmacy.phone}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="mt-6 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Timeline</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ordered</span>
                    <span className="text-gray-700">
                      {new Date(order.createdAt).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {order.confirmedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Confirmed</span>
                      <span className="text-gray-700">
                        {new Date(order.confirmedAt).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {order.readyAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ready</span>
                      <span className="text-gray-700">
                        {new Date(order.readyAt).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {order.dispatchedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dispatched</span>
                      <span className="text-gray-700">
                        {new Date(order.dispatchedAt).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivered</span>
                      <span className="text-gray-700">
                        {new Date(order.deliveredAt).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

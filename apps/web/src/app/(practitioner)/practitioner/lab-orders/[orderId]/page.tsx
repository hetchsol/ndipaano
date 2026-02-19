'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { labResultsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResultBadge } from '@/components/lab-results/result-badge';
import { ArrowLeft, TestTube, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

interface OrderDetail {
  id: string;
  patient: { id: string; firstName: string; lastName: string };
  practitioner: { firstName: string; lastName: string };
  diagnosticTest: { id: string; name: string; category: string };
  status: string;
  priority: string;
  clinicalNotes?: string;
  orderedAt: string;
  sampleCollectedAt?: string;
  completedAt?: string;
  results: Array<{
    id: string;
    resultValue: string;
    resultUnit?: string;
    referenceRangeMin?: string;
    referenceRangeMax?: string;
    interpretation: string;
    practitionerNotes?: string;
  }>;
}

export default function PractitionerLabOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Result entry form
  const [resultValue, setResultValue] = useState('');
  const [resultUnit, setResultUnit] = useState('');
  const [refMin, setRefMin] = useState('');
  const [refMax, setRefMax] = useState('');
  const [refText, setRefText] = useState('');
  const [interpretation, setInterpretation] = useState('NORMAL');
  const [resultNotes, setResultNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await labResultsAPI.getOrder(orderId);
        setOrder(res.data.data || res.data);
      } catch {
        toast.error('Failed to load order');
      } finally {
        setIsLoading(false);
      }
    }
    if (orderId) fetchOrder();
  }, [orderId]);

  async function handleStatusUpdate(newStatus: string) {
    try {
      await labResultsAPI.updateOrderStatus(orderId, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      const res = await labResultsAPI.getOrder(orderId);
      setOrder(res.data.data || res.data);
    } catch {
      toast.error('Failed to update status');
    }
  }

  async function handleSubmitResult() {
    if (!resultValue) { toast.error('Result value is required'); return; }
    setIsSubmitting(true);
    try {
      await labResultsAPI.createResult({
        labOrderId: orderId,
        resultValue,
        resultUnit: resultUnit || undefined,
        referenceRangeMin: refMin || undefined,
        referenceRangeMax: refMax || undefined,
        referenceRangeText: refText || undefined,
        interpretation,
        practitionerNotes: resultNotes || undefined,
      });
      toast.success('Result submitted successfully');
      const res = await labResultsAPI.getOrder(orderId);
      setOrder(res.data.data || res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit result');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-gray-200" /><div className="h-64 animate-pulse rounded-lg bg-gray-100" /></div>;
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <TestTube className="mx-auto h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Order Not Found</h2>
        <Button onClick={() => router.push('/practitioner/lab-orders')} className="mt-4">Back to Lab Orders</Button>
      </div>
    );
  }

  const hasResults = order.results && order.results.length > 0;
  const canEnterResults = ['PROCESSING', 'SAMPLE_COLLECTED'].includes(order.status);
  const statusColors: Record<string, string> = {
    ORDERED: 'bg-blue-100 text-blue-800',
    SAMPLE_COLLECTED: 'bg-purple-100 text-purple-800',
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Lab Orders
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.diagnosticTest.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Patient: {order.patient.firstName} {order.patient.lastName}
          </p>
        </div>
        <Badge className={statusColors[order.status] || ''}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Info */}
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Test</span><span className="text-sm font-medium">{order.diagnosticTest.name}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Category</span><span className="text-sm font-medium">{order.diagnosticTest.category.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Patient</span><span className="text-sm font-medium">{order.patient.firstName} {order.patient.lastName}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Date Ordered</span><span className="text-sm font-medium">{new Date(order.orderedAt).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Priority</span><span className="text-sm font-medium">{order.priority}</span></div>
            {order.clinicalNotes && (
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">Clinical Notes</p>
                <p className="mt-1 text-sm text-gray-700">{order.clinicalNotes}</p>
              </div>
            )}

            {/* Status actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {order.status === 'ORDERED' && (
                <Button size="sm" onClick={() => handleStatusUpdate('SAMPLE_COLLECTED')}>Mark Sample Collected</Button>
              )}
              {order.status === 'SAMPLE_COLLECTED' && (
                <Button size="sm" onClick={() => handleStatusUpdate('PROCESSING')}>Mark Processing</Button>
              )}
              {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('CANCELLED')}>Cancel Order</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results or Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>{hasResults ? 'Results' : 'Enter Results'}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasResults ? (
              <div className="space-y-4">
                {order.results.map((r) => (
                  <div key={r.id} className="rounded-lg border p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {r.resultValue}
                        {r.resultUnit && <span className="ml-1 text-sm text-gray-500">{r.resultUnit}</span>}
                      </p>
                      <div className="mt-2"><ResultBadge interpretation={r.interpretation} /></div>
                    </div>
                    {(r.referenceRangeMin || r.referenceRangeMax) && (
                      <p className="mt-2 text-center text-xs text-gray-500">
                        Ref: {r.referenceRangeMin} - {r.referenceRangeMax} {r.resultUnit}
                      </p>
                    )}
                    {r.practitionerNotes && (
                      <div className="mt-3 rounded-md bg-gray-50 p-2">
                        <p className="text-xs text-gray-600">{r.practitionerNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : canEnterResults ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result Value *</label>
                  <Input value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder="e.g., 5.2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <Input value={resultUnit} onChange={(e) => setResultUnit(e.target.value)} placeholder="e.g., mmol/L" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ref. Min</label>
                    <Input value={refMin} onChange={(e) => setRefMin(e.target.value)} placeholder="e.g., 3.9" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ref. Max</label>
                    <Input value={refMax} onChange={(e) => setRefMax(e.target.value)} placeholder="e.g., 5.6" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Text</label>
                  <Input value={refText} onChange={(e) => setRefText(e.target.value)} placeholder="e.g., Negative" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interpretation *</label>
                  <select
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="ABNORMAL">Abnormal</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                    placeholder="Interpretation notes..."
                  />
                </div>
                <Button className="w-full" onClick={handleSubmitResult} disabled={isSubmitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit Result'}
                </Button>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-gray-500">
                  {order.status === 'ORDERED' ? 'Collect sample first, then enter results' : 'No results available'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

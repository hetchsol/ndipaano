'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { labResultsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResultBadge } from '@/components/lab-results/result-badge';
import { ResultTrendChart } from '@/components/lab-results/result-trend-chart';
import { ArrowLeft, TestTube, User, Calendar, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface LabOrderDetail {
  id: string;
  diagnosticTest: { id: string; name: string; category: string };
  practitioner: { firstName: string; lastName: string };
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
    referenceRangeText?: string;
    interpretation: string;
    practitionerNotes?: string;
    createdAt: string;
  }>;
}

interface TrendPoint {
  date: string;
  value: number;
  interpretation: string;
}

export default function PatientLabOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<LabOrderDetail | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await labResultsAPI.getOrder(orderId);
        const orderData = res.data.data || res.data;
        setOrder(orderData);

        // Fetch trend data if we have completed results
        if (orderData.diagnosticTest?.id && orderData.results?.length > 0) {
          try {
            const trendRes = await labResultsAPI.getResultTrend(orderData.diagnosticTest.id);
            const rawTrend = trendRes.data.data || trendRes.data || [];
            const points: TrendPoint[] = rawTrend
              .filter((r: any) => !isNaN(parseFloat(r.resultValue)))
              .map((r: any) => ({
                date: r.createdAt || r.labOrder?.completedAt || r.labOrder?.orderedAt,
                value: parseFloat(r.resultValue),
                interpretation: r.interpretation,
              }));
            setTrendData(points);
          } catch {
            // trend data is optional
          }
        }
      } catch {
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    }
    if (orderId) fetchData();
  }, [orderId]);

  const statusTimeline = [
    { key: 'ORDERED', label: 'Ordered' },
    { key: 'SAMPLE_COLLECTED', label: 'Sample Collected' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const currentStepIndex = order ? statusTimeline.findIndex((s) => s.key === order.status) : 0;

  if (isLoading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-gray-200" /><div className="h-64 animate-pulse rounded-lg bg-gray-100" /></div>;
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <TestTube className="mx-auto h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Order Not Found</h2>
        <Button onClick={() => router.push('/patient/lab-results')} className="mt-4">Back to Lab Results</Button>
      </div>
    );
  }

  const result = order.results?.[0];

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Lab Results
      </button>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">{order.diagnosticTest.name}</h1>

      {/* Status Timeline */}
      {order.status !== 'CANCELLED' && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {statusTimeline.map((step, index) => (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      index <= currentStepIndex ? 'border-green-700 bg-green-700 text-white' : 'border-gray-200 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={`mt-1 text-xs ${index <= currentStepIndex ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < statusTimeline.length - 1 && (
                    <div className={`mx-2 h-0.5 flex-1 ${index < currentStepIndex ? 'bg-green-700' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Test</span>
              <span className="text-sm font-medium">{order.diagnosticTest.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Category</span>
              <span className="text-sm font-medium">{order.diagnosticTest.category.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Ordered By</span>
              <span className="text-sm font-medium">{order.practitioner.firstName} {order.practitioner.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date Ordered</span>
              <span className="text-sm font-medium">{new Date(order.orderedAt).toLocaleDateString('en-ZM', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Priority</span>
              <Badge className={order.priority === 'STAT' ? 'bg-red-100 text-red-800' : order.priority === 'URGENT' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}>
                {order.priority}
              </Badge>
            </div>
            {order.clinicalNotes && (
              <div className="mt-2 rounded-md bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">Clinical Notes</p>
                <p className="mt-1 text-sm text-gray-700">{order.clinicalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" /> Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {result.resultValue}
                  {result.resultUnit && <span className="ml-1 text-lg text-gray-500">{result.resultUnit}</span>}
                </p>
                <div className="mt-2">
                  <ResultBadge interpretation={result.interpretation} />
                </div>
              </div>
              {(result.referenceRangeMin || result.referenceRangeMax) && (
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Reference Range</p>
                  <p className="text-sm text-gray-700">
                    {result.referenceRangeMin} - {result.referenceRangeMax} {result.resultUnit || ''}
                  </p>
                </div>
              )}
              {result.referenceRangeText && (
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Reference</p>
                  <p className="text-sm text-gray-700">{result.referenceRangeText}</p>
                </div>
              )}
              {result.practitionerNotes && (
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-700">Practitioner Notes</p>
                  <p className="mt-1 text-sm text-blue-900">{result.practitionerNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex h-48 items-center justify-center">
              <div className="text-center">
                <TestTube className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">Results pending</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trend Chart */}
      {trendData.length >= 2 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Historical Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResultTrendChart
              data={trendData}
              unit={result?.resultUnit}
              referenceMin={result?.referenceRangeMin ? parseFloat(result.referenceRangeMin) : undefined}
              referenceMax={result?.referenceRangeMax ? parseFloat(result.referenceRangeMax) : undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { labResultsAPI, diagnosticTestsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface DiagnosticTest {
  id: string;
  name: string;
  category: string;
  code?: string;
}

export default function NewLabOrderPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');

  // Load tests
  useEffect(() => {
    diagnosticTestsAPI.search({ limit: 100 }).then((res) => {
      const data = res.data.data?.data || res.data.data || [];
      setTests(data);
    }).catch(() => {});
  }, []);

  // Load patients from recent bookings
  useEffect(() => {
    import('@/lib/api').then(({ bookingsAPI }) => {
      bookingsAPI.list({ role: 'practitioner', limit: 50 }).then((res) => {
        const bookings = res.data.data?.bookings || [];
        const uniquePatients = new Map<string, Patient>();
        bookings.forEach((b: any) => {
          if (b.patient && !uniquePatients.has(b.patient.id || b.patientId)) {
            uniquePatients.set(b.patient.id || b.patientId, {
              id: b.patient.id || b.patientId,
              firstName: b.patient.firstName,
              lastName: b.patient.lastName,
            });
          }
        });
        setPatients(Array.from(uniquePatients.values()));
      }).catch(() => {});
    });
  }, []);

  async function handleSubmit() {
    if (!selectedPatientId || !selectedTestId) {
      toast.error('Please select a patient and test');
      return;
    }
    setIsSubmitting(true);
    try {
      await labResultsAPI.createOrder({
        patientId: selectedPatientId,
        diagnosticTestId: selectedTestId,
        priority,
        clinicalNotes: clinicalNotes || undefined,
      });
      toast.success('Lab order created successfully');
      router.push('/practitioner/lab-orders');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase());
  });

  const filteredTests = tests.filter((t) => {
    if (!testSearch) return true;
    return t.name.toLowerCase().includes(testSearch.toLowerCase()) || (t.code || '').toLowerCase().includes(testSearch.toLowerCase());
  });

  // Group tests by category
  const testsByCategory = filteredTests.reduce<Record<string, DiagnosticTest[]>>((acc, test) => {
    const cat = test.category.replace(/_/g, ' ');
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(test);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Lab Orders
      </button>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Lab Order</h1>

      <div className="max-w-2xl space-y-6">
        {/* Patient Select */}
        <Card>
          <CardHeader><CardTitle>Select Patient</CardTitle></CardHeader>
          <CardContent>
            <Input
              placeholder="Search patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="mb-3"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedPatientId === p.id ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-50'
                  }`}
                >
                  {p.firstName} {p.lastName}
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">No patients found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Select */}
        <Card>
          <CardHeader><CardTitle>Select Diagnostic Test</CardTitle></CardHeader>
          <CardContent>
            <Input
              placeholder="Search tests..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className="mb-3"
            />
            <div className="max-h-64 space-y-4 overflow-y-auto">
              {Object.entries(testsByCategory).map(([category, catTests]) => (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{category}</p>
                  <div className="space-y-1">
                    {catTests.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTestId(t.id)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          selectedTestId === t.id ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span>{t.name}</span>
                        {t.code && <span className="text-xs text-gray-400">{t.code}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority & Notes */}
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
              >
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                placeholder="Why is this test being ordered..."
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !selectedPatientId || !selectedTestId}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Creating Order...' : 'Create Lab Order'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

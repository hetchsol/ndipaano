'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { labResultsAPI, diagnosticTestsAPI, usersAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Search, ChevronDown, X, User, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

interface DiagnosticTest {
  id: string;
  name: string;
  category: string;
  code?: string;
}

export default function NewLabOrderPage() {
  const router = useRouter();

  // Patient search state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const patientInputRef = useRef<HTMLInputElement>(null);

  // Test search state
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [testSearch, setTestSearch] = useState('');
  const [selectedTest, setSelectedTest] = useState<DiagnosticTest | null>(null);
  const [isTestDropdownOpen, setIsTestDropdownOpen] = useState(false);
  const testDropdownRef = useRef<HTMLDivElement>(null);
  const testInputRef = useRef<HTMLInputElement>(null);

  // Order details
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all diagnostic tests on mount
  useEffect(() => {
    diagnosticTestsAPI.search({ limit: 200 }).then((res) => {
      const data = res.data.data?.data || res.data.data || [];
      setTests(data);
    }).catch(() => {});
  }, []);

  // Debounced patient search
  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingPatients(true);
      usersAPI.searchPatients({ search: patientSearch.trim(), limit: 10 })
        .then((res) => {
          const data = res.data.data || res.data || [];
          setPatientResults(data);
          setIsPatientDropdownOpen(true);
        })
        .catch(() => {
          setPatientResults([]);
        })
        .finally(() => {
          setIsSearchingPatients(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
      if (testDropdownRef.current && !testDropdownRef.current.contains(e.target as Node)) {
        setIsTestDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tests by search
  const filteredTests = tests.filter((t) => {
    if (!testSearch.trim()) return true;
    const q = testSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.code || '').toLowerCase().includes(q);
  });

  // Group filtered tests by category
  const testsByCategory = filteredTests.reduce<Record<string, DiagnosticTest[]>>((acc, test) => {
    const cat = test.category.replace(/_/g, ' ');
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(test);
    return acc;
  }, {});

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setPatientSearch('');
    setPatientResults([]);
    setIsPatientDropdownOpen(false);
  }

  function handleClearPatient() {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientResults([]);
    setTimeout(() => patientInputRef.current?.focus(), 0);
  }

  function handleSelectTest(test: DiagnosticTest) {
    setSelectedTest(test);
    setTestSearch('');
    setIsTestDropdownOpen(false);
  }

  function handleClearTest() {
    setSelectedTest(null);
    setTestSearch('');
    setTimeout(() => testInputRef.current?.focus(), 0);
  }

  function truncateId(id: string) {
    return id.length > 8 ? `${id.slice(0, 8)}...` : id;
  }

  async function handleSubmit() {
    if (!selectedPatient || !selectedTest) {
      toast.error('Please select a patient and test');
      return;
    }
    setIsSubmitting(true);
    try {
      await labResultsAPI.createOrder({
        patientId: selectedPatient.id,
        diagnosticTestId: selectedTest.id,
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

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Lab Orders
      </button>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Lab Order</h1>

      <div className="max-w-2xl space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader><CardTitle>Select Patient</CardTitle></CardHeader>
          <CardContent>
            {selectedPatient ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <User className="h-5 w-5 text-green-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-green-800">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-xs text-green-600">
                    ID: {truncateId(selectedPatient.id)}
                    {selectedPatient.phone && ` · ${selectedPatient.phone}`}
                  </p>
                </div>
                <button
                  onClick={handleClearPatient}
                  className="shrink-0 rounded-full p-1 text-green-600 hover:bg-green-100 hover:text-green-800"
                  aria-label="Clear patient selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div ref={patientDropdownRef} className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    ref={patientInputRef}
                    placeholder="Type a patient name or ID to search..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    onFocus={() => {
                      if (patientResults.length > 0) setIsPatientDropdownOpen(true);
                    }}
                    className="pl-10"
                  />
                  {isSearchingPatients && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
                    </div>
                  )}
                </div>

                {isPatientDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-60 overflow-y-auto py-1">
                      {patientResults.length > 0 ? (
                        patientResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPatient(p)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                          >
                            <User className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900">
                                {p.firstName} {p.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {truncateId(p.id)}
                                {p.phone && ` · ${p.phone}`}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-center text-sm text-gray-500">
                          No patients found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Selection */}
        <Card>
          <CardHeader><CardTitle>Select Diagnostic Test</CardTitle></CardHeader>
          <CardContent>
            {selectedTest ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <FlaskConical className="h-5 w-5 text-green-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-green-800">{selectedTest.name}</p>
                  {selectedTest.code && (
                    <p className="text-xs text-green-600">Code: {selectedTest.code}</p>
                  )}
                </div>
                <button
                  onClick={handleClearTest}
                  className="shrink-0 rounded-full p-1 text-green-600 hover:bg-green-100 hover:text-green-800"
                  aria-label="Clear test selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div ref={testDropdownRef} className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    ref={testInputRef}
                    placeholder="Search tests by name or code..."
                    value={testSearch}
                    onChange={(e) => {
                      setTestSearch(e.target.value);
                      setIsTestDropdownOpen(true);
                    }}
                    onFocus={() => setIsTestDropdownOpen(true)}
                    className="pl-10 pr-10"
                  />
                  <ChevronDown
                    className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform ${isTestDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </div>

                {isTestDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-72 overflow-y-auto py-1">
                      {Object.keys(testsByCategory).length > 0 ? (
                        Object.entries(testsByCategory).map(([category, catTests]) => (
                          <div key={category}>
                            <div className="sticky top-0 bg-gray-50 px-4 py-1.5">
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                {category}
                              </p>
                            </div>
                            {catTests.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => handleSelectTest(t)}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-gray-900">{t.name}</span>
                                {t.code && (
                                  <span className="ml-2 shrink-0 text-xs text-gray-400">{t.code}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-center text-sm text-gray-500">
                          No tests found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
            <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !selectedPatient || !selectedTest}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Creating Order...' : 'Create Lab Order'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

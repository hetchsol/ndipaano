'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarView } from '@/components/scheduling/calendar-view';
import { SlotPicker } from '@/components/scheduling/slot-picker';
import { practitionersAPI, bookingsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, MapPin } from 'lucide-react';

interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  practitionerProfile?: {
    practitionerType: string;
    ratingAvg: number;
    baseConsultationFee: string | number;
  };
}

export default function NewBookingPageWrapper() {
  return (
    <Suspense fallback={<div className="animate-pulse p-8"><div className="h-8 w-48 bg-gray-200 rounded mb-4" /><div className="h-64 bg-gray-100 rounded" /></div>}>
      <NewBookingPage />
    </Suspense>
  );
}

function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPractitionerId = searchParams.get('practitionerId');

  const [step, setStep] = useState(preselectedPractitionerId ? 2 : 1);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load practitioner if preselected
  useEffect(() => {
    if (preselectedPractitionerId) {
      practitionersAPI.getById(preselectedPractitionerId).then((res) => {
        const p = res.data.data || res.data;
        setSelectedPractitioner(p);
      }).catch(() => {});
    }
  }, [preselectedPractitionerId]);

  // Load practitioner list for step 1
  useEffect(() => {
    if (step === 1) {
      practitionersAPI.search({ isAvailable: true, limit: 50 }).then((res) => {
        const data = res.data.data?.data || res.data.data || [];
        setPractitioners(data);
      }).catch(() => {});
    }
  }, [step]);

  const handleSubmit = async () => {
    if (!selectedPractitioner || !selectedSlot || !address) return;
    setIsSubmitting(true);
    setError('');
    try {
      await bookingsAPI.create({
        practitionerId: selectedPractitioner.id,
        dateTime: selectedSlot.startTime,
        type: 'home_visit',
        address,
        notes: notes || undefined,
      });
      router.push('/patient/bookings');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPractitioners = practitioners.filter((p) => {
    if (!searchQuery) return true;
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/patient/bookings')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Bookings
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Book an Appointment</h1>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center gap-2">
        {[
          { num: 1, label: 'Practitioner' },
          { num: 2, label: 'Date' },
          { num: 3, label: 'Time' },
          { num: 4, label: 'Details' },
        ].map(({ num, label }) => (
          <React.Fragment key={num}>
            <div className={`flex items-center gap-1.5 ${step >= num ? 'text-primary-700' : 'text-gray-400'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                step > num ? 'bg-primary-700 text-white' : step === num ? 'border-2 border-primary-700 text-primary-700' : 'border-2 border-gray-300 text-gray-400'
              }`}>
                {step > num ? <Check className="h-3.5 w-3.5" /> : num}
              </div>
              <span className="hidden text-sm font-medium sm:inline">{label}</span>
            </div>
            {num < 4 && <div className={`h-0.5 flex-1 ${step > num ? 'bg-primary-700' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select Practitioner */}
      {step === 1 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Practitioner</h2>
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPractitioners.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPractitioner(p);
                  setStep(2);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {p.practitionerProfile?.practitionerType?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary-700">
                    K{p.practitionerProfile?.baseConsultationFee || '0'}
                  </p>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto mt-1" />
                </div>
              </button>
            ))}
            {filteredPractitioners.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">No practitioners found</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select Date */}
      {step === 2 && selectedPractitioner && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select a Date
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Change Practitioner
            </Button>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Booking with {selectedPractitioner.firstName} {selectedPractitioner.lastName}
          </p>
          <CalendarView
            practitionerId={selectedPractitioner.id}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
              setStep(3);
            }}
          />
        </div>
      )}

      {/* Step 3: Select Time Slot */}
      {step === 3 && selectedPractitioner && selectedDate && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Select a Time
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Change Date
            </Button>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-ZM', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
          <SlotPicker
            practitionerId={selectedPractitioner.id}
            date={selectedDate}
            selectedSlot={selectedSlot || undefined}
            onSlotSelect={(slot) => {
              setSelectedSlot(slot);
              setStep(4);
            }}
          />
        </div>
      )}

      {/* Step 4: Enter Details */}
      {step === 4 && selectedPractitioner && selectedSlot && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Appointment Details
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Change Time
            </Button>
          </div>

          {/* Summary */}
          <div className="mb-6 rounded-lg bg-primary-50 p-4">
            <p className="text-sm font-medium text-primary-900">
              {selectedPractitioner.firstName} {selectedPractitioner.lastName}
            </p>
            <p className="text-sm text-primary-700">
              {new Date(selectedSlot.startTime).toLocaleDateString('en-ZM', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
            <p className="text-sm text-primary-700">
              {new Date(selectedSlot.startTime).toLocaleTimeString('en-ZM', {
                hour: '2-digit', minute: '2-digit',
              })}
              {' - '}
              {new Date(selectedSlot.endTime).toLocaleTimeString('en-ZM', {
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <Input
                placeholder="Enter your address for the home visit"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                placeholder="Any symptoms or information for the practitioner..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !address}
              className="w-full"
            >
              {isSubmitting ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

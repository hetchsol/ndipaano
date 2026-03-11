'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adoptionsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, MapPin } from 'lucide-react';

const SERVICE_TYPES = [
  'GENERAL_CONSULTATION',
  'NURSING_CARE',
  'WOUND_DRESSING',
  'INJECTION_ADMINISTRATION',
  'IV_THERAPY',
  'PHYSIOTHERAPY',
  'MATERNAL_CARE',
  'CHILD_WELLNESS',
  'CHRONIC_DISEASE_MANAGEMENT',
  'PALLIATIVE_CARE',
  'POST_OPERATIVE_CARE',
  'MENTAL_HEALTH',
  'PHARMACY_DELIVERY',
  'LAB_SAMPLE_COLLECTION',
  'EMERGENCY_TRIAGE',
  'VIRTUAL_CONSULTATION',
];

const URGENCY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'EMERGENCY'];

const ZAMBIAN_PROVINCES = [
  'Central',
  'Copperbelt',
  'Eastern',
  'Luapula',
  'Lusaka',
  'Muchinga',
  'Northern',
  'North-Western',
  'Southern',
  'Western',
];

export default function NewConditionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [form, setForm] = useState({
    symptoms: '',
    serviceType: 'GENERAL_CONSULTATION',
    urgency: 'MODERATE',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    address: '',
    city: '',
    province: '',
    additionalNotes: '',
  });

  function handleChange(field: string, value: string | number | undefined) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsLocating(false);
        toast.success('Location detected');
      },
      () => {
        toast.error('Failed to detect location');
        setIsLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }

    setIsSubmitting(true);
    try {
      await adoptionsAPI.createConditionSummary({
        symptoms: form.symptoms,
        serviceType: form.serviceType,
        urgency: form.urgency,
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        additionalNotes: form.additionalNotes || undefined,
      });
      toast.success('Condition submitted! Practitioners will be matched.');
      router.push('/patient/conditions');
    } catch {
      toast.error('Failed to submit condition');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Describe Your Condition</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tell us about your symptoms so we can match you with the right practitioner.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Condition Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Symptoms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe your symptoms *
              </label>
              <textarea
                value={form.symptoms}
                onChange={(e) => handleChange('symptoms', e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="E.g., I have been experiencing chest pain for the past 2 days, especially when breathing deeply..."
              />
            </div>

            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type of service needed
              </label>
              <select
                value={form.serviceType}
                onChange={(e) => handleChange('serviceType', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgency level
              </label>
              <div className="flex gap-2">
                {URGENCY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleChange('urgency', level)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      form.urgency === level
                        ? level === 'LOW' ? 'bg-green-600 text-white'
                        : level === 'MODERATE' ? 'bg-yellow-500 text-white'
                        : level === 'HIGH' ? 'bg-orange-500 text-white'
                        : 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your location
              </label>
              <div className="flex gap-2 mb-3">
                <Button type="button" variant="outline" onClick={detectLocation} disabled={isLocating}>
                  <MapPin className="mr-2 h-4 w-4" />
                  {isLocating ? 'Detecting...' : form.latitude ? 'Location Set' : 'Detect Location'}
                </Button>
                {form.latitude && (
                  <span className="flex items-center text-xs text-green-600">
                    {form.latitude.toFixed(4)}, {form.longitude?.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
                <Input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
                <select
                  value={form.province}
                  onChange={(e) => handleChange('province', e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select Province</option>
                  {ZAMBIAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional notes (optional)
              </label>
              <textarea
                value={form.additionalNotes}
                onChange={(e) => handleChange('additionalNotes', e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Any other details that may help..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Condition'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

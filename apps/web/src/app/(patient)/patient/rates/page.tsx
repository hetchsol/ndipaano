'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Stethoscope,
  Heart,
  Cross,
  Syringe,
  Droplets,
  Activity,
  Baby,
  SmilePlus,
  HeartPulse,
  Hand,
  Scissors,
  Brain,
  Pill,
  TestTube,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';

const serviceRates = [
  {
    key: 'GENERAL_CONSULTATION',
    title: 'General Consultation',
    icon: Stethoscope,
    range: 'K150 – K350',
    note: 'Per visit, varies by duration',
  },
  {
    key: 'NURSING_CARE',
    title: 'Nursing Care',
    icon: Heart,
    range: 'K200 – K500',
    note: 'Per session, hourly rates available',
  },
  {
    key: 'WOUND_DRESSING',
    title: 'Wound Dressing',
    icon: Cross,
    range: 'K100 – K250',
    note: 'Per dressing, materials included',
  },
  {
    key: 'INJECTION_ADMINISTRATION',
    title: 'Injection Administration',
    icon: Syringe,
    range: 'K80 – K200',
    note: 'Per injection, excludes medication',
  },
  {
    key: 'IV_THERAPY',
    title: 'IV Therapy',
    icon: Droplets,
    range: 'K250 – K600',
    note: 'Per session, includes setup & monitoring',
  },
  {
    key: 'PHYSIOTHERAPY',
    title: 'Physiotherapy',
    icon: Activity,
    range: 'K200 – K450',
    note: 'Per session (45–60 min)',
  },
  {
    key: 'MATERNAL_CARE',
    title: 'Maternal Care',
    icon: Baby,
    range: 'K200 – K500',
    note: 'Per visit, pre & post-natal',
  },
  {
    key: 'CHILD_WELLNESS',
    title: 'Child Wellness',
    icon: SmilePlus,
    range: 'K150 – K350',
    note: 'Per check-up visit',
  },
  {
    key: 'CHRONIC_DISEASE_MANAGEMENT',
    title: 'Chronic Disease Management',
    icon: HeartPulse,
    range: 'K200 – K450',
    note: 'Per visit, ongoing care plans available',
  },
  {
    key: 'PALLIATIVE_CARE',
    title: 'Palliative Care',
    icon: Hand,
    range: 'K300 – K700',
    note: 'Per visit, packages available',
  },
  {
    key: 'POST_OPERATIVE_CARE',
    title: 'Post-Operative Care',
    icon: Scissors,
    range: 'K200 – K500',
    note: 'Per visit, follow-up packages available',
  },
  {
    key: 'MENTAL_HEALTH',
    title: 'Mental Health',
    icon: Brain,
    range: 'K250 – K550',
    note: 'Per session (50–60 min)',
  },
  {
    key: 'PHARMACY_DELIVERY',
    title: 'Pharmacy Delivery',
    icon: Pill,
    range: 'K50 – K150',
    note: 'Delivery fee, excludes medication cost',
  },
  {
    key: 'LAB_SAMPLE_COLLECTION',
    title: 'Lab Sample Collection',
    icon: TestTube,
    range: 'K100 – K300',
    note: 'Collection fee, lab fees separate',
  },
  {
    key: 'EMERGENCY_TRIAGE',
    title: 'Emergency Triage',
    icon: AlertTriangle,
    range: 'K300 – K800',
    note: 'Assessment & stabilisation, priority response',
  },
];

export default function RatesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Service Rates</h1>
        <p className="mt-2 text-gray-500">
          Typical consultation rate ranges for home visit services on Ndipaano!.
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-8 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Rates are indicative</p>
          <p className="mt-1">
            Actual fees are set by individual practitioners and may vary based on location,
            time of visit, complexity, and materials required. Always confirm the rate with
            your practitioner before booking.
          </p>
        </div>
      </div>

      {/* Rates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {serviceRates.map((service) => (
          <div
            key={service.key}
            className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <service.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{service.title}</h3>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg font-bold text-primary-700">{service.range}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{service.note}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 rounded-lg border border-gray-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Ready to book a practitioner?
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Search for verified practitioners in your area, compare their rates, and book an appointment.
        </p>
        <div className="mt-4">
          <Link href="/search">
            <Button>
              Find Practitioners
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

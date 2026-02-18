'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
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
} from 'lucide-react';

const services = [
  {
    key: 'GENERAL_CONSULTATION',
    title: 'General Consultation',
    description:
      'Comprehensive medical check-ups and consultations in the comfort of your home. Our practitioners assess symptoms, provide diagnoses, and recommend treatment plans.',
    icon: Stethoscope,
  },
  {
    key: 'NURSING_CARE',
    title: 'Nursing Care',
    description:
      'Professional nursing services including patient monitoring, medication administration, and ongoing care management for patients recovering at home.',
    icon: Heart,
  },
  {
    key: 'WOUND_DRESSING',
    title: 'Wound Dressing',
    description:
      'Expert wound care and dressing changes for surgical wounds, burns, ulcers, and other injuries. Proper sterile technique ensures optimal healing.',
    icon: Cross,
  },
  {
    key: 'INJECTION_ADMINISTRATION',
    title: 'Injection Administration',
    description:
      'Safe and professional administration of prescribed injections including intramuscular, subcutaneous, and other injection types at your home.',
    icon: Syringe,
  },
  {
    key: 'IV_THERAPY',
    title: 'IV Therapy',
    description:
      'Intravenous fluid and medication administration by qualified practitioners. Includes IV line setup, monitoring, and removal.',
    icon: Droplets,
  },
  {
    key: 'PHYSIOTHERAPY',
    title: 'Physiotherapy',
    description:
      'Rehabilitative physical therapy sessions at home. Includes mobility exercises, pain management techniques, and recovery programs.',
    icon: Activity,
  },
  {
    key: 'MATERNAL_CARE',
    title: 'Maternal Care',
    description:
      'Pre-natal and post-natal care for mothers including check-ups, breastfeeding support, newborn assessments, and maternal health monitoring.',
    icon: Baby,
  },
  {
    key: 'CHILD_WELLNESS',
    title: 'Child Wellness',
    description:
      'Pediatric health check-ups, growth monitoring, vaccinations, and wellness assessments for infants and children in a familiar environment.',
    icon: SmilePlus,
  },
  {
    key: 'CHRONIC_DISEASE_MANAGEMENT',
    title: 'Chronic Disease Management',
    description:
      'Ongoing management and monitoring of chronic conditions such as diabetes, hypertension, asthma, and heart disease with regular home visits.',
    icon: HeartPulse,
  },
  {
    key: 'PALLIATIVE_CARE',
    title: 'Palliative Care',
    description:
      'Compassionate end-of-life and comfort care focusing on pain management, symptom relief, and emotional support for patients and families.',
    icon: Hand,
  },
  {
    key: 'POST_OPERATIVE_CARE',
    title: 'Post-Operative Care',
    description:
      'Follow-up care after surgery including wound monitoring, medication management, mobility assistance, and recovery tracking.',
    icon: Scissors,
  },
  {
    key: 'MENTAL_HEALTH',
    title: 'Mental Health',
    description:
      'Confidential mental health support including counselling sessions, psychological assessments, and therapeutic interventions at home.',
    icon: Brain,
  },
  {
    key: 'PHARMACY_DELIVERY',
    title: 'Pharmacy Delivery',
    description:
      'Convenient delivery of prescribed medications directly to your doorstep, ensuring you never miss a dose of your treatment.',
    icon: Pill,
  },
  {
    key: 'LAB_SAMPLE_COLLECTION',
    title: 'Lab Sample Collection',
    description:
      'At-home collection of blood, urine, and other laboratory samples by qualified phlebotomists. Results delivered digitally to you and your doctor.',
    icon: TestTube,
  },
  {
    key: 'EMERGENCY_TRIAGE',
    title: 'Emergency Triage',
    description:
      'Rapid assessment and initial emergency care at home. Our practitioners stabilise patients and coordinate hospital transfers when necessary.',
    icon: AlertTriangle,
  },
];

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Home Visit Services
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-lg text-gray-200">
            Ndipaano! brings a full range of healthcare services to your doorstep.
            Browse our services and book a qualified practitioner today.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.key}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-card transition-all hover:shadow-card-hover hover:border-primary-200 active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-700 group-hover:bg-primary-700 group-hover:text-white transition-colors">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {service.description}
                </p>
                <div className="mt-4">
                  <Link href="/register">
                    <Button variant="outline" className="group-hover:border-primary-700 group-hover:text-primary-700">
                      Book Now
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Ready to Book a Home Visit?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Create your free account to browse practitioners, compare rates, and book your first appointment.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="border-2 border-primary-700 bg-primary-700 text-white hover:bg-white hover:text-primary-700 transition-all"
              >
                Register as Client
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/search">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary-700 text-primary-700 hover:bg-primary-700 hover:text-white transition-all"
              >
                Find Practitioners
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

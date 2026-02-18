'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import {
  Home,
  Video,
  ShieldCheck,
  FileText,
  Phone,
  CreditCard,
  Search,
  CalendarCheck,
  Stethoscope,
  ArrowRight,
  Star,
  Users,
  MapPin,
  Heart,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    icon: Home,
    title: 'Home Visits',
    description:
      'Qualified practitioners visit you at home, providing personalized medical care in the comfort of your residence.',
    href: '/services',
  },
  {
    icon: Video,
    title: 'Virtual Consultations',
    description:
      'Connect with healthcare providers through secure video calls for consultations, follow-ups, and medical advice.',
    href: '/search',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Practitioners',
    description:
      'Every practitioner is thoroughly verified with HPCZ credentials, ensuring you receive care from qualified professionals.',
    href: '/search',
  },
  {
    icon: FileText,
    title: 'Secure Records',
    description:
      'Your medical records are encrypted and stored securely, accessible only with your explicit consent under DPA compliance.',
    href: '/login',
  },
  {
    icon: Phone,
    title: 'Emergency Support',
    description:
      'Access emergency medical support with priority booking and direct connections to nearby emergency services.',
    href: '/login',
  },
  {
    icon: CreditCard,
    title: 'Insurance Integration',
    description:
      'Seamless integration with major Zambian insurance providers and support for mobile money payments.',
    href: '/login',
  },
];

const steps = [
  {
    icon: Search,
    step: '01',
    title: 'Search & Discover',
    description:
      'Browse verified practitioners by specialty, location, availability, and patient ratings to find your ideal match.',
  },
  {
    icon: CalendarCheck,
    step: '02',
    title: 'Book Appointment',
    description:
      'Choose between home visits or virtual consultations. Select a convenient time and confirm your booking instantly.',
  },
  {
    icon: Stethoscope,
    step: '03',
    title: 'Receive Quality Care',
    description:
      'Your practitioner arrives at your doorstep or connects virtually. After care, receive digital records and prescriptions.',
  },
];

const stats = [
  { value: '2,500+', label: 'Registered Clients' },
  { value: '350+', label: 'Verified Practitioners' },
  { value: '10,000+', label: 'Consultations Completed' },
  { value: '4.8', label: 'Average Rating', icon: Star },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90">
              <Heart className="h-4 w-4" />
              <span>Trusted by thousands across Zambia</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Healthcare at Your{' '}
              <span className="text-secondary-400">Doorstep</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-200">
              Ndipaano! connects Zambian patients with verified healthcare practitioners
              for professional home-based medical care. Book home visits, virtual
              consultations, and manage your health records -- all in one secure platform.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full border-2 border-white bg-white text-primary-700 hover:bg-primary-700 hover:text-white hover:border-primary-700 transition-all sm:w-auto"
                >
                  Register as Client
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full border-2 border-white bg-white text-primary-700 hover:bg-primary-700 hover:text-white hover:border-primary-700 transition-all sm:w-auto"
                >
                  Join as Practitioner
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 80L60 73.3C120 66.7 240 53.3 360 46.7C480 40 600 40 720 46.7C840 53.3 960 66.7 1080 70C1200 73.3 1320 66.7 1380 63.3L1440 60V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-primary-700">
                    {stat.value}
                  </span>
                  {stat.icon && <stat.icon className="h-5 w-5 text-secondary-500" />}
                </div>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Complete Healthcare Platform
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Everything you need for accessible, quality healthcare delivered to your home.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-card transition-all hover:shadow-card-hover hover:border-primary-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-700 group-hover:bg-primary-700 group-hover:text-white transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-700 transition-colors" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Getting quality healthcare at home is simple with Ndipaano!.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-gray-200 md:block" />
                )}
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary-50" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-700">
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="mt-2 text-xs font-bold uppercase tracking-wider text-secondary-600">
                  Step {step.step}
                </div>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-primary-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">HPCZ Verified</h3>
                <p className="mt-1 text-sm text-gray-300">
                  All practitioners verified through the Health Professions Council of Zambia.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">DPA Compliant</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Fully compliant with the Zambia Data Protection Act, 2021. Your data is safe.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Nationwide Coverage</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Operating across Lusaka, Copperbelt, Southern, and expanding to all provinces.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Ready to Get Started?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Join thousands of Zambians who trust Ndipaano! for their healthcare needs.
            Register today and experience healthcare that comes to you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="border-2 border-primary-700 bg-white text-primary-700 hover:bg-primary-700 hover:text-white transition-all"
              >
                Register as Client
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                className="border-2 border-primary-700 bg-white text-primary-700 hover:bg-primary-700 hover:text-white transition-all"
              >
                Join as Practitioner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { practitionersAPI, diagnosticTestsAPI } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { Header } from '../../../components/layout/header';
import { Footer } from '../../../components/layout/footer';
import { EmergencyCallBanner } from '../../../components/emergency-call-banner';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import {
  Search,
  MapPin,
  Star,
  User,
  Stethoscope,
  CalendarPlus,
  Phone,
  Mail,
  Building2,
  Home,
  TestTube,
} from 'lucide-react';

interface Practitioner {
  id: string;
  userId: string;
  practitionerType: string;
  hpczVerified: boolean;
  specializations: string[];
  bio?: string;
  serviceRadiusKm: number;
  baseConsultationFee: number | string | null;
  isAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  latitude?: number;
  longitude?: number;
  operatingCenterName?: string;
  operatingCenterAddress?: string;
  operatingCenterCity?: string;
  operatingCenterPhone?: string;
  offersHomeVisits: boolean;
  offersClinicVisits: boolean;
  distanceKm?: number;
  user: {
    id: string;
    email?: string;
    phone: string;
    firstName: string;
    lastName: string;
    languagePreference: string;
  };
  // raw SQL flattens user fields
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface DiagnosticTest {
  id: string;
  name: string;
  code: string | null;
  category: string;
}

const categoryLabels: Record<string, string> = {
  LAB_TEST: 'Lab Tests',
  RAPID_TEST: 'Rapid Tests',
  IMAGING: 'Imaging',
  SWAB_CULTURE: 'Swabs & Cultures',
  SCREENING: 'Screening',
  SPECIALIZED: 'Specialized',
};

const practitionerTypes = [
  { value: '', label: 'All Types' },
  { value: 'REGISTERED_NURSE', label: 'Registered Nurse' },
  { value: 'ENROLLED_NURSE', label: 'Enrolled Nurse' },
  { value: 'CLINICAL_OFFICER', label: 'Clinical Officer' },
  { value: 'GENERAL_PRACTITIONER', label: 'General Practitioner' },
  { value: 'SPECIALIST_DOCTOR', label: 'Specialist Doctor' },
  { value: 'PHYSIOTHERAPIST', label: 'Physiotherapist' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'MIDWIFE', label: 'Midwife' },
];

function getPractitionerName(p: Practitioner): string {
  const firstName = p.user?.firstName || p.firstName || '';
  const lastName = p.user?.lastName || p.lastName || '';
  const type = p.practitionerType;
  const prefix =
    type === 'GENERAL_PRACTITIONER' || type === 'SPECIALIST_DOCTOR'
      ? 'Dr. '
      : '';
  return `${prefix}${firstName} ${lastName}`;
}

function getPractitionerPhone(p: Practitioner): string | undefined {
  return p.user?.phone || p.phone;
}

function getPractitionerEmail(p: Practitioner): string | undefined {
  return p.user?.email || p.email;
}

function formatPractitionerType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [type, setType] = useState(searchParams.get('type') || '');
  const [distance, setDistance] = useState('25');
  const [minRating, setMinRating] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [diagnosticTests, setDiagnosticTests] = useState<DiagnosticTest[]>([]);

  useEffect(() => {
    fetchPractitioners();
    fetchDiagnosticTests();
  }, []);

  async function fetchDiagnosticTests() {
    try {
      const response = await diagnosticTestsAPI.search({ limit: 100 });
      setDiagnosticTests(response.data.data || []);
    } catch {
      setDiagnosticTests([]);
    }
  }

  async function fetchPractitioners() {
    setIsLoading(true);
    try {
      const response = await practitionersAPI.search({
        practitionerType: type || undefined,
        minRating: minRating ? parseInt(minRating) : undefined,
        diagnosticTestId: selectedTestId || undefined,
        isAvailable: true,
        limit: 24,
      });
      setPractitioners(response.data.data || []);
    } catch {
      setPractitioners([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPractitioners();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        {/* Filter Bar */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Find Practitioners</h1>
            <p className="mt-1 text-sm text-gray-500">
              Search verified healthcare practitioners across Zambia.
            </p>

            <form onSubmit={handleSearch} className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {/* Type Dropdown */}
                <Select
                  label="Practitioner Type"
                  options={practitionerTypes}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />

                {/* Test / Diagnostic Dropdown */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Test / Diagnostic
                  </label>
                  <select
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">All Tests</option>
                    {Object.entries(
                      diagnosticTests.reduce<Record<string, DiagnosticTest[]>>((acc, test) => {
                        if (!acc[test.category]) acc[test.category] = [];
                        acc[test.category].push(test);
                        return acc;
                      }, {})
                    ).map(([category, tests]) => (
                      <optgroup key={category} label={categoryLabels[category] || category}>
                        {tests.map((test) => (
                          <option key={test.id} value={test.id}>
                            {test.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Distance Slider */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Distance: {distance} km
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">1</span>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-green-700"
                    />
                    <span className="text-xs text-gray-400">100</span>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Minimum Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setMinRating(minRating === star.toString() ? '' : star.toString())}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            parseInt(minRating) >= star
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-300'
                          }`}
                        />
                      </button>
                    ))}
                    {minRating && (
                      <button
                        type="button"
                        onClick={() => setMinRating('')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Emergency Banner + Results */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Emergency Call Banner */}
          <div className="mb-6">
            <EmergencyCallBanner />
          </div>

          <p className="mb-4 text-sm text-gray-500">
            {isLoading
              ? 'Searching...'
              : `${practitioners.length} practitioner${
                  practitioners.length !== 1 ? 's' : ''
                } found`}
          </p>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : practitioners.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {practitioners.map((practitioner) => {
                const phone = getPractitionerPhone(practitioner);
                const email = getPractitionerEmail(practitioner);
                const fee = practitioner.baseConsultationFee;

                return (
                  <Card
                    key={practitioner.id}
                    className="h-full transition-all hover:border-green-200 hover:shadow-md"
                  >
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
                          <User className="h-7 w-7 text-green-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {getPractitionerName(practitioner)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatPractitionerType(practitioner.practitionerType)}
                          </p>
                        </div>
                      </div>

                      {/* Rating Stars */}
                      <div className="mt-3 flex items-center gap-1">
                        {renderStars(practitioner.ratingAvg)}
                        <span className="ml-1 text-sm font-medium text-gray-700">
                          {practitioner.ratingAvg.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({practitioner.ratingCount})
                        </span>
                      </div>

                      {/* Specializations */}
                      {practitioner.specializations && practitioner.specializations.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {practitioner.specializations.slice(0, 3).map((spec) => (
                            <Badge key={spec} variant="outline" size="sm">
                              {spec}
                            </Badge>
                          ))}
                          {practitioner.specializations.length > 3 && (
                            <Badge variant="outline" size="sm">
                              +{practitioner.specializations.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="mt-3 space-y-1">
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-green-700"
                          >
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {phone}
                          </a>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-green-700 truncate"
                          >
                            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{email}</span>
                          </a>
                        )}
                      </div>

                      {/* Availability Badges */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {practitioner.offersHomeVisits && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            <Home className="h-3 w-3" />
                            Home Visits
                          </span>
                        )}
                        {practitioner.offersClinicVisits && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            <Building2 className="h-3 w-3" />
                            Clinic Visits
                          </span>
                        )}
                      </div>

                      {/* Operating Center */}
                      {practitioner.offersClinicVisits && practitioner.operatingCenterName && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
                          <Building2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span>
                            {practitioner.operatingCenterName}
                            {practitioner.operatingCenterAddress && `, ${practitioner.operatingCenterAddress}`}
                          </span>
                        </div>
                      )}

                      {/* Fee and Distance */}
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <div>
                          <p className="text-lg font-bold text-green-700">
                            {fee ? formatCurrency(Number(fee)) : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-400">per consultation</p>
                        </div>
                        {practitioner.distanceKm !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-4 w-4" />
                            {practitioner.distanceKm.toFixed(1)} km
                          </div>
                        )}
                      </div>

                      {/* Book Button */}
                      <Link href={`/practitioners/${practitioner.id}`}>
                        <Button className="mt-3 w-full">
                          <CalendarPlus className="mr-2 h-4 w-4" />
                          Book
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Stethoscope className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No practitioners found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your filters or expanding your search distance.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setType('');
                  setDistance('25');
                  setMinRating('');
                  setSelectedTestId('');
                  fetchPractitioners();
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

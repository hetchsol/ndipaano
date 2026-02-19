'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { practitionersAPI } from '../../../../lib/api';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import { Header } from '../../../../components/layout/header';
import { Footer } from '../../../../components/layout/footer';
import { EmergencyCallBanner } from '../../../../components/emergency-call-banner';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import {
  User,
  Star,
  MapPin,
  Clock,
  Award,
  ArrowLeft,
  Calendar,
  Shield,
  MessageCircle,
  Phone,
  Mail,
  Building2,
  Home,
  TestTube,
} from 'lucide-react';

interface PractitionerProfile {
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
  operatingCenters?: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    phone?: string;
  }>;
  diagnosticTests?: Record<string, {
    label: string;
    tests: Array<{
      id: string;
      name: string;
      code: string | null;
      category: string;
      description: string | null;
    }>;
  }>;
  user: {
    id: string;
    email?: string;
    phone: string;
    firstName: string;
    lastName: string;
    languagePreference: string;
    isActive: boolean;
  };
  reviews: Array<{
    id: string;
    patient: { firstName: string; lastName: string };
    rating: number;
    comment: string;
    createdAt: string;
  }>;
  ratingBreakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

function getPractitionerDisplayName(profile: PractitionerProfile): string {
  const type = profile.practitionerType;
  const prefix =
    type === 'GENERAL_PRACTITIONER' || type === 'SPECIALIST_DOCTOR'
      ? 'Dr. '
      : '';
  return `${prefix}${profile.user.firstName} ${profile.user.lastName}`;
}

function formatPractitionerType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PractitionerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const practitionerId = params.id as string;
  const [practitioner, setPractitioner] = useState<PractitionerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTestCategory, setActiveTestCategory] = useState<string>('');

  useEffect(() => {
    async function fetchPractitioner() {
      try {
        const [profileRes, reviewsRes] = await Promise.allSettled([
          practitionersAPI.getById(practitionerId),
          practitionersAPI.getReviews(practitionerId, { limit: 10 }),
        ]);

        if (profileRes.status === 'fulfilled') {
          const profile = profileRes.value.data.data;
          let reviews: PractitionerProfile['reviews'] = [];
          if (reviewsRes.status === 'fulfilled') {
            reviews = reviewsRes.value.data.data?.data || reviewsRes.value.data.data?.reviews || [];
          }
          const merged = { ...profile, reviews };
          setPractitioner(merged);
          // Set initial active diagnostic test category
          if (merged.diagnosticTests) {
            const cats = Object.keys(merged.diagnosticTests);
            if (cats.length > 0) setActiveTestCategory(cats[0]);
          }
        }
      } catch {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    }
    if (practitionerId) fetchPractitioner();
  }, [practitionerId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
            <div className="mt-6 h-48 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!practitioner) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <User className="mx-auto h-16 w-16 text-gray-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Practitioner Not Found</h2>
            <p className="mt-2 text-sm text-gray-500">
              The practitioner profile you are looking for does not exist.
            </p>
            <Link href="/search">
              <Button className="mt-4">Browse Practitioners</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const displayName = getPractitionerDisplayName(practitioner);
  const fee = practitioner.baseConsultationFee;

  // Calculate rating breakdown from reviews if not provided by API
  const ratingBreakdown = practitioner.ratingBreakdown || {
    5: practitioner.reviews.filter((r) => r.rating === 5).length,
    4: practitioner.reviews.filter((r) => r.rating === 4).length,
    3: practitioner.reviews.filter((r) => r.rating === 3).length,
    2: practitioner.reviews.filter((r) => r.rating === 2).length,
    1: practitioner.reviews.filter((r) => r.rating === 1).length,
  };
  const totalRatings = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </button>

          {/* Profile Header */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-green-800 to-green-900 px-6 py-8">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
                  <User className="h-12 w-12 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl font-bold text-white">
                    {displayName}
                  </h1>
                  <p className="text-green-100">
                    {formatPractitionerType(practitioner.practitionerType)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <div className="flex items-center gap-1">
                      {renderStars(practitioner.ratingAvg)}
                      <span className="ml-1 text-sm text-white">
                        {practitioner.ratingAvg.toFixed(1)} ({practitioner.ratingCount} reviews)
                      </span>
                    </div>
                    {practitioner.hpczVerified && (
                      <Badge className="bg-white/20 text-white">
                        <Shield className="mr-1 h-3 w-3" />
                        HPCZ Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="sm:ml-auto text-center sm:text-right">
                  <p className="text-2xl font-bold text-white">
                    {fee ? formatCurrency(Number(fee)) : 'N/A'}
                  </p>
                  <p className="text-xs text-green-200">per consultation</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {practitioner.operatingCenters?.[0]?.city || practitioner.operatingCenterCity || 'Lusaka'}, Zambia
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {practitioner.isAvailable ? 'Available Now' : 'Currently Unavailable'}
                </span>
              </div>

              {/* Book Appointment CTA */}
              <div className="mt-6">
                <Link href="/search">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Calendar className="mr-2 h-5 w-5" />
                    Book Appointment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Bio Section */}
              {practitioner.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 leading-relaxed">{practitioner.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Specializations Tags */}
              {practitioner.specializations && practitioner.specializations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Specializations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {practitioner.specializations.map((spec) => (
                        <span
                          key={spec}
                          className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Diagnostics & Tests */}
              {practitioner.diagnosticTests && Object.keys(practitioner.diagnosticTests).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5 text-green-700" />
                      Available Diagnostics & Tests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Category Tabs */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {Object.entries(practitioner.diagnosticTests).map(([category, group]) => (
                        <button
                          key={category}
                          onClick={() => setActiveTestCategory(category)}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            activeTestCategory === category
                              ? 'bg-green-700 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {group.label} ({group.tests.length})
                        </button>
                      ))}
                    </div>

                    {/* Tests Grid */}
                    {activeTestCategory && practitioner.diagnosticTests[activeTestCategory] && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {practitioner.diagnosticTests[activeTestCategory].tests.map((test) => (
                          <div
                            key={test.id}
                            className="rounded-lg border border-gray-100 p-3"
                          >
                            <div className="flex items-start gap-2">
                              <TestTube className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{test.name}</p>
                                {test.description && (
                                  <p className="mt-0.5 text-xs text-gray-500">{test.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Service Availability */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div
                      className={`rounded-lg border p-4 ${
                        practitioner.offersHomeVisits
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Home
                          className={`h-5 w-5 ${
                            practitioner.offersHomeVisits ? 'text-green-600' : 'text-gray-400'
                          }`}
                        />
                        <span className="font-medium text-gray-900">Home Visits</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {practitioner.offersHomeVisits
                          ? 'This practitioner visits patients at home'
                          : 'Home visits not available'}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg border p-4 ${
                        practitioner.offersClinicVisits
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2
                          className={`h-5 w-5 ${
                            practitioner.offersClinicVisits ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        />
                        <span className="font-medium text-gray-900">Clinic Visits</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {practitioner.offersClinicVisits
                          ? 'Patients can visit at the clinic'
                          : 'Clinic visits not available'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Patient Reviews</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-bold text-gray-900">
                      {practitioner.ratingAvg.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({practitioner.ratingCount} reviews)
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Rating Breakdown */}
                  <div className="mb-6 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingBreakdown[star as keyof typeof ratingBreakdown] || 0;
                      const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="flex w-8 items-center gap-0.5 text-sm text-gray-600">
                            {star} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-yellow-400 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-gray-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Individual Reviews */}
                  {practitioner.reviews.length > 0 ? (
                    <div className="space-y-4">
                      {practitioner.reviews.map((review) => (
                        <div
                          key={review.id}
                          className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                <User className="h-4 w-4 text-gray-500" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {review.patient.firstName} {review.patient.lastName.charAt(0)}.
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <MessageCircle className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">No reviews yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Book */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-5 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-green-700" />
                  <h3 className="mt-2 font-semibold text-green-900">Ready to Book?</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Schedule a consultation with {practitioner.user.firstName}
                  </p>
                  <Link href="/search">
                    <Button className="mt-4 w-full">
                      Book Appointment
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Verification */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Shield
                      className={`h-6 w-6 ${
                        practitioner.hpczVerified
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">Verification</p>
                      <p className="text-sm text-gray-500">
                        {practitioner.hpczVerified
                          ? 'HPCZ Verified Practitioner'
                          : 'Verification pending'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {practitioner.user.phone && (
                    <a
                      href={`tel:${practitioner.user.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-700"
                    >
                      <Phone className="h-4 w-4 text-gray-400" />
                      {practitioner.user.phone}
                    </a>
                  )}
                  {practitioner.user.email && (
                    <a
                      href={`mailto:${practitioner.user.email}`}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-700 break-all"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      {practitioner.user.email}
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Operating Centers */}
              {practitioner.offersClinicVisits &&
                practitioner.operatingCenters &&
                practitioner.operatingCenters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {practitioner.operatingCenters.length === 1
                        ? 'Operating Center'
                        : 'Operating Centers'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {practitioner.operatingCenters.map((center) => (
                      <div key={center.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">{center.name}</p>
                            <p>{center.address}</p>
                            <p>{center.city}</p>
                          </div>
                        </div>
                        {center.phone && (
                          <a
                            href={`tel:${center.phone}`}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-700"
                          >
                            <Phone className="h-4 w-4 text-gray-400" />
                            {center.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Fallback: legacy single operating center */}
              {practitioner.offersClinicVisits &&
                (!practitioner.operatingCenters || practitioner.operatingCenters.length === 0) &&
                practitioner.operatingCenterName && (
                <Card>
                  <CardHeader>
                    <CardTitle>Operating Center</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">{practitioner.operatingCenterName}</p>
                        {practitioner.operatingCenterAddress && (
                          <p>{practitioner.operatingCenterAddress}</p>
                        )}
                        {practitioner.operatingCenterCity && (
                          <p>{practitioner.operatingCenterCity}</p>
                        )}
                      </div>
                    </div>
                    {practitioner.operatingCenterPhone && (
                      <a
                        href={`tel:${practitioner.operatingCenterPhone}`}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-700"
                      >
                        <Phone className="h-4 w-4 text-gray-400" />
                        {practitioner.operatingCenterPhone}
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Emergency Call Banner */}
              <EmergencyCallBanner />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

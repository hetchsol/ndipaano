'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { practitionersAPI } from '../../../../lib/api';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import { Header } from '../../../../components/layout/header';
import { Footer } from '../../../../components/layout/footer';
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
} from 'lucide-react';

interface PractitionerProfile {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  bio?: string;
  rating: number;
  totalReviews: number;
  consultationFee: number;
  isAvailable: boolean;
  avatar?: string;
  location: string;
  specializations?: string[];
  verificationStatus: string;
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

export default function PractitionerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const practitionerId = params.id as string;
  const [practitioner, setPractitioner] = useState<PractitionerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            reviews = reviewsRes.value.data.data?.reviews || [];
          }
          setPractitioner({ ...profile, reviews });
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
                    Dr. {practitioner.firstName} {practitioner.lastName}
                  </h1>
                  <p className="text-green-100 capitalize">
                    {practitioner.type.replace('_', ' ')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <div className="flex items-center gap-1">
                      {renderStars(practitioner.rating)}
                      <span className="ml-1 text-sm text-white">
                        {practitioner.rating.toFixed(1)} ({practitioner.totalReviews} reviews)
                      </span>
                    </div>
                    {practitioner.verificationStatus === 'verified' && (
                      <Badge className="bg-white/20 text-white">
                        <Shield className="mr-1 h-3 w-3" />
                        HPCZ Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="sm:ml-auto text-center sm:text-right">
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(practitioner.consultationFee)}
                  </p>
                  <p className="text-xs text-green-200">per consultation</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {practitioner.location || 'Lusaka, Zambia'}
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

              {/* Reviews Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Patient Reviews</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-bold text-gray-900">
                      {practitioner.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({practitioner.totalReviews} reviews)
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
                    Schedule a consultation with Dr. {practitioner.firstName}
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
                        practitioner.verificationStatus === 'verified'
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">Verification</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {practitioner.verificationStatus === 'verified'
                          ? 'HPCZ Verified Practitioner'
                          : 'Verification pending'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-400 mb-3">
                    Contact details are shared after booking confirmation for patient privacy.
                  </p>
                  <Link href="/search">
                    <Button variant="outline" className="w-full">
                      Book to Contact
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

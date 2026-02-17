'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { practitionersAPI } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { Header } from '../../../components/layout/header';
import { Footer } from '../../../components/layout/footer';
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
} from 'lucide-react';

interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  specializations?: string[];
  rating: number;
  totalReviews: number;
  consultationFee: number;
  isAvailable: boolean;
  avatar?: string;
  location: string;
  distance?: number;
}

const practitionerTypes = [
  { value: '', label: 'All Types' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'midwife', label: 'Midwife' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'clinical_officer', label: 'Clinical Officer' },
  { value: 'counselor', label: 'Mental Health Counselor' },
  { value: 'dentist', label: 'Dentist' },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [type, setType] = useState(searchParams.get('type') || '');
  const [distance, setDistance] = useState('25');
  const [minRating, setMinRating] = useState('');

  useEffect(() => {
    fetchPractitioners();
  }, []);

  async function fetchPractitioners() {
    setIsLoading(true);
    try {
      const response = await practitionersAPI.search({
        type: type || undefined,
        rating: minRating ? parseInt(minRating) : undefined,
        available: true,
        limit: 24,
      });
      setPractitioners(response.data.data?.practitioners || []);
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Type Dropdown */}
                <Select
                  label="Practitioner Type"
                  options={practitionerTypes}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />

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

        {/* Results Grid */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
              {practitioners.map((practitioner) => (
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
                          Dr. {practitioner.firstName} {practitioner.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {practitioner.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="mt-3 flex items-center gap-1">
                      {renderStars(practitioner.rating)}
                      <span className="ml-1 text-sm font-medium text-gray-700">
                        {practitioner.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({practitioner.totalReviews})
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

                    {/* Fee and Distance */}
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div>
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency(practitioner.consultationFee)}
                        </p>
                        <p className="text-xs text-gray-400">per consultation</p>
                      </div>
                      {practitioner.distance !== undefined && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-4 w-4" />
                          {practitioner.distance.toFixed(1)} km
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
              ))}
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

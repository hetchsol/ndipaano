'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingsAPI } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CalendarDays,
  Clock,
  MapPin,
  Video,
  ArrowRight,
  Search,
  Stethoscope,
} from 'lucide-react';

interface Booking {
  id: string;
  practitioner: {
    firstName: string;
    lastName: string;
    type: string;
    avatar?: string;
  };
  dateTime: string;
  type: 'home_visit' | 'virtual';
  status: string;
  address?: string;
  consultationFee: number;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setIsLoading(true);
    try {
      const response = await bookingsAPI.list({ limit: 50 });
      setBookings(response.data.data?.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    switch (activeTab) {
      case 'upcoming':
        return ['confirmed', 'pending', 'in-progress'].includes(booking.status);
      case 'past':
        return booking.status === 'completed';
      case 'cancelled':
        return booking.status === 'cancelled';
      default:
        return true;
    }
  });

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Link href={`/patient/bookings/${booking.id}`}>
      <Card className="cursor-pointer transition-all hover:border-primary-200 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                {booking.type === 'virtual' ? (
                  <Video className="h-5 w-5 text-primary-700" />
                ) : (
                  <MapPin className="h-5 w-5 text-primary-700" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Dr. {booking.practitioner.firstName} {booking.practitioner.lastName}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {booking.practitioner.type?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {formatDate(booking.dateTime)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDate(booking.dateTime, 'time')}
            </span>
            <span className="flex items-center gap-1 capitalize">
              {booking.type === 'virtual' ? (
                <Video className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {booking.type.replace('_', ' ')}
            </span>
          </div>

          {booking.address && (
            <p className="mt-2 text-sm text-gray-400">{booking.address}</p>
          )}

          <div className="mt-3 flex items-center justify-end">
            <Button variant="ghost" size="sm">
              View Details <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your appointments and consultations.
          </p>
        </div>
        <Link href="/search">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        {['upcoming', 'past', 'cancelled'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : filteredBookings.length > 0 ? (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Stethoscope className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No {tab} bookings
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {tab === 'upcoming'
                    ? 'Book a consultation with a practitioner to get started.'
                    : tab === 'past'
                    ? 'Your completed appointments will appear here.'
                    : 'Cancelled appointments will appear here.'}
                </p>
                {tab === 'upcoming' && (
                  <Link href="/search">
                    <Button className="mt-4">Find Practitioners</Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

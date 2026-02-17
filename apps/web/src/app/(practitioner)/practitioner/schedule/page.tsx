'use client';

import React, { useEffect, useState } from 'react';
import { bookingsAPI } from '../../../../lib/api';
import { formatDate, formatCurrency, getStatusColor } from '../../../../lib/utils';
import { Card, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { toast } from 'sonner';
import {
  CalendarDays,
  Clock,
  MapPin,
  Video,
  User,
  CheckCircle,
  XCircle,
  Play,
  Phone,
} from 'lucide-react';

interface Booking {
  id: string;
  patient: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  dateTime: string;
  type: 'home_visit' | 'virtual';
  status: string;
  address?: string;
  notes?: string;
  symptoms?: string[];
  consultationFee: number;
}

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setIsLoading(true);
    try {
      const response = await bookingsAPI.list({ role: 'practitioner', limit: 100 });
      setBookings(response.data.data?.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    try {
      await bookingsAPI.updateStatus(id, status);
      toast.success(`Booking ${status === 'confirmed' ? 'accepted' : status} successfully.`);
      fetchBookings();
    } catch {
      toast.error('Failed to update booking status.');
    }
  }

  const today = new Date();
  const todayStr = today.toDateString();

  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.dateTime);
    switch (activeTab) {
      case 'upcoming':
        return (
          bookingDate >= today &&
          bookingDate.toDateString() !== todayStr &&
          booking.status !== 'cancelled' &&
          booking.status !== 'completed'
        );
      case 'today':
        return bookingDate.toDateString() === todayStr && booking.status !== 'cancelled';
      case 'past':
        return booking.status === 'completed' || (bookingDate < today && bookingDate.toDateString() !== todayStr);
      default:
        return true;
    }
  });

  const renderActionButtons = (booking: Booking) => {
    switch (booking.status) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleStatusUpdate(booking.id, 'confirmed')}>
              <CheckCircle className="mr-1 h-3 w-3" /> Accept
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(booking.id, 'cancelled')}>
              <XCircle className="mr-1 h-3 w-3" /> Reject
            </Button>
          </div>
        );
      case 'confirmed':
        return (
          <Button size="sm" onClick={() => handleStatusUpdate(booking.id, 'in-progress')}>
            <Play className="mr-1 h-3 w-3" /> Start Consultation
          </Button>
        );
      case 'in-progress':
        return (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleStatusUpdate(booking.id, 'completed')}>
              <CheckCircle className="mr-1 h-3 w-3" /> Complete
            </Button>
            {booking.type === 'virtual' && (
              <Button size="sm" variant="outline">
                <Phone className="mr-1 h-3 w-3" /> Call Patient
              </Button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your appointments and booking requests.
        </p>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">
            Today
            {bookings.filter((b) => new Date(b.dateTime).toDateString() === todayStr && b.status !== 'cancelled').length > 0 && (
              <span className="ml-1.5 rounded-full bg-green-700 px-1.5 py-0.5 text-xs text-white">
                {bookings.filter((b) => new Date(b.dateTime).toDateString() === todayStr && b.status !== 'cancelled').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        {['upcoming', 'today', 'past'].map((tab) => (
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
                  <Card key={booking.id} className="transition-all hover:border-green-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                            <User className="h-6 w-6 text-green-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {booking.patient.firstName} {booking.patient.lastName}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
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
                            {booking.patient.phone && (
                              <p className="mt-1 text-xs text-gray-400">
                                <Phone className="mr-1 inline h-3 w-3" />
                                {booking.patient.phone}
                              </p>
                            )}
                            {booking.symptoms && booking.symptoms.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {booking.symptoms.map((s) => (
                                  <Badge key={s} variant="outline" size="sm">{s}</Badge>
                                ))}
                              </div>
                            )}
                            {booking.notes && (
                              <p className="mt-2 text-xs text-gray-400">Note: {booking.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                          <p className="mt-2 text-sm font-semibold text-gray-900">
                            {formatCurrency(booking.consultationFee)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      {renderActionButtons(booking) && (
                        <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
                          {renderActionButtons(booking)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <CalendarDays className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No {tab === 'today' ? "today's" : tab} appointments
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {tab === 'upcoming'
                    ? 'No upcoming appointments scheduled.'
                    : tab === 'today'
                    ? 'No appointments scheduled for today.'
                    : 'No past appointments found.'}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { bookingsAPI } from '../../../../lib/api';
import { formatDate, formatCurrency, getStatusColor } from '../../../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '../../../../components/ui/dialog';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Video,
  Phone,
  Star,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Circle,
  XCircle,
  Navigation,
  Truck,
} from 'lucide-react';

interface BookingDetail {
  id: string;
  practitioner: {
    id: string;
    firstName: string;
    lastName: string;
    type: string;
    phone: string;
    email: string;
    avatar?: string;
    rating: number;
    totalReviews: number;
  };
  dateTime: string;
  type: 'home_visit' | 'virtual';
  status: string;
  address?: string;
  notes?: string;
  symptoms?: string[];
  consultationFee: number;
  createdAt: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

const TIMELINE_STEPS = [
  { key: 'requested', label: 'Requested', icon: Circle },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle },
  { key: 'en_route', label: 'En Route', icon: Truck },
  { key: 'in_progress', label: 'In Progress', icon: Clock },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

function getTimelineIndex(status: string): number {
  const mapping: Record<string, number> = {
    pending: 0,
    requested: 0,
    confirmed: 1,
    accepted: 1,
    en_route: 2,
    'en-route': 2,
    'in-progress': 3,
    in_progress: 3,
    completed: 4,
    cancelled: -1,
  };
  return mapping[status.toLowerCase()] ?? 0;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const response = await bookingsAPI.getById(bookingId);
        setBooking(response.data.data);
      } catch {
        toast.error('Failed to load booking details.');
      } finally {
        setIsLoading(false);
      }
    }
    if (bookingId) fetchBooking();
  }, [bookingId]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await bookingsAPI.cancel(bookingId, cancelReason);
      toast.success('Booking cancelled successfully.');
      setShowCancelDialog(false);
      router.push('/bookings');
    } catch {
      toast.error('Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
          </div>
          <div className="h-80 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Booking Not Found</h2>
        <p className="mt-2 text-sm text-gray-500">
          The booking you are looking for does not exist or you do not have access.
        </p>
        <Button onClick={() => router.push('/bookings')} className="mt-4">
          Back to Bookings
        </Button>
      </div>
    );
  }

  const canCancel = ['pending', 'confirmed', 'requested', 'accepted'].includes(booking.status);
  const canTrack = ['en_route', 'en-route', 'in-progress', 'in_progress'].includes(booking.status);
  const isCancelled = booking.status === 'cancelled';
  const currentStepIndex = getTimelineIndex(booking.status);

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
          <p className="mt-1 text-sm text-gray-500">Booking #{booking.id.slice(0, 8)}</p>
        </div>
        <Badge className={getStatusColor(booking.status)} size="md">
          {booking.status}
        </Badge>
      </div>

      {/* Status Timeline Progression */}
      {!isCancelled && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                          isCurrent
                            ? 'border-green-700 bg-green-700 text-white'
                            : isActive
                            ? 'border-green-700 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-400'
                        }`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium ${
                          isCurrent
                            ? 'text-green-700'
                            : isActive
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 ${
                          index < currentStepIndex ? 'bg-green-700' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">This booking has been cancelled</p>
              <p className="text-sm text-red-600">
                Cancelled on {formatDate(booking.statusHistory?.find(s => s.status === 'cancelled')?.timestamp || booking.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Info */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(booking.dateTime, 'long')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">{formatDate(booking.dateTime, 'time')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {booking.type === 'virtual' ? (
                    <Video className="h-5 w-5 text-gray-400" />
                  ) : (
                    <MapPin className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Service Type</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {booking.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Consultation Fee</p>
                    <p className="font-medium text-gray-900">{formatCurrency(booking.consultationFee)}</p>
                  </div>
                </div>
              </div>

              {booking.address && (
                <div className="mt-4 rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Address</p>
                  <p className="mt-1 text-sm text-gray-700">{booking.address}</p>
                </div>
              )}

              {booking.notes && (
                <div className="mt-4 rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Notes</p>
                  <p className="mt-1 text-sm text-gray-700">{booking.notes}</p>
                </div>
              )}

              {booking.symptoms && booking.symptoms.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500">Reported Symptoms</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {booking.symptoms.map((symptom) => (
                      <Badge key={symptom} variant="outline">
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-3">
              {canCancel && (
                <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                  Cancel Booking
                </Button>
              )}
              {canTrack && (
                <Button variant="outline">
                  <Navigation className="mr-2 h-4 w-4" />
                  Track Location
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Map placeholder for tracking */}
          {canTrack && booking.type === 'home_visit' && (
            <Card>
              <CardHeader>
                <CardTitle>Live Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-72 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="text-center">
                    <MapPin className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-500">
                      Real-time tracking map
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Practitioner location will be displayed here during the visit
                    </p>
                    <Button variant="outline" size="sm" className="mt-4">
                      <Navigation className="mr-2 h-4 w-4" />
                      Open in Maps
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(booking.statusHistory && booking.statusHistory.length > 0
                  ? booking.statusHistory
                  : [{ status: 'pending', timestamp: booking.createdAt, note: 'Booking created' }]
                ).map((entry, index, arr) => {
                  const isCompleted = entry.status === 'completed';
                  const isCancelledEntry = entry.status === 'cancelled';

                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isCompleted
                              ? 'bg-green-100 text-green-600'
                              : isCancelledEntry
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : isCancelledEntry ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </div>
                        {index < arr.length - 1 && (
                          <div className="mt-1 h-full w-px bg-gray-200" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium capitalize text-gray-900">
                          {entry.status.replace(/[-_]/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(entry.timestamp)} at {formatDate(entry.timestamp, 'time')}
                        </p>
                        {entry.note && (
                          <p className="mt-1 text-xs text-gray-400">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Practitioner Info Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Practitioner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <User className="h-10 w-10 text-green-700" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">
                  Dr. {booking.practitioner.firstName} {booking.practitioner.lastName}
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {booking.practitioner.type?.replace('_', ' ')}
                </p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {booking.practitioner.rating?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({booking.practitioner.totalReviews || 0} reviews)
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {booking.practitioner.phone || 'Not available'}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {booking.practitioner.email || 'Not available'}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/practitioners/${booking.practitioner.id}`)}
                >
                  View Full Profile
                </Button>
                {canTrack && (
                  <Button variant="primary" className="w-full">
                    <Phone className="mr-2 h-4 w-4" />
                    Call Practitioner
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogClose onClose={() => setShowCancelDialog(false)} />
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Reason for cancellation (optional)
          </label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Please let us know why you are cancelling..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
            Keep Booking
          </Button>
          <Button variant="destructive" onClick={handleCancel} isLoading={isCancelling}>
            Cancel Booking
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

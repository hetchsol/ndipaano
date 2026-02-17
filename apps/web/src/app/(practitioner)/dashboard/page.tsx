'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import { bookingsAPI, paymentsAPI } from '../../../lib/api';
import { formatDate, formatCurrency, getStatusColor } from '../../../lib/utils';
import { toast } from 'sonner';
import {
  CalendarDays,
  Clock,
  DollarSign,
  Star,
  Users,
  CheckCircle,
  XCircle,
  ArrowRight,
  MapPin,
  Video,
  Stethoscope,
} from 'lucide-react';

interface Booking {
  id: string;
  patient: { firstName: string; lastName: string; phone: string };
  dateTime: string;
  type: 'home_visit' | 'virtual';
  status: string;
  address?: string;
  notes?: string;
  symptoms?: string[];
  consultationFee: number;
}

interface DashboardStats {
  todayAppointments: number;
  pendingRequests: number;
  monthRevenue: number;
  rating: number;
}

export default function PractitionerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingRequests: 0,
    monthRevenue: 0,
    rating: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [bookingsRes, earningsRes] = await Promise.allSettled([
        bookingsAPI.list({ role: 'practitioner', limit: 50 }),
        paymentsAPI.getEarnings({ period: 'month' }),
      ]);

      let allBookings: Booking[] = [];
      if (bookingsRes.status === 'fulfilled') {
        allBookings = bookingsRes.value.data.data?.bookings || [];
        setBookings(allBookings);
      }

      const today = new Date().toDateString();
      const todayBookings = allBookings.filter(
        (b) => new Date(b.dateTime).toDateString() === today && b.status !== 'cancelled'
      );
      const pending = allBookings.filter((b) => b.status === 'pending');

      let monthRevenue = 0;
      if (earningsRes.status === 'fulfilled') {
        monthRevenue = earningsRes.value.data.data?.earnings?.thisMonth || 0;
      }

      setStats({
        todayAppointments: todayBookings.length,
        pendingRequests: pending.length,
        monthRevenue,
        rating: user?.practitionerProfile?.rating || 0,
      });
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAccept(id: string) {
    try {
      await bookingsAPI.updateStatus(id, 'confirmed');
      toast.success('Booking accepted.');
      fetchData();
    } catch {
      toast.error('Failed to accept booking.');
    }
  }

  async function handleReject(id: string) {
    try {
      await bookingsAPI.updateStatus(id, 'cancelled');
      toast.success('Booking rejected.');
      fetchData();
    } catch {
      toast.error('Failed to reject booking.');
    }
  }

  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const today = new Date().toDateString();
  const todaySchedule = bookings
    .filter((b) => new Date(b.dateTime).toDateString() === today && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const statCards = [
    {
      label: "Today's Appointments",
      value: stats.todayAppointments.toString(),
      icon: CalendarDays,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests.toString(),
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'This Month Revenue',
      value: formatCurrency(stats.monthRevenue),
      icon: DollarSign,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Rating',
      value: (user?.practitionerProfile?.rating || 0).toFixed(1),
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: `${user?.practitionerProfile?.totalReviews || 0} reviews`,
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, Dr. {user?.firstName || 'Practitioner'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here is your practice overview for today.
        </p>
        {user?.practitionerProfile?.verificationStatus === 'pending' && (
          <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">
              Your credentials are being verified. Some features may be limited until verification
              is complete.
            </p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
              {stat.subtitle && (
                <p className="text-xs text-gray-400">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Booking Requests Table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Pending Booking Requests
            {pendingRequests.length > 0 && (
              <Badge variant="warning" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <Link href="/schedule">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-gray-100" />
              ))}
            </div>
          ) : pendingRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Symptoms</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium text-gray-900">
                      {req.patient.firstName} {req.patient.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(req.dateTime)} at {formatDate(req.dateTime, 'time')}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm capitalize text-gray-600">
                        {req.type === 'virtual' ? (
                          <Video className="h-3 w-3" />
                        ) : (
                          <MapPin className="h-3 w-3" />
                        )}
                        {req.type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(req.symptoms || []).slice(0, 2).map((s) => (
                          <Badge key={s} variant="outline" size="sm">{s}</Badge>
                        ))}
                        {(req.symptoms || []).length > 2 && (
                          <Badge variant="outline" size="sm">+{req.symptoms!.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {formatCurrency(req.consultationFee)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAccept(req.id)}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <Stethoscope className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No pending booking requests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Schedule Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Today&apos;s Schedule</CardTitle>
          <Link href="/schedule">
            <Button variant="ghost" size="sm">
              Full Schedule <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-md bg-gray-100" />
              ))}
            </div>
          ) : todaySchedule.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 h-full w-px bg-gray-200" />

              <div className="space-y-6">
                {todaySchedule.map((apt, index) => {
                  const isPast = new Date(apt.dateTime) < new Date();
                  const isInProgress = apt.status === 'in-progress';

                  return (
                    <div key={apt.id} className="relative flex gap-4 pl-2">
                      {/* Timeline dot */}
                      <div
                        className={`relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          isInProgress
                            ? 'border-green-700 bg-green-700'
                            : isPast
                            ? 'border-gray-300 bg-gray-100'
                            : 'border-sky-500 bg-sky-50'
                        }`}
                      >
                        <Clock
                          className={`h-3 w-3 ${
                            isInProgress ? 'text-white' : isPast ? 'text-gray-400' : 'text-sky-600'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div
                        className={`flex-1 rounded-lg border p-4 ${
                          isInProgress
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {formatDate(apt.dateTime, 'time')}
                            </p>
                            <p className="mt-1 font-medium text-gray-800">
                              {apt.patient.firstName} {apt.patient.lastName}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1 capitalize">
                                {apt.type === 'virtual' ? (
                                  <Video className="h-3 w-3" />
                                ) : (
                                  <MapPin className="h-3 w-3" />
                                )}
                                {apt.type.replace('_', ' ')}
                              </span>
                              {apt.address && (
                                <span className="text-gray-400 truncate max-w-[200px]">
                                  {apt.address}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No appointments scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

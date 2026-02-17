'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bookingsAPI, medicalRecordsAPI } from '@/lib/api';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
import {
  CalendarDays,
  FileText,
  Pill,
  Search,
  Clock,
  MapPin,
  Video,
  Bell,
  ArrowRight,
  Stethoscope,
} from 'lucide-react';

interface Booking {
  id: string;
  practitioner: { firstName: string; lastName: string; type: string };
  dateTime: string;
  type: 'home_visit' | 'virtual';
  status: string;
  address?: string;
}

interface MedicalRecord {
  id: string;
  type: string;
  title: string;
  practitioner: { firstName: string; lastName: string };
  createdAt: string;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [recentRecords, setRecentRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, recordsRes] = await Promise.allSettled([
          bookingsAPI.list({ status: 'confirmed', limit: 3 }),
          medicalRecordsAPI.list({ limit: 3 }),
        ]);
        if (bookingsRes.status === 'fulfilled') {
          setUpcomingBookings(bookingsRes.value.data.data?.bookings || []);
        }
        if (recordsRes.status === 'fulfilled') {
          setRecentRecords(recordsRes.value.data.data?.records || []);
        }
      } catch {
        // Use empty state
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const quickActions = [
    {
      icon: Search,
      label: 'Book Appointment',
      description: 'Find and book a practitioner',
      href: '/search',
      color: 'bg-primary-50 text-primary-700',
    },
    {
      icon: FileText,
      label: 'Medical Records',
      description: 'View your health records',
      href: '/patient/records',
      color: 'bg-accent-50 text-accent-600',
    },
    {
      icon: Pill,
      label: 'Prescriptions',
      description: 'View active prescriptions',
      href: '/patient/prescriptions',
      color: 'bg-secondary-50 text-secondary-700',
    },
    {
      icon: CalendarDays,
      label: 'My Bookings',
      description: 'Manage your appointments',
      href: '/patient/bookings',
      color: 'bg-purple-50 text-purple-700',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'Patient'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here is an overview of your healthcare activity.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="h-full cursor-pointer transition-all hover:border-primary-200 hover:shadow-md">
              <CardContent className="flex flex-col items-center p-4 text-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{action.label}</h3>
                <p className="mt-1 text-xs text-gray-500">{action.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Appointments</CardTitle>
              <Link href="/patient/bookings">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
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
              ) : upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <Link key={booking.id} href={`/patient/bookings/${booking.id}`}>
                      <div className="flex items-center gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                          {booking.type === 'virtual' ? (
                            <Video className="h-5 w-5 text-primary-700" />
                          ) : (
                            <MapPin className="h-5 w-5 text-primary-700" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            Dr. {booking.practitioner.firstName} {booking.practitioner.lastName}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {booking.practitioner.type?.replace('_', ' ')}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(booking.dateTime)} at {formatDate(booking.dateTime, 'time')}
                            </span>
                            <span className="capitalize">
                              {booking.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Stethoscope className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-500">No upcoming appointments</p>
                  <Link href="/search">
                    <Button size="sm" className="mt-3">
                      Book an Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Medical Records */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Medical Records</CardTitle>
              <Link href="/patient/records">
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
              ) : recentRecords.length > 0 ? (
                <div className="space-y-3">
                  {recentRecords.map((record) => (
                    <Link key={record.id} href={`/patient/records`}>
                      <div className="flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-gray-50">
                        <FileText className="h-5 w-5 text-accent-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{record.title}</p>
                          <p className="text-xs text-gray-500">
                            Dr. {record.practitioner.firstName} {record.practitioner.lastName} -{' '}
                            {formatDate(record.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline" size="sm">
                          {record.type}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <FileText className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No medical records yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications Sidebar */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </span>
              </CardTitle>
              {unreadCount > 0 && (
                <Badge variant="error">{unreadCount} new</Badge>
              )}
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-md border p-3 text-sm ${
                        notification.read
                          ? 'border-gray-100 bg-white'
                          : 'border-primary-100 bg-primary-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{notification.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{notification.message}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Bell className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No notifications</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Tip Card */}
          <Card className="mt-6 border-secondary-200 bg-secondary-50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary-700">
                Health Tip
              </p>
              <p className="mt-2 text-sm text-secondary-900">
                Regular health checkups can detect potential issues early. Consider
                booking a routine consultation every 6 months.
              </p>
              <Link href="/search">
                <Button size="sm" variant="secondary" className="mt-3">
                  Book Checkup
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

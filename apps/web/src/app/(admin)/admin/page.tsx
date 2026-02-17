'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../../../lib/utils';
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
import {
  Users,
  Stethoscope,
  ShieldCheck,
  DollarSign,
  ArrowRight,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalPractitioners: number;
  pendingVerifications: number;
  monthlyRevenue: number;
  recentRegistrations: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPractitioners: 0,
    pendingVerifications: 0,
    monthlyRevenue: 0,
    recentRegistrations: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await adminAPI.getDashboard();
        const data = response.data.data;
        setStats({
          totalUsers: data?.totalUsers || 0,
          totalPractitioners: data?.totalPractitioners || 0,
          pendingVerifications: data?.pendingVerifications || 0,
          monthlyRevenue: data?.monthlyRevenue || 0,
          recentRegistrations: data?.recentRegistrations || [],
        });
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      href: '/admin/users',
    },
    {
      label: 'Total Practitioners',
      value: stats.totalPractitioners.toLocaleString(),
      icon: Stethoscope,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      href: '/admin/users',
    },
    {
      label: 'Pending Verifications',
      value: stats.pendingVerifications.toLocaleString(),
      icon: ShieldCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      href: '/admin/verifications',
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/admin',
    },
  ];

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="error">Admin</Badge>;
      case 'practitioner':
        return <Badge variant="info">Practitioner</Badge>;
      default:
        return <Badge>Patient</Badge>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and management.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="cursor-pointer transition-all hover:border-green-200 hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stat.value}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Registrations Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Registrations</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : stats.recentRegistrations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentRegistrations.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                        <TableCell>{roleBadge(user.role)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No recent registrations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart Placeholder */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Revenue Overview
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-500">Revenue Chart</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Monthly revenue visualization will be displayed here
                  </p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-md bg-green-50 p-3">
                  <span className="text-sm text-green-700">This Month</span>
                  <span className="text-sm font-bold text-green-700">
                    {formatCurrency(stats.monthlyRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="text-sm font-bold text-gray-900">
                    {stats.totalUsers.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">Practitioners</span>
                  <span className="text-sm font-bold text-gray-900">
                    {stats.totalPractitioners.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

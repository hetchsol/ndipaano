'use client';

import React, { useEffect, useState } from 'react';
import { paymentsAPI } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
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
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  Banknote,
  ArrowUpRight,
} from 'lucide-react';

interface EarningRecord {
  id: string;
  date: string;
  patient: { firstName: string; lastName: string };
  service: string;
  amount: number;
  commission: number;
  payout: number;
  status: 'paid' | 'pending' | 'processing';
  createdAt: string;
}

interface EarningsStats {
  totalEarnings: number;
  commission: number;
  netPayout: number;
  pendingPayout: number;
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    commission: 0,
    netPayout: 0,
    pendingPayout: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('mobile_money');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [earningsRes, paymentsRes] = await Promise.allSettled([
        paymentsAPI.getEarnings({ period: 'month' }),
        paymentsAPI.list({ limit: 50 }),
      ]);

      if (earningsRes.status === 'fulfilled') {
        const data = earningsRes.value.data.data;
        setStats({
          totalEarnings: data?.earnings?.total || data?.earnings?.thisMonth || 0,
          commission: data?.commission || 0,
          netPayout: data?.netPayout || 0,
          pendingPayout: data?.pendingPayout || data?.earnings?.pending || 0,
        });
      }

      if (paymentsRes.status === 'fulfilled') {
        setEarnings(paymentsRes.value.data.data?.payments || []);
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePayoutRequest() {
    if (!payoutAmount || !payoutAccount) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    setIsRequesting(true);
    try {
      await paymentsAPI.requestPayout({
        amount: parseFloat(payoutAmount),
        method: payoutMethod,
        accountDetails: { accountNumber: payoutAccount },
      });
      toast.success('Payout request submitted. It will be processed within 24-48 hours.');
      setShowPayoutDialog(false);
      setPayoutAmount('');
      setPayoutAccount('');
      fetchData();
    } catch {
      toast.error('Failed to request payout. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
      paid: 'success',
      completed: 'success',
      pending: 'warning',
      processing: 'info',
      failed: 'error',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const statCards = [
    {
      label: 'Total Earnings (ZMW)',
      value: formatCurrency(stats.totalEarnings),
      icon: DollarSign,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Commission (ZMW)',
      value: formatCurrency(stats.commission),
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Net Payout (ZMW)',
      value: formatCurrency(stats.netPayout),
      icon: Wallet,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Pending Payout (ZMW)',
      value: formatCurrency(stats.pendingPayout),
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your revenue, commission, and payouts.
          </p>
        </div>
        <Button onClick={() => setShowPayoutDialog(true)}>
          <Banknote className="mr-2 h-4 w-4" />
          Request Payout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{isLoading ? '...' : stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : earnings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount (ZMW)</TableHead>
                  <TableHead>Commission (ZMW)</TableHead>
                  <TableHead>Payout (ZMW)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(record.date || record.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {record.patient.firstName} {record.patient.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 capitalize">
                      {(record.service || 'consultation').replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {formatCurrency(record.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-red-600">
                      -{formatCurrency(record.commission || record.amount * 0.15)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-green-700">
                      {formatCurrency(record.payout || record.amount * 0.85)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(record.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No earnings records yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Earnings will appear here once you complete consultations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Dialog */}
      <Dialog open={showPayoutDialog} onClose={() => setShowPayoutDialog(false)}>
        <DialogClose onClose={() => setShowPayoutDialog(false)} />
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <DialogDescription>
            Available balance: {formatCurrency(stats.pendingPayout)}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <Input
            label="Amount (ZMW)"
            type="number"
            placeholder="0.00"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
          />
          <Select
            label="Payout Method"
            options={[
              { value: 'mobile_money', label: 'Mobile Money' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
            ]}
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value)}
          />
          <Input
            label={payoutMethod === 'mobile_money' ? 'Mobile Number' : 'Bank Account Number'}
            placeholder={
              payoutMethod === 'mobile_money'
                ? '+260 97X XXX XXX'
                : 'Enter account number'
            }
            value={payoutAccount}
            onChange={(e) => setPayoutAccount(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handlePayoutRequest} isLoading={isRequesting}>
            Request Payout
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

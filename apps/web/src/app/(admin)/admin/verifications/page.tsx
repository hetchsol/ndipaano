'use client';

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../../../lib/api';
import { formatDate } from '../../../../lib/utils';
import { Card, CardContent } from '../../../../components/ui/card';
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
import { toast } from 'sonner';
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  User,
  Clock,
  Award,
} from 'lucide-react';

interface Verification {
  id: string;
  practitioner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    type: string;
    licenseNumber: string;
  };
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    uploadedAt: string;
    url: string;
    status: 'pending' | 'verified' | 'rejected';
  }>;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter]);

  async function fetchVerifications() {
    setIsLoading(true);
    try {
      const response = await adminAPI.getVerifications({
        status: statusFilter || undefined,
        limit: 50,
      });
      setVerifications(response.data.data?.verifications || []);
    } catch {
      setVerifications([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(verification: Verification) {
    setIsSubmitting(true);
    try {
      await adminAPI.reviewVerification(verification.id, { status: 'approved' });
      toast.success(
        `Dr. ${verification.practitioner.firstName} ${verification.practitioner.lastName} has been approved.`
      );
      fetchVerifications();
    } catch {
      toast.error('Failed to approve verification.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!selectedVerification) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      await adminAPI.reviewVerification(selectedVerification.id, {
        status: 'rejected',
        notes: rejectionReason,
      });
      toast.success('Verification rejected.');
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedVerification(null);
      fetchVerifications();
    } catch {
      toast.error('Failed to reject verification.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success" size="sm"><CheckCircle className="mr-1 h-3 w-3" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="error" size="sm"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="warning" size="sm"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and verify practitioner credentials and documents.
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        {['pending', 'approved', 'rejected', ''].map((status) => (
          <Button
            key={status || 'all'}
            variant={statusFilter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
          </Button>
        ))}
      </div>

      {/* Verification Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : verifications.length > 0 ? (
        <div className="space-y-4">
          {verifications.map((verification) => (
            <Card
              key={verification.id}
              className={`transition-all ${
                verification.status === 'pending' ? 'border-amber-200' : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                      <User className="h-7 w-7 text-green-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Dr. {verification.practitioner.firstName}{' '}
                        {verification.practitioner.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {verification.practitioner.type.replace('_', ' ')}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          HPCZ: {verification.practitioner.licenseNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Submitted: {formatDate(verification.submittedAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {verification.practitioner.email} | {verification.practitioner.phone}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      verification.status === 'pending'
                        ? 'warning'
                        : verification.status === 'approved'
                        ? 'success'
                        : 'error'
                    }
                    size="md"
                  >
                    {verification.status}
                  </Badge>
                </div>

                {/* Documents */}
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Documents
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {verification.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700 capitalize">
                              {doc.type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-400">{doc.fileName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getDocStatusBadge(doc.status)}
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {verification.documents.length === 0 && (
                    <p className="text-sm text-gray-400">No documents uploaded yet.</p>
                  )}
                </div>

                {verification.reviewNotes && (
                  <div className="mt-4 rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Review Notes</p>
                    <p className="mt-1 text-sm text-gray-700">{verification.reviewNotes}</p>
                  </div>
                )}

                {/* Actions */}
                {verification.status === 'pending' && (
                  <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedVerification(verification);
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(verification)}
                      isLoading={isSubmitting}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <ShieldCheck className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No {statusFilter || ''} verifications
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {statusFilter === 'pending'
              ? 'No practitioners are currently awaiting verification.'
              : 'No verification records found with this filter.'}
          </p>
        </div>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)}>
        <DialogClose onClose={() => setShowRejectDialog(false)} />
        <DialogHeader>
          <DialogTitle>Reject Verification</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting Dr. {selectedVerification?.practitioner.firstName}{' '}
            {selectedVerification?.practitioner.lastName}&apos;s verification.
            This will be communicated to the practitioner.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Rejection Reason
          </label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why the verification is being rejected..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            isLoading={isSubmitting}
            disabled={!rejectionReason.trim()}
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

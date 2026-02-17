'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { practitionersAPI, usersAPI } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Select } from '../../../components/ui/select';
import { toast } from 'sonner';
import {
  User,
  Upload,
  FileCheck,
  Shield,
  Star,
  Phone,
  Mail,
  Award,
  Save,
  X,
  Plus,
  MapPin,
  ToggleLeft,
  ToggleRight,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface DocumentItem {
  id: string;
  type: string;
  fileName: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
}

export default function PractitionerProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  // Profile form
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [newSpec, setNewSpec] = useState('');
  const [serviceRadius, setServiceRadius] = useState('10');
  const [consultationFee, setConsultationFee] = useState(
    user?.practitionerProfile?.consultationFee?.toString() || ''
  );

  // Document upload
  const [docType, setDocType] = useState('hpcz_license');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('bio', bio);
      formData.append('specializations', JSON.stringify(specializations));
      formData.append('serviceRadius', serviceRadius);
      formData.append('consultationFee', consultationFee);
      formData.append('isAvailable', isAvailable.toString());

      await practitionersAPI.updateProfile(formData);
      toast.success('Profile updated successfully.');
    } catch {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addSpecialization = () => {
    if (newSpec.trim() && !specializations.includes(newSpec.trim())) {
      setSpecializations([...specializations, newSpec.trim()]);
      setNewSpec('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setSpecializations(specializations.filter((s) => s !== spec));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSpecialization();
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', docType);
      const response = await practitionersAPI.uploadDocument(formData);
      const newDoc = response.data.data;
      if (newDoc) {
        setDocuments([...documents, newDoc]);
      }
      toast.success('Document uploaded successfully. It will be reviewed shortly.');
    } catch {
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const verificationStatus = user?.practitionerProfile?.verificationStatus || 'pending';
  const verificationConfig: Record<string, { variant: 'warning' | 'success' | 'error'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending Verification' },
    verified: { variant: 'success', label: 'Verified' },
    rejected: { variant: 'error', label: 'Verification Rejected' },
  };

  const docStatusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-yellow-600', label: 'Pending Review' },
    verified: { icon: CheckCircle, color: 'text-green-600', label: 'Verified' },
    rejected: { icon: AlertCircle, color: 'text-red-600', label: 'Rejected' },
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile & Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your professional profile, availability, and verification documents.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <User className="h-10 w-10 text-green-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Dr. {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {user?.practitionerProfile?.type?.replace('_', ' ') || 'Practitioner'}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Badge variant={verificationConfig[verificationStatus].variant} size="md">
                      <Shield className="mr-1 h-3 w-3" />
                      {verificationConfig[verificationStatus].label}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Star className="h-4 w-4 text-yellow-400" />
                      {user?.practitionerProfile?.rating?.toFixed(1) || '0.0'}
                      <span className="text-xs">({user?.practitionerProfile?.totalReviews || 0} reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{user?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Availability Toggle */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Availability Status</h3>
                  <p className="text-sm text-gray-500">
                    {isAvailable
                      ? 'You are currently accepting new bookings.'
                      : 'You are not accepting new bookings.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsAvailable(!isAvailable)}
                  className="flex items-center gap-2"
                >
                  {isAvailable ? (
                    <ToggleRight className="h-10 w-10 text-green-700" />
                  ) : (
                    <ToggleLeft className="h-10 w-10 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${isAvailable ? 'text-green-700' : 'text-gray-500'}`}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Bio */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Professional Bio
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your professional experience, areas of expertise, and approach to patient care..."
                />
              </div>

              {/* Specializations */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Specializations
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {specializations.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
                    >
                      {spec}
                      <button
                        onClick={() => removeSpecialization(spec)}
                        className="ml-1 rounded-full hover:bg-green-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add specialization..."
                    value={newSpec}
                    onChange={(e) => setNewSpec(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button variant="outline" onClick={addSpecialization}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Service Radius */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Service Radius (km)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={serviceRadius}
                    onChange={(e) => setServiceRadius(e.target.value)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-green-700"
                  />
                  <div className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{serviceRadius} km</span>
                  </div>
                </div>
              </div>

              {/* Consultation Fee */}
              <Input
                label="Consultation Fee (ZMW)"
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="Enter your fee in ZMW"
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} isLoading={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Documents Section */}
        <div className="space-y-6" id="documents">
          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <Shield
                    className={`h-6 w-6 ${
                      verificationStatus === 'verified'
                        ? 'text-green-600'
                        : verificationStatus === 'rejected'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-900">HPCZ Verification</p>
                    <Badge variant={verificationConfig[verificationStatus].variant} size="sm">
                      {verificationConfig[verificationStatus].label}
                    </Badge>
                  </div>
                </div>
                {verificationStatus === 'pending' && (
                  <p className="mt-3 text-xs text-gray-500">
                    Your credentials are being reviewed. This typically takes 24-48 hours.
                  </p>
                )}
                {verificationStatus === 'rejected' && (
                  <p className="mt-3 text-xs text-red-600">
                    Your verification was rejected. Please upload updated documents and contact support.
                  </p>
                )}
                <div className="mt-3 text-xs text-gray-400">
                  License: {user?.practitionerProfile?.licenseNumber || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  label="Document Type"
                  options={[
                    { value: 'hpcz_license', label: 'HPCZ License' },
                    { value: 'professional_certificate', label: 'Professional Certificate' },
                    { value: 'national_id', label: 'National ID / Passport' },
                    { value: 'proof_of_address', label: 'Proof of Address' },
                    { value: 'insurance_certificate', label: 'Insurance Certificate' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                />

                {/* File Upload Area */}
                <div
                  className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-green-400 hover:bg-green-50/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, JPG, PNG up to 5MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                  />
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                    Uploading document...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document List */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const statusInfo = docStatusConfig[doc.status] || docStatusConfig.pending;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {doc.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </p>
                            <p className="text-xs text-gray-400">{doc.fileName}</p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            doc.status === 'verified'
                              ? 'success'
                              : doc.status === 'rejected'
                              ? 'error'
                              : 'warning'
                          }
                          size="sm"
                        >
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {['HPCZ License', 'Professional Certificate', 'National ID', 'Proof of Address'].map(
                    (doc) => (
                      <div
                        key={doc}
                        className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{doc}</span>
                        </div>
                        <Badge variant="outline" size="sm">Not uploaded</Badge>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

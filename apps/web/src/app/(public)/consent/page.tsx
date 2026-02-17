'use client';

import React, { useEffect, useState } from 'react';
import { usersAPI } from '../../../lib/api';
import { useAuth } from '../../../hooks/use-auth';
import { Header } from '../../../components/layout/header';
import { Footer } from '../../../components/layout/footer';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import {
  Shield,
  Eye,
  Database,
  Trash2,
  Download,
  Lock,
  FileText,
  CheckCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface ConsentItem {
  type: string;
  label: string;
  description: string;
  granted: boolean;
  required: boolean;
}

export default function ConsentPage() {
  const { isAuthenticated, user } = useAuth();
  const [consents, setConsents] = useState<ConsentItem[]>([
    {
      type: 'data_processing',
      label: 'Data Processing',
      description:
        'Allow Ndipaano to process your personal data for providing healthcare services, including matching you with practitioners and managing appointments.',
      granted: true,
      required: true,
    },
    {
      type: 'medical_records',
      label: 'Medical Records Storage',
      description:
        'Allow secure storage and management of your medical records on the platform. Records are encrypted and only accessible with your explicit permission.',
      granted: true,
      required: true,
    },
    {
      type: 'location_data',
      label: 'Location Data',
      description:
        'Allow the use of your location to find nearby practitioners and enable home visit tracking for your safety.',
      granted: true,
      required: false,
    },
    {
      type: 'marketing',
      label: 'Marketing Communications',
      description:
        'Receive health tips, platform updates, and promotional offers via email and SMS.',
      granted: false,
      required: false,
    },
    {
      type: 'analytics',
      label: 'Usage Analytics',
      description:
        'Help us improve the platform by allowing anonymous usage data collection for analytics purposes.',
      granted: false,
      required: false,
    },
    {
      type: 'third_party_sharing',
      label: 'Third-Party Data Sharing',
      description:
        'Allow sharing of anonymized data with research institutions to improve healthcare outcomes in Zambia.',
      granted: false,
      required: false,
    },
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletionRequested, setIsDeletionRequested] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConsents();
    }
  }, [isAuthenticated]);

  async function fetchConsents() {
    try {
      const response = await usersAPI.getConsents();
      if (response.data.data?.consents) {
        setConsents((prev) =>
          prev.map((c) => {
            const found = response.data.data.consents.find(
              (rc: { type: string; granted: boolean }) => rc.type === c.type
            );
            return found ? { ...c, granted: found.granted } : c;
          })
        );
      }
    } catch {
      // Use defaults
    }
  }

  async function handleConsentToggle(type: string) {
    const consent = consents.find((c) => c.type === type);
    if (!consent || consent.required) return;

    const newGranted = !consent.granted;
    setConsents((prev) =>
      prev.map((c) => (c.type === type ? { ...c, granted: newGranted } : c))
    );

    if (isAuthenticated) {
      try {
        await usersAPI.updateConsent({ type, granted: newGranted });
        toast.success(`Consent ${newGranted ? 'granted' : 'revoked'} successfully.`);
      } catch {
        setConsents((prev) =>
          prev.map((c) => (c.type === type ? { ...c, granted: !newGranted } : c))
        );
        toast.error('Failed to update consent. Please try again.');
      }
    }
  }

  async function handleDataExport() {
    setIsExporting(true);
    try {
      await usersAPI.requestDataExport();
      toast.success(
        'Data export requested. You will receive a download link via email within 24 hours.'
      );
    } catch {
      toast.error('Failed to request data export.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDataDeletion() {
    if (
      !confirm(
        'Are you sure you want to request deletion of all your data? This action cannot be undone and will permanently remove your account and all associated data.'
      )
    ) {
      return;
    }

    try {
      await usersAPI.requestDataDeletion();
      setIsDeletionRequested(true);
      toast.success(
        'Data deletion request submitted. Your request will be processed within 30 days.'
      );
    } catch {
      toast.error('Failed to request data deletion.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Privacy & Consent Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage your data privacy preferences in accordance with the Zambia Data Protection Act, 2021.
              You have the right to control how your personal data is collected, processed, and shared.
            </p>
          </div>

          {/* DPA Rights Notice */}
          <Card className="mb-6 border-primary-200 bg-primary-50">
            <CardContent className="flex items-start gap-3 p-5">
              <Shield className="h-6 w-6 flex-shrink-0 text-primary-700" />
              <div>
                <h3 className="font-semibold text-primary-900">Your Data Protection Rights</h3>
                <p className="mt-1 text-sm text-primary-800">
                  Under the Zambia Data Protection Act, 2021, you have the right to:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-primary-700">
                  <li className="flex items-center gap-2">
                    <Eye className="h-3 w-3" /> Access your personal data
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-3 w-3" /> Request correction of inaccurate data
                  </li>
                  <li className="flex items-center gap-2">
                    <Download className="h-3 w-3" /> Export your data in a portable format
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 className="h-3 w-3" /> Request deletion of your data
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-3 w-3" /> Withdraw consent at any time
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Consent Toggles */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Consent Preferences</CardTitle>
              <CardDescription>
                Manage which data processing activities you consent to. Required consents are
                necessary for the platform to function.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {consents.map((consent) => (
                  <div
                    key={consent.type}
                    className={`rounded-lg border p-4 transition-colors ${
                      consent.granted ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{consent.label}</h4>
                          {consent.required && (
                            <Badge variant="secondary" size="sm">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{consent.description}</p>
                      </div>
                      <button
                        onClick={() => handleConsentToggle(consent.type)}
                        disabled={consent.required}
                        className={`ml-4 flex-shrink-0 ${
                          consent.required ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        }`}
                      >
                        {consent.granted ? (
                          <ToggleRight className="h-8 w-8 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          {isAuthenticated && (
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Exercise your data rights under the Zambia Data Protection Act.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Data */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">Export Your Data</h4>
                      <p className="text-sm text-gray-500">
                        Download a copy of all your personal data in a portable format.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDataExport}
                    isLoading={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>

                {/* Delete Data */}
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 flex-shrink-0 text-red-600" />
                    <div>
                      <h4 className="font-medium text-red-900">Delete Your Data</h4>
                      <p className="text-sm text-red-700">
                        Permanently delete your account and all associated data. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  {isDeletionRequested ? (
                    <Badge variant="warning" size="md">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDataDeletion}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Request Deletion
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!isAuthenticated && (
            <Card className="mt-6">
              <CardContent className="py-8 text-center">
                <Lock className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-3 text-lg font-medium text-gray-900">
                  Sign In to Manage Your Data
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create an account or sign in to manage your consent preferences and exercise
                  your data protection rights.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Data Controller Info */}
          <div className="mt-8 rounded-lg bg-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900">Data Controller</h3>
            <p className="mt-2 text-sm text-gray-600">
              Ndipaano Medical Home Care Ltd. is the data controller for personal data
              processed through this platform, registered under the Zambia Data Protection Act, 2021.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              For data protection inquiries, contact our Data Protection Officer at{' '}
              <a href="mailto:dpo@ndipaano.com" className="text-primary-700 underline">
                dpo@ndipaano.com
              </a>
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Office of the Data Protection Commissioner: Plot 4950, Mwinilunga Road, Lusaka, Zambia
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { medicalRecordsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  Share2,
  Shield,
  ClipboardList,
} from 'lucide-react';

interface MedicalRecord {
  id: string;
  type: string;
  title: string;
  description?: string;
  practitioner: {
    firstName: string;
    lastName: string;
    type: string;
  };
  createdAt: string;
  attachments?: number;
  isShared: boolean;
}

const recordTypeColors: Record<string, string> = {
  consultation: 'bg-blue-100 text-blue-800',
  lab_result: 'bg-purple-100 text-purple-800',
  prescription: 'bg-green-100 text-green-800',
  imaging: 'bg-orange-100 text-orange-800',
  referral: 'bg-pink-100 text-pink-800',
  discharge: 'bg-gray-100 text-gray-800',
};

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setIsLoading(true);
    try {
      const response = await medicalRecordsAPI.list({ limit: 50 });
      setRecords(response.data.data?.records || []);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !searchQuery ||
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.practitioner.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.practitioner.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || record.type === filterType;
    return matchesSearch && matchesType;
  });

  const recordTypes = Array.from(new Set(records.map((r) => r.type)));

  async function handleDownload(id: string) {
    try {
      const response = await medicalRecordsAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `medical-record-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // Handle error silently
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage your health records securely.
        </p>
      </div>

      {/* Privacy Notice */}
      <Card className="mb-6 border-primary-200 bg-primary-50">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="h-5 w-5 flex-shrink-0 text-primary-700" />
          <div>
            <p className="text-sm font-medium text-primary-900">
              Your records are protected
            </p>
            <p className="mt-1 text-xs text-primary-700">
              All medical records are encrypted and stored in compliance with the Zambia Data
              Protection Act. Only you and practitioners you authorize can access your records.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">All Types</option>
            {recordTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="transition-all hover:border-primary-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                      <FileText className="h-5 w-5 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{record.title}</h3>
                      <p className="text-sm text-gray-500">
                        Dr. {record.practitioner.firstName} {record.practitioner.lastName}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className={recordTypeColors[record.type] || 'bg-gray-100 text-gray-800'}>
                          {record.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {formatDate(record.createdAt)}
                        </span>
                        {record.isShared && (
                          <Badge variant="info" size="sm">
                            <Share2 className="mr-1 h-3 w-3" /> Shared
                          </Badge>
                        )}
                      </div>
                      {record.description && (
                        <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                          {record.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Download"
                      onClick={() => handleDownload(record.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <ClipboardList className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No medical records</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchQuery || filterType
              ? 'No records match your search criteria.'
              : 'Your medical records will appear here after consultations.'}
          </p>
        </div>
      )}
    </div>
  );
}

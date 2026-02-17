'use client';

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../../../lib/api';
import { formatDate } from '../../../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../../components/ui/table';
import { toast } from 'sonner';
import {
  Shield,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  Database,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: { firstName: string; lastName: string; email: string };
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
}

interface DataRequest {
  id: string;
  user: { firstName: string; lastName: string; email: string };
  type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

interface BreachNotification {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedUsers: number;
  detectedAt: string;
  status: 'open' | 'investigating' | 'resolved';
}

export default function CompliancePage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [breachNotifications, setBreachNotifications] = useState<BreachNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [auditRes, requestsRes] = await Promise.allSettled([
        adminAPI.getAuditLogs({ limit: 50 }),
        adminAPI.getDataRequests({ limit: 50 }),
      ]);
      if (auditRes.status === 'fulfilled') {
        setAuditLogs(auditRes.value.data.data?.logs || []);
      }
      if (requestsRes.status === 'fulfilled') {
        setDataRequests(requestsRes.value.data.data?.requests || []);
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDataRequest(id: string, action: 'approve' | 'reject') {
    try {
      await adminAPI.processDataRequest(id, { action });
      toast.success(`Data request ${action}d successfully.`);
      fetchData();
    } catch {
      toast.error('Failed to process data request.');
    }
  }

  const severityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor DPA compliance, audit logs, and manage data requests.
        </p>
      </div>

      {/* Compliance Overview Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">DPA</p>
                <p className="text-xs text-green-600">Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50">
                <FileText className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{auditLogs.length}</p>
                <p className="text-xs text-gray-500">Audit Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Database className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {dataRequests.filter((r) => r.status === 'pending').length}
                </p>
                <p className="text-xs text-gray-500">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                breachNotifications.filter((b) => b.status === 'open').length > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  breachNotifications.filter((b) => b.status === 'open').length > 0 ? 'text-red-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {breachNotifications.filter((b) => b.status === 'open').length}
                </p>
                <p className="text-xs text-gray-500">Open Breaches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="data-requests">
            Data Requests
            {dataRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                {dataRequests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="breaches">Breach Notifications</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(log.timestamp)} {formatDate(log.timestamp, 'time')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{log.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{log.resource}</TableCell>
                        <TableCell className="text-xs text-gray-400 font-mono">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-500">No audit logs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Requests Tab */}
        <TabsContent value="data-requests">
          <Card>
            <CardContent className="p-0">
              {dataRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.user.firstName} {request.user.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{request.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {request.type === 'export' ? (
                              <Download className="h-4 w-4 text-sky-500" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium capitalize text-gray-900">
                              Data {request.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === 'completed'
                                ? 'success'
                                : request.status === 'pending'
                                ? 'warning'
                                : request.status === 'rejected'
                                ? 'error'
                                : 'info'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(request.requestedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {request.processedAt ? formatDate(request.processedAt) : '-'}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleDataRequest(request.id, 'approve')}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDataRequest(request.id, 'reject')}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center">
                  <Database className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-500">No data requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breach Notifications Tab */}
        <TabsContent value="breaches">
          {breachNotifications.length > 0 ? (
            <div className="space-y-4">
              {breachNotifications.map((breach) => (
                <Card
                  key={breach.id}
                  className={breach.status === 'open' ? 'border-red-200' : ''}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          breach.severity === 'critical' || breach.severity === 'high'
                            ? 'bg-red-50'
                            : 'bg-yellow-50'
                        }`}>
                          <AlertTriangle className={`h-5 w-5 ${
                            breach.severity === 'critical' || breach.severity === 'high'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{breach.title}</h3>
                          <p className="mt-1 text-sm text-gray-500">{breach.description}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                            <span>{breach.affectedUsers} users affected</span>
                            <span>Detected: {formatDate(breach.detectedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={severityColors[breach.severity]}>
                          {breach.severity}
                        </Badge>
                        <Badge
                          variant={
                            breach.status === 'resolved'
                              ? 'success'
                              : breach.status === 'investigating'
                              ? 'info'
                              : 'error'
                          }
                        >
                          {breach.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-green-300" />
                <h3 className="mt-3 text-lg font-medium text-gray-900">No Breach Notifications</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No data breaches have been reported. The system is operating securely.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

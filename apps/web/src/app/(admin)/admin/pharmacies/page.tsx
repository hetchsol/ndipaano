'use client';

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../../../lib/api';
import { formatDate } from '../../../../lib/utils';
import { Card, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../../components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  Edit,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface Pharmacy {
  id: string;
  name: string;
  zamraReg?: string;
  address: string;
  city?: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    zamraReg: '',
    address: '',
    city: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchPharmacies();
  }, []);

  async function fetchPharmacies() {
    setIsLoading(true);
    try {
      const response = await adminAPI.getPharmacies({ search: searchQuery || undefined });
      setPharmacies(response.data.data?.pharmacies || []);
    } catch {
      setPharmacies([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.name || !formData.address || !formData.phone || !formData.email) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await adminAPI.createPharmacy({
        name: formData.name,
        address: `${formData.address}${formData.city ? ', ' + formData.city : ''}`,
        phone: formData.phone,
        email: formData.email,
      });
      toast.success('Pharmacy added successfully.');
      setShowCreateDialog(false);
      setFormData({ name: '', zamraReg: '', address: '', city: '', phone: '', email: '' });
      fetchPharmacies();
    } catch {
      toast.error('Failed to add pharmacy.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(pharmacy: Pharmacy) {
    const newStatus = pharmacy.status === 'active' ? 'inactive' : 'active';
    try {
      await adminAPI.updatePharmacy(pharmacy.id, { status: newStatus });
      toast.success(`Pharmacy ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
      fetchPharmacies();
    } catch {
      toast.error('Failed to update pharmacy status.');
    }
  }

  const filteredPharmacies = pharmacies.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage partner pharmacies for prescription fulfillment.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pharmacy
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search pharmacies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchPharmacies}>
          Search
        </Button>
      </div>

      {/* Pharmacy Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : filteredPharmacies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ZAMRA Reg</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPharmacies.map((pharmacy) => (
                  <TableRow key={pharmacy.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                          <Building2 className="h-4 w-4 text-green-700" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{pharmacy.name}</p>
                          <p className="text-xs text-gray-400">{pharmacy.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">
                      {pharmacy.zamraReg || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {pharmacy.city || pharmacy.address.split(',').pop()?.trim() || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        {pharmacy.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pharmacy.status === 'active' ? 'success' : 'default'}>
                        {pharmacy.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(pharmacy)}
                          title={pharmacy.status === 'active' ? 'Deactivate' : 'Activate'}
                          className="flex items-center"
                        >
                          {pharmacy.status === 'active' ? (
                            <ToggleRight className="h-6 w-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                        </button>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center">
              <Building2 className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No pharmacies found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchQuery
                  ? 'No pharmacies match your search.'
                  : 'Add your first partner pharmacy.'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pharmacy
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Pharmacy Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogClose onClose={() => setShowCreateDialog(false)} />
        <DialogHeader>
          <DialogTitle>Add New Pharmacy</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <Input
            label="Pharmacy Name"
            placeholder="e.g., Health Point Pharmacy"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="ZAMRA Registration Number"
            placeholder="e.g., ZAMRA-2024-XXXX"
            value={formData.zamraReg}
            onChange={(e) => setFormData({ ...formData, zamraReg: e.target.value })}
          />
          <Input
            label="Address"
            placeholder="Street address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <Input
            label="City"
            placeholder="e.g., Lusaka"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+260 XXX XXX XXX"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="pharmacy@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} isLoading={isSubmitting}>
            Add Pharmacy
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

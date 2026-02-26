'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { prescriptionsAPI, pharmaciesAPI, medicationOrdersAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Pill,
  Package,
  CreditCard,
  Store,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  dispensed: boolean;
  practitioner: { firstName: string; lastName: string };
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: string;
  province?: string;
  phone: string;
  distanceKm?: number;
}

interface InventoryItem {
  id: string;
  medicationName: string;
  genericName?: string;
  unitPrice: string | number;
  quantityInStock: number;
}

const STEPS = [
  { label: 'Select Pharmacy', icon: Store },
  { label: 'Review & Price', icon: Package },
  { label: 'Delivery Details', icon: MapPin },
  { label: 'Confirm Order', icon: CreditCard },
  { label: 'Confirmation', icon: CheckCircle },
];

const PAYMENT_METHODS = [
  { value: 'MOBILE_MONEY_MTN', label: 'MTN Mobile Money' },
  { value: 'MOBILE_MONEY_AIRTEL', label: 'Airtel Money' },
  { value: 'MOBILE_MONEY_ZAMTEL', label: 'Zamtel Money' },
  { value: 'CASH', label: 'Cash on Delivery/Pickup' },
];

export default function PrescriptionOrderPage() {
  const params = useParams();
  const router = useRouter();
  const prescriptionId = params.id as string;

  const [step, setStep] = useState(0);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isPickup, setIsPickup] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [pharmacySearch, setPharmacySearch] = useState('');

  // Load prescription
  useEffect(() => {
    async function load() {
      try {
        const res = await prescriptionsAPI.getById(prescriptionId);
        const data = res.data.data || res.data;
        setPrescription(data);
        if (data.dispensed) {
          toast.error('This prescription has already been dispensed.');
          router.push('/patient/prescriptions');
        }
      } catch {
        toast.error('Failed to load prescription.');
        router.push('/patient/prescriptions');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [prescriptionId, router]);

  // Load pharmacies on step 0
  useEffect(() => {
    if (step === 0) {
      pharmaciesAPI.searchNearby({ limit: 50 }).then((res) => {
        setPharmacies(res.data.data?.data || res.data.data || []);
      }).catch(() => {});
    }
  }, [step]);

  // Load inventory when pharmacy is selected (step 1)
  useEffect(() => {
    if (step === 1 && selectedPharmacy) {
      setInventoryItem(null);
      pharmaciesAPI.getInventory(selectedPharmacy.id).then((res) => {
        const items: InventoryItem[] = res.data.data || res.data || [];
        // Find matching medication (case-insensitive)
        const match = items.find(
          (item) => item.medicationName.toLowerCase() === prescription?.medicationName?.toLowerCase()
        );
        setInventoryItem(match || null);
      }).catch(() => {});
    }
  }, [step, selectedPharmacy, prescription]);

  const handleSelectPharmacy = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setStep(1);
  };

  const handleConfirmOrder = async () => {
    if (!prescription || !selectedPharmacy) return;
    setIsSubmitting(true);
    try {
      const res = await medicationOrdersAPI.create({
        prescriptionId: prescription.id,
        pharmacyId: selectedPharmacy.id,
        deliveryAddress: isPickup ? undefined : deliveryAddress || undefined,
        paymentMethod,
        notes: notes || undefined,
      });
      const order = res.data.data || res.data;
      setCreatedOrderId(order.id);
      setStep(4);
      toast.success('Medication order placed successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quantity = prescription?.quantity || 1;
  const unitPrice = inventoryItem ? Number(inventoryItem.unitPrice) : 0;
  const totalAmount = unitPrice * quantity;

  const filteredPharmacies = pharmacies.filter((p) =>
    !pharmacySearch ||
    p.name.toLowerCase().includes(pharmacySearch.toLowerCase()) ||
    p.city.toLowerCase().includes(pharmacySearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (!prescription) return null;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => step > 0 && step < 4 ? setStep(step - 1) : router.push('/patient/prescriptions')}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {step === 0 || step === 4 ? 'Back to Prescriptions' : 'Back'}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Medication</h1>
        <p className="mt-1 text-sm text-gray-500">
          {prescription.medicationName} — {prescription.dosage}
        </p>
      </div>

      {/* Step Progress */}
      {step < 4 && (
        <div className="mb-8 flex items-center justify-between">
          {STEPS.slice(0, 4).map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i <= step;
            const isCurrent = i === step;
            return (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isCurrent
                        ? 'border-green-700 bg-green-700 text-white'
                        : isActive
                        ? 'border-green-700 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-400'
                    }`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span
                    className={`mt-2 hidden text-xs font-medium sm:block ${
                      isCurrent ? 'text-green-700' : isActive ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      i < step ? 'bg-green-700' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Step 0: Select Pharmacy */}
      {step === 0 && (
        <div>
          <div className="mb-4">
            <Input
              placeholder="Search pharmacies by name or city..."
              value={pharmacySearch}
              onChange={(e) => setPharmacySearch(e.target.value)}
            />
          </div>
          {filteredPharmacies.length === 0 ? (
            <div className="py-16 text-center">
              <Store className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Pharmacies Found</h3>
              <p className="mt-2 text-sm text-gray-500">No pharmacies are available at this time.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPharmacies.map((pharmacy) => (
                <Card
                  key={pharmacy.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleSelectPharmacy(pharmacy)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                        <Store className="h-5 w-5 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{pharmacy.name}</p>
                        <p className="text-sm text-gray-500">{pharmacy.address}</p>
                        <p className="text-xs text-gray-400">{pharmacy.city}</p>
                        {pharmacy.distanceKm !== undefined && (
                          <Badge className="mt-1 bg-blue-50 text-blue-700">
                            {pharmacy.distanceKm.toFixed(1)} km away
                          </Badge>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Review & Price */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prescription Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Medication</p>
                  <p className="font-medium text-gray-900">{prescription.medicationName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dosage</p>
                  <p className="font-medium text-gray-900">{prescription.dosage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Frequency</p>
                  <p className="font-medium text-gray-900">{prescription.frequency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quantity</p>
                  <p className="font-medium text-gray-900">{quantity}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pharmacy: {selectedPharmacy?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryItem ? (
                <div>
                  <div className="mb-4 rounded-lg bg-green-50 p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Medication Available</span>
                    </div>
                    {inventoryItem.genericName && (
                      <p className="mt-1 text-sm text-green-700">
                        Generic: {inventoryItem.genericName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Unit Price</span>
                      <span className="font-medium">{formatCurrency(unitPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quantity</span>
                      <span className="font-medium">&times; {quantity}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-base font-semibold">
                        <span>Total</span>
                        <span className="text-green-700">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="mt-4 w-full" onClick={() => setStep(2)}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Pill className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-3 font-medium text-gray-700">Medication Not Available</p>
                  <p className="mt-1 text-sm text-gray-500">
                    &quot;{prescription.medicationName}&quot; is not available at this pharmacy.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setStep(0)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Choose Another Pharmacy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Delivery Details */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery or Pickup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsPickup(false)}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      !isPickup ? 'border-green-700 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <MapPin className={`h-5 w-5 ${!isPickup ? 'text-green-700' : 'text-gray-400'}`} />
                    <p className="mt-2 font-medium">Delivery</p>
                    <p className="text-sm text-gray-500">Have it delivered to your address</p>
                  </button>
                  <button
                    onClick={() => setIsPickup(true)}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      isPickup ? 'border-green-700 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Store className={`h-5 w-5 ${isPickup ? 'text-green-700' : 'text-gray-400'}`} />
                    <p className="mt-2 font-medium">Pickup</p>
                    <p className="text-sm text-gray-500">Collect from the pharmacy</p>
                  </button>
                </div>
                {!isPickup && (
                  <div>
                    <Input
                      label="Delivery Address"
                      placeholder="Enter your delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Additional Notes (optional)
                  </label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => setStep(3)}
                disabled={!isPickup && !deliveryAddress}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Confirm Order */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-green-700" />
                    <span className="font-medium text-gray-900">{prescription.medicationName}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {prescription.dosage} &middot; {prescription.frequency}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-green-700" />
                    <span className="font-medium text-gray-900">{selectedPharmacy?.name}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{selectedPharmacy?.address}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-700" />
                    <span className="font-medium text-gray-900">
                      {isPickup ? 'Pharmacy Pickup' : 'Delivery'}
                    </span>
                  </div>
                  {!isPickup && deliveryAddress && (
                    <p className="mt-1 text-sm text-gray-600">{deliveryAddress}</p>
                  )}
                </div>
              </div>

              {/* Payment method */}
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">Payment Method</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                        paymentMethod === pm.value
                          ? 'border-green-700 bg-green-50 font-medium text-green-800'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              <div className="mt-6 space-y-2 rounded-lg border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Medication ({quantity} &times; {formatCurrency(unitPrice)})</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="text-green-700">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Confirm Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-700" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Order Placed!</h2>
          <p className="mt-2 text-gray-600">
            Your medication order has been submitted successfully.
          </p>
          {createdOrderId && (
            <p className="mt-1 text-sm text-gray-500">
              Order ID: {createdOrderId.slice(0, 8)}
            </p>
          )}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => router.push(`/patient/medication-orders/${createdOrderId}`)}>
              <Package className="mr-2 h-4 w-4" /> View Order
            </Button>
            <Button variant="outline" onClick={() => router.push('/patient/medication-orders')}>
              All Orders
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

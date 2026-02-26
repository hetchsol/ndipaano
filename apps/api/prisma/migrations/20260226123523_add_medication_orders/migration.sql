-- CreateEnum
CREATE TYPE "TelehealthSessionStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabOrderPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "ResultInterpretation" AS ENUM ('NORMAL', 'ABNORMAL', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MedicationOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'TELEHEALTH_RECORDING';

-- AlterEnum
ALTER TYPE "ServiceType" ADD VALUE 'VIRTUAL_CONSULTATION';

-- CreateTable
CREATE TABLE "telehealth_sessions" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "status" "TelehealthSessionStatus" NOT NULL DEFAULT 'WAITING',
    "sessionToken" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "practitionerNotes" TEXT,
    "connectionQuality" TEXT,
    "endedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telehealth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" UUID NOT NULL,
    "bookingId" UUID,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "diagnosticTestId" UUID NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "priority" "LabOrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "clinicalNotes" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleCollectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL,
    "labOrderId" UUID NOT NULL,
    "resultValue" TEXT NOT NULL,
    "resultUnit" TEXT,
    "referenceRangeMin" TEXT,
    "referenceRangeMax" TEXT,
    "referenceRangeText" TEXT,
    "interpretation" "ResultInterpretation" NOT NULL DEFAULT 'NORMAL',
    "practitionerNotes" TEXT,
    "reportFileUrl" TEXT,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_inventory" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "medicationName" TEXT NOT NULL,
    "genericName" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantityInStock" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_orders" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "status" "MedicationOrderStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "deliveryAddress" TEXT,
    "deliveryFee" DECIMAL(10,2),
    "paymentMethod" "PaymentMethod",
    "paymentReference" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "cancelledBy" UUID,
    "cancelledReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telehealth_sessions_bookingId_key" ON "telehealth_sessions"("bookingId");

-- CreateIndex
CREATE INDEX "telehealth_sessions_bookingId_idx" ON "telehealth_sessions"("bookingId");

-- CreateIndex
CREATE INDEX "telehealth_sessions_status_idx" ON "telehealth_sessions"("status");

-- CreateIndex
CREATE INDEX "lab_orders_patientId_idx" ON "lab_orders"("patientId");

-- CreateIndex
CREATE INDEX "lab_orders_practitionerId_idx" ON "lab_orders"("practitionerId");

-- CreateIndex
CREATE INDEX "lab_orders_diagnosticTestId_idx" ON "lab_orders"("diagnosticTestId");

-- CreateIndex
CREATE INDEX "lab_orders_status_idx" ON "lab_orders"("status");

-- CreateIndex
CREATE INDEX "lab_results_labOrderId_idx" ON "lab_results"("labOrderId");

-- CreateIndex
CREATE INDEX "lab_results_interpretation_idx" ON "lab_results"("interpretation");

-- CreateIndex
CREATE INDEX "pharmacy_inventory_pharmacyId_idx" ON "pharmacy_inventory"("pharmacyId");

-- CreateIndex
CREATE INDEX "pharmacy_inventory_medicationName_idx" ON "pharmacy_inventory"("medicationName");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_inventory_pharmacyId_medicationName_key" ON "pharmacy_inventory"("pharmacyId", "medicationName");

-- CreateIndex
CREATE INDEX "medication_orders_patientId_idx" ON "medication_orders"("patientId");

-- CreateIndex
CREATE INDEX "medication_orders_pharmacyId_idx" ON "medication_orders"("pharmacyId");

-- CreateIndex
CREATE INDEX "medication_orders_prescriptionId_idx" ON "medication_orders"("prescriptionId");

-- CreateIndex
CREATE INDEX "medication_orders_status_idx" ON "medication_orders"("status");

-- AddForeignKey
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_diagnosticTestId_fkey" FOREIGN KEY ("diagnosticTestId") REFERENCES "diagnostic_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

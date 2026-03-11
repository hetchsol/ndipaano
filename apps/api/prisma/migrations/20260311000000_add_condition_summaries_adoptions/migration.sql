-- CreateEnum
CREATE TYPE "ConditionUrgency" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ConditionSummaryStatus" AS ENUM ('ACTIVE', 'ADOPTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AdoptionStatus" AS ENUM ('PENDING_PRACTITIONER_CONSENT', 'PENDING_PATIENT_CONSENT', 'ACTIVE', 'RELEASED', 'DECLINED');

-- CreateTable
CREATE TABLE "condition_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "symptoms" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "urgency" "ConditionUrgency" NOT NULL DEFAULT 'MODERATE',
    "status" "ConditionSummaryStatus" NOT NULL DEFAULT 'ACTIVE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "additionalNotes" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condition_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_adoptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conditionSummaryId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "status" "AdoptionStatus" NOT NULL DEFAULT 'PENDING_PRACTITIONER_CONSENT',
    "initiatedBy" TEXT NOT NULL,
    "declineReason" TEXT,
    "releaseReason" TEXT,
    "releasedBy" TEXT,
    "consentedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_adoptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "condition_summaries_patientId_idx" ON "condition_summaries"("patientId");
CREATE INDEX "condition_summaries_status_idx" ON "condition_summaries"("status");
CREATE INDEX "condition_summaries_serviceType_idx" ON "condition_summaries"("serviceType");
CREATE INDEX "condition_summaries_urgency_idx" ON "condition_summaries"("urgency");

-- CreateIndex
CREATE UNIQUE INDEX "patient_adoptions_conditionSummaryId_practitionerId_key" ON "patient_adoptions"("conditionSummaryId", "practitionerId");
CREATE INDEX "patient_adoptions_patientId_idx" ON "patient_adoptions"("patientId");
CREATE INDEX "patient_adoptions_practitionerId_idx" ON "patient_adoptions"("practitionerId");
CREATE INDEX "patient_adoptions_status_idx" ON "patient_adoptions"("status");

-- AddForeignKey
ALTER TABLE "condition_summaries" ADD CONSTRAINT "condition_summaries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_adoptions" ADD CONSTRAINT "patient_adoptions_conditionSummaryId_fkey" FOREIGN KEY ("conditionSummaryId") REFERENCES "condition_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_adoptions" ADD CONSTRAINT "patient_adoptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_adoptions" ADD CONSTRAINT "patient_adoptions_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

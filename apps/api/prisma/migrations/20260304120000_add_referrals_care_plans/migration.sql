-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'APPOINTMENT_BOOKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralUrgency" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referringPractitionerId" UUID NOT NULL,
    "referredPractitionerId" UUID,
    "patientId" UUID NOT NULL,
    "bookingId" UUID,
    "referredBookingId" UUID,
    "status" "ReferralStatus" NOT NULL DEFAULT 'SENT',
    "urgency" "ReferralUrgency" NOT NULL DEFAULT 'ROUTINE',
    "reason" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "specialtyRequired" TEXT,
    "declineReason" TEXT,
    "dischargeNotes" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "carePlanId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "targetDate" DATE,
    "completedAt" TIMESTAMP(3),
    "completedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plan_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_practitioners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "carePlanId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "role" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_plan_practitioners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referrals_referringPractitionerId_idx" ON "referrals"("referringPractitionerId");

-- CreateIndex
CREATE INDEX "referrals_referredPractitionerId_idx" ON "referrals"("referredPractitionerId");

-- CreateIndex
CREATE INDEX "referrals_patientId_idx" ON "referrals"("patientId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_urgency_idx" ON "referrals"("urgency");

-- CreateIndex
CREATE INDEX "care_plans_patientId_idx" ON "care_plans"("patientId");

-- CreateIndex
CREATE INDEX "care_plans_createdById_idx" ON "care_plans"("createdById");

-- CreateIndex
CREATE INDEX "care_plans_status_idx" ON "care_plans"("status");

-- CreateIndex
CREATE INDEX "care_plan_milestones_carePlanId_idx" ON "care_plan_milestones"("carePlanId");

-- CreateIndex
CREATE INDEX "care_plan_milestones_status_idx" ON "care_plan_milestones"("status");

-- CreateIndex
CREATE INDEX "care_plan_milestones_completedById_idx" ON "care_plan_milestones"("completedById");

-- CreateIndex
CREATE UNIQUE INDEX "care_plan_practitioners_carePlanId_practitionerId_key" ON "care_plan_practitioners"("carePlanId", "practitionerId");

-- CreateIndex
CREATE INDEX "care_plan_practitioners_carePlanId_idx" ON "care_plan_practitioners"("carePlanId");

-- CreateIndex
CREATE INDEX "care_plan_practitioners_practitionerId_idx" ON "care_plan_practitioners"("practitionerId");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referringPractitionerId_fkey" FOREIGN KEY ("referringPractitionerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredPractitionerId_fkey" FOREIGN KEY ("referredPractitionerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredBookingId_fkey" FOREIGN KEY ("referredBookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_milestones" ADD CONSTRAINT "care_plan_milestones_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_milestones" ADD CONSTRAINT "care_plan_milestones_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_practitioners" ADD CONSTRAINT "care_plan_practitioners_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_practitioners" ADD CONSTRAINT "care_plan_practitioners_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_OTHER_DAY', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AdherenceStatus" AS ENUM ('PENDING', 'TAKEN', 'SKIPPED', 'MISSED');

-- CreateEnum
CREATE TYPE "MedicationReminderStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "medication_reminders" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "frequency" "ReminderFrequency" NOT NULL,
    "timesOfDay" TEXT[],
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "MedicationReminderStatus" NOT NULL DEFAULT 'ACTIVE',
    "notifyVia" "NotificationChannel"[],
    "totalQuantity" INTEGER,
    "missedWindowMinutes" INTEGER NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adherence_logs" (
    "id" UUID NOT NULL,
    "reminderId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "AdherenceStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adherence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medication_reminders_patientId_idx" ON "medication_reminders"("patientId");

-- CreateIndex
CREATE INDEX "medication_reminders_prescriptionId_idx" ON "medication_reminders"("prescriptionId");

-- CreateIndex
CREATE INDEX "medication_reminders_status_idx" ON "medication_reminders"("status");

-- CreateIndex
CREATE INDEX "adherence_logs_reminderId_idx" ON "adherence_logs"("reminderId");

-- CreateIndex
CREATE INDEX "adherence_logs_patientId_idx" ON "adherence_logs"("patientId");

-- CreateIndex
CREATE INDEX "adherence_logs_scheduledAt_idx" ON "adherence_logs"("scheduledAt");

-- CreateIndex
CREATE INDEX "adherence_logs_status_idx" ON "adherence_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "adherence_logs_reminderId_scheduledAt_key" ON "adherence_logs"("reminderId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "medication_reminders" ADD CONSTRAINT "medication_reminders_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_reminders" ADD CONSTRAINT "medication_reminders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adherence_logs" ADD CONSTRAINT "adherence_logs_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "medication_reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adherence_logs" ADD CONSTRAINT "adherence_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

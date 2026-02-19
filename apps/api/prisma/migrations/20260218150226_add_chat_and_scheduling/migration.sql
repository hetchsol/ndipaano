-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('TWENTY_FOUR_HOURS', 'ONE_HOUR');

-- CreateEnum
CREATE TYPE "DiagnosticTestCategory" AS ENUM ('LAB_TEST', 'RAPID_TEST', 'IMAGING', 'SWAB_CULTURE', 'SCREENING', 'SPECIALIZED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "rescheduledAt" TIMESTAMP(3),
ADD COLUMN     "rescheduledBy" UUID,
ADD COLUMN     "rescheduledFrom" TIMESTAMP(3),
ADD COLUMN     "scheduledEndTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "practitioner_profiles" ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "offersClinicVisits" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offersHomeVisits" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "operatingCenterAddress" TEXT,
ADD COLUMN     "operatingCenterCity" TEXT,
ADD COLUMN     "operatingCenterName" TEXT,
ADD COLUMN     "operatingCenterPhone" TEXT,
ADD COLUMN     "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practitioner_availabilities" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practitioner_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practitioner_blackouts" (
    "id" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practitioner_blackouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_reminders" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_tests" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" "DiagnosticTestCategory" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practitioner_type_diagnostic_tests" (
    "id" UUID NOT NULL,
    "practitionerType" "PractitionerType" NOT NULL,
    "diagnosticTestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practitioner_type_diagnostic_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_bookingId_key" ON "conversations"("bookingId");

-- CreateIndex
CREATE INDEX "conversations_patientId_idx" ON "conversations"("patientId");

-- CreateIndex
CREATE INDEX "conversations_practitionerId_idx" ON "conversations"("practitionerId");

-- CreateIndex
CREATE INDEX "conversations_isActive_idx" ON "conversations"("isActive");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "practitioner_availabilities_practitionerId_idx" ON "practitioner_availabilities"("practitionerId");

-- CreateIndex
CREATE INDEX "practitioner_availabilities_dayOfWeek_idx" ON "practitioner_availabilities"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "practitioner_availabilities_practitionerId_dayOfWeek_startT_key" ON "practitioner_availabilities"("practitionerId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "practitioner_blackouts_practitionerId_idx" ON "practitioner_blackouts"("practitionerId");

-- CreateIndex
CREATE INDEX "practitioner_blackouts_date_idx" ON "practitioner_blackouts"("date");

-- CreateIndex
CREATE INDEX "booking_reminders_bookingId_idx" ON "booking_reminders"("bookingId");

-- CreateIndex
CREATE INDEX "booking_reminders_scheduledFor_idx" ON "booking_reminders"("scheduledFor");

-- CreateIndex
CREATE INDEX "booking_reminders_sent_idx" ON "booking_reminders"("sent");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_tests_name_key" ON "diagnostic_tests"("name");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_tests_code_key" ON "diagnostic_tests"("code");

-- CreateIndex
CREATE INDEX "diagnostic_tests_category_idx" ON "diagnostic_tests"("category");

-- CreateIndex
CREATE INDEX "practitioner_type_diagnostic_tests_practitionerType_idx" ON "practitioner_type_diagnostic_tests"("practitionerType");

-- CreateIndex
CREATE INDEX "practitioner_type_diagnostic_tests_diagnosticTestId_idx" ON "practitioner_type_diagnostic_tests"("diagnosticTestId");

-- CreateIndex
CREATE UNIQUE INDEX "practitioner_type_diagnostic_tests_practitionerType_diagnos_key" ON "practitioner_type_diagnostic_tests"("practitionerType", "diagnosticTestId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practitioner_availabilities" ADD CONSTRAINT "practitioner_availabilities_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practitioner_blackouts" ADD CONSTRAINT "practitioner_blackouts_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practitioner_type_diagnostic_tests" ADD CONSTRAINT "practitioner_type_diagnostic_tests_diagnosticTestId_fkey" FOREIGN KEY ("diagnosticTestId") REFERENCES "diagnostic_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

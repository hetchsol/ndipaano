-- CreateTable
CREATE TABLE "operating_centers" (
    "id" UUID NOT NULL,
    "practitionerProfileId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operating_centers_practitionerProfileId_idx" ON "operating_centers"("practitionerProfileId");

-- AddForeignKey
ALTER TABLE "operating_centers" ADD CONSTRAINT "operating_centers_practitionerProfileId_fkey" FOREIGN KEY ("practitionerProfileId") REFERENCES "practitioner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

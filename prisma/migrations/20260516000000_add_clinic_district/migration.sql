-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN "district" TEXT;

-- CreateIndex
CREATE INDEX "Clinic_district_idx" ON "Clinic"("district");

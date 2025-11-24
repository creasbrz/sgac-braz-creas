-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "pesoUrgencia" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Case_pesoUrgencia_idx" ON "Case"("pesoUrgencia");

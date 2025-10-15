/*
  Warnings:

  - You are about to drop the `PAF` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PAF" DROP CONSTRAINT "PAF_autorId_fkey";

-- DropForeignKey
ALTER TABLE "PAF" DROP CONSTRAINT "PAF_casoId_fkey";

-- DropTable
DROP TABLE "PAF";

-- CreateTable
CREATE TABLE "Paf" (
    "id" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "objetivos" TEXT NOT NULL,
    "estrategias" TEXT NOT NULL,
    "prazos" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "Paf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paf_casoId_key" ON "Paf"("casoId");

-- AddForeignKey
ALTER TABLE "Paf" ADD CONSTRAINT "Paf_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paf" ADD CONSTRAINT "Paf_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

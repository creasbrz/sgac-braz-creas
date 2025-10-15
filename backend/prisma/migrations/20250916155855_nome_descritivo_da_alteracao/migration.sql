/*
  Warnings:

  - You are about to drop the column `agenteResponsavelId` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `agenteSocial` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `especialistaResponsavelId` on the `Case` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Case" DROP CONSTRAINT "Case_agenteResponsavelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Case" DROP CONSTRAINT "Case_especialistaResponsavelId_fkey";

-- AlterTable
ALTER TABLE "public"."Case" DROP COLUMN "agenteResponsavelId",
DROP COLUMN "agenteSocial",
DROP COLUMN "especialistaResponsavelId",
ADD COLUMN     "agenteAcolhidaId" TEXT,
ADD COLUMN     "especialistaPAEFIId" TEXT,
ALTER COLUMN "numeroSei" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "cargo" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_agenteAcolhidaId_fkey" FOREIGN KEY ("agenteAcolhidaId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_especialistaPAEFIId_fkey" FOREIGN KEY ("especialistaPAEFIId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

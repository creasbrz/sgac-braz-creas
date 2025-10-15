/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Case" ADD COLUMN     "agenteResponsavelId" TEXT,
ADD COLUMN     "especialistaResponsavelId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "cargo" TEXT NOT NULL DEFAULT 'Agente Social',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_agenteResponsavelId_fkey" FOREIGN KEY ("agenteResponsavelId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_especialistaResponsavelId_fkey" FOREIGN KEY ("especialistaResponsavelId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

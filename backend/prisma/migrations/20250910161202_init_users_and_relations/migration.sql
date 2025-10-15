/*
  Warnings:

  - You are about to drop the column `agenteAcolhidaId` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `especialistaPAEFIId` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `agenteSocial` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `urgencia` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `telefone` on table `Case` required. This step will fail if there are existing NULL values in that column.
  - Made the column `numeroSei` on table `Case` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `violacao` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `orgaoDemandante` on table `Case` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `categoria` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `nome` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senha` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Case" DROP CONSTRAINT "Case_agenteAcolhidaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Case" DROP CONSTRAINT "Case_especialistaPAEFIId_fkey";

-- AlterTable
ALTER TABLE "public"."Case" DROP COLUMN "agenteAcolhidaId",
DROP COLUMN "especialistaPAEFIId",
DROP COLUMN "status",
ADD COLUMN     "agenteSocial" TEXT NOT NULL,
DROP COLUMN "urgencia",
ADD COLUMN     "urgencia" TEXT NOT NULL,
ALTER COLUMN "telefone" SET NOT NULL,
ALTER COLUMN "numeroSei" SET NOT NULL,
DROP COLUMN "violacao",
ADD COLUMN     "violacao" TEXT NOT NULL,
ALTER COLUMN "orgaoDemandante" SET NOT NULL,
DROP COLUMN "categoria",
ADD COLUMN     "categoria" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "createdAt",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "updatedAt",
ADD COLUMN     "nome" TEXT NOT NULL,
ADD COLUMN     "senha" TEXT NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- DropEnum
DROP TYPE "public"."Categoria";

-- DropEnum
DROP TYPE "public"."Role";

-- DropEnum
DROP TYPE "public"."Status";

-- DropEnum
DROP TYPE "public"."Urgencia";

-- DropEnum
DROP TYPE "public"."Violacao";

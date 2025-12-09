-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('ACOLHIDA_COLETIVA', 'OFICINA', 'GRUPO_PAEFI', 'REUNIAO_REDE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogAction" ADD VALUE 'ATIVIDADE_GRUPO_CRIADA';
ALTER TYPE "LogAction" ADD VALUE 'PRESENCA_REGISTRADA';

-- CreateTable
CREATE TABLE "GroupActivity" (
    "id" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "tipo" "GroupType" NOT NULL,
    "dataRealizacao" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "descricao" TEXT,
    "facilitadorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAttendance" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupAttendance_grupoId_casoId_key" ON "GroupAttendance"("grupoId", "casoId");

-- AddForeignKey
ALTER TABLE "GroupActivity" ADD CONSTRAINT "GroupActivity_facilitadorId_fkey" FOREIGN KEY ("facilitadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAttendance" ADD CONSTRAINT "GroupAttendance_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GroupActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAttendance" ADD CONSTRAINT "GroupAttendance_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "LogAction" ADD VALUE 'MEMBRO_FAMILIA_ADICIONADO';

-- AlterTable
ALTER TABLE "Evolucao" ADD COLUMN     "sigilo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MembroFamilia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "idade" INTEGER,
    "ocupacao" TEXT,
    "renda" DECIMAL(10,2),
    "observacoes" TEXT,
    "casoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembroFamilia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MembroFamilia" ADD CONSTRAINT "MembroFamilia_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Agendamento" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "beneficios" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "motivoDesligamento" TEXT;

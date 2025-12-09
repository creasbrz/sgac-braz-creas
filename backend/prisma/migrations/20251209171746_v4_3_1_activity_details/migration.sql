-- AlterTable
ALTER TABLE "GroupActivity" ADD COLUMN     "orgaosEnvolvidos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "dataRespostaSei" TIMESTAMP(3),
ADD COLUMN     "seiRespondido" BOOLEAN NOT NULL DEFAULT false;

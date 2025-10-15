/*
  Warnings:

  - You are about to drop the column `dataNascimento` on the `Case` table. All the data in the column will be lost.
  - Added the required column `nascimento` to the `Case` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Case" DROP COLUMN "dataNascimento",
ADD COLUMN     "nascimento" TIMESTAMP(3) NOT NULL;

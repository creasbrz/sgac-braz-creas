/*
  Warnings:

  - You are about to drop the `agendamentos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `evolucoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pafs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "agendamentos" DROP CONSTRAINT "agendamentos_casoId_fkey";

-- DropForeignKey
ALTER TABLE "agendamentos" DROP CONSTRAINT "agendamentos_responsavelId_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_agenteAcolhidaId_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_criadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_especialistaPAEFIId_fkey";

-- DropForeignKey
ALTER TABLE "evolucoes" DROP CONSTRAINT "evolucoes_autorId_fkey";

-- DropForeignKey
ALTER TABLE "evolucoes" DROP CONSTRAINT "evolucoes_casoId_fkey";

-- DropForeignKey
ALTER TABLE "pafs" DROP CONSTRAINT "pafs_autorId_fkey";

-- DropForeignKey
ALTER TABLE "pafs" DROP CONSTRAINT "pafs_casoId_fkey";

-- DropTable
DROP TABLE "agendamentos";

-- DropTable
DROP TABLE "cases";

-- DropTable
DROP TABLE "evolucoes";

-- DropTable
DROP TABLE "pafs";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "nascimento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urgencia" TEXT NOT NULL,
    "violacao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "orgaoDemandante" TEXT NOT NULL,
    "numeroSei" TEXT,
    "linkSei" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO_ACOLHIDA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "agenteAcolhidaId" TEXT,
    "especialistaPAEFIId" TEXT,
    "beneficios" TEXT[],
    "dataInicioPAEFI" TIMESTAMP(3),
    "dataDesligamento" TIMESTAMP(3),
    "motivoDesligamento" TEXT,
    "parecerFinal" TEXT,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evolucao" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "Evolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paf" (
    "id" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "objetivos" TEXT NOT NULL,
    "estrategias" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "Paf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Case_cpf_key" ON "Case"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Paf_casoId_key" ON "Paf"("casoId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_agenteAcolhidaId_fkey" FOREIGN KEY ("agenteAcolhidaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_especialistaPAEFIId_fkey" FOREIGN KEY ("especialistaPAEFIId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paf" ADD CONSTRAINT "Paf_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paf" ADD CONSTRAINT "Paf_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

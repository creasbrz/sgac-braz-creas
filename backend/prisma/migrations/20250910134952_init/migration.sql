-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GERENTE', 'AGENTE_SOCIAL', 'ESPECIALISTA');

-- CreateEnum
CREATE TYPE "Urgencia" AS ENUM ('VERMELHO', 'LARANJA', 'AMARELO', 'VERDE', 'AZUL');

-- CreateEnum
CREATE TYPE "Violacao" AS ENUM ('ABANDONO', 'NEGLIGENCIA', 'AFASTAMENTO_CONVIVIO_FAMILIAR', 'MEDIDAS_SOCIOEDUCATIVAS', 'DESCUMPRIMENTO_PBF', 'DISCRIMINACAO', 'SITUACAO_RUA', 'TRABALHO_INFANTIL', 'VIOLENCIA_FISICA_PSICOLOGICA', 'VIOLENCIA_SEXUAL', 'OUTROS');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('MULHER', 'POP_RUA', 'LGBTQIA', 'MIGRANTE', 'IDOSO', 'CRIANCA_ADOLESCENTE', 'PCD', 'ALCOOL_DROGAS');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('AGUARDANDO_ACOLHIDA', 'EM_ACOLHIDA', 'AGUARDANDO_DISTRIBUICAO_PAEFI', 'EM_ACOMPANHAMENTO_PAEFI', 'DESLIGADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "urgencia" "Urgencia" NOT NULL,
    "telefone" TEXT,
    "endereco" TEXT NOT NULL,
    "numeroSei" TEXT,
    "linkSei" TEXT,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "violacao" "Violacao" NOT NULL,
    "orgaoDemandante" TEXT,
    "categoria" "Categoria" NOT NULL,
    "observacoes" TEXT,
    "status" "Status" NOT NULL DEFAULT 'AGUARDANDO_ACOLHIDA',
    "criadoPorId" TEXT NOT NULL,
    "agenteAcolhidaId" TEXT,
    "especialistaPAEFIId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Case_cpf_key" ON "Case"("cpf");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_agenteAcolhidaId_fkey" FOREIGN KEY ("agenteAcolhidaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_especialistaPAEFIId_fkey" FOREIGN KEY ("especialistaPAEFIId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

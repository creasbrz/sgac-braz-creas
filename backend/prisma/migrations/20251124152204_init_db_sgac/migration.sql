-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('Gerente', 'Agente_Social', 'Especialista');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('AGUARDANDO_ACOLHIDA', 'EM_ACOLHIDA', 'AGUARDANDO_DISTRIBUICAO_PAEFI', 'EM_ACOMPANHAMENTO_PAEFI', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('CRIACAO', 'MUDANCA_STATUS', 'ATRIBUICAO', 'DESLIGAMENTO', 'EVOLUCAO_CRIADA', 'AGENDAMENTO_CRIADO', 'PAF_CRIADO', 'PAF_ATUALIZADO', 'ANEXO_ADICIONADO', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" "Cargo" NOT NULL,
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
    "urgencia" TEXT NOT NULL,
    "violacao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgaoDemandante" TEXT NOT NULL,
    "numeroSei" TEXT,
    "linkSei" TEXT,
    "observacoes" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'AGUARDANDO_ACOLHIDA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "agenteAcolhidaId" TEXT,
    "especialistaPAEFIId" TEXT,
    "beneficios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataInicioPAEFI" TIMESTAMP(3),
    "dataDesligamento" TIMESTAMP(3),
    "motivoDesligamento" TEXT,
    "parecerFinal" TEXT,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "dataDeletado" TIMESTAMP(3),

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
    "versaoAtual" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Paf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PafVersion" (
    "id" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "objetivos" TEXT NOT NULL,
    "estrategias" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pafId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "versaoNumero" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PafVersion_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "CaseLog" (
    "id" TEXT NOT NULL,
    "acao" "LogAction" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "CaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tamanho" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_cargo_idx" ON "User"("cargo");

-- CreateIndex
CREATE UNIQUE INDEX "Case_cpf_key" ON "Case"("cpf");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_dataEntrada_idx" ON "Case"("dataEntrada");

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
ALTER TABLE "PafVersion" ADD CONSTRAINT "PafVersion_pafId_fkey" FOREIGN KEY ("pafId") REFERENCES "Paf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PafVersion" ADD CONSTRAINT "PafVersion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLog" ADD CONSTRAINT "CaseLog_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLog" ADD CONSTRAINT "CaseLog_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

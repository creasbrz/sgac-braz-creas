-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('Gerente', 'Agente_Social', 'Especialista', 'Auditor');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('AGUARDANDO_ACOLHIDA', 'EM_ACOLHIDA', 'AGUARDANDO_DISTRIBUICAO', 'EM_ACOLHIDA_ESPECIALIZADA', 'EM_ACOMPANHAMENTO', 'EM_MONITORAMENTO', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('CRIACAO', 'MUDANCA_STATUS', 'ATRIBUICAO', 'DESLIGAMENTO', 'EVOLUCAO_CRIADA', 'AGENDAMENTO_CRIADO', 'PAF_CRIADO', 'PAF_ATUALIZADO', 'ANEXO_ADICIONADO', 'MEMBRO_FAMILIA_ADICIONADO', 'ENTREGA_BENEFICIO_CRIADA', 'ENTREGA_BENEFICIO_ATUALIZADA', 'ATIVIDADE_GRUPO_CRIADA', 'PRESENCA_REGISTRADA', 'OUTRO');

-- CreateEnum
CREATE TYPE "CaseOrigin" AS ENUM ('ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('ACOLHIDA_COLETIVA', 'OFICINA', 'GRUPO_PAEFI', 'REUNIAO_REDE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" "Cargo" NOT NULL,
    "matricula" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "nomeSocial" TEXT,
    "cpf" TEXT NOT NULL,
    "nascimento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "contatos" JSONB,
    "endereco_logradouro" TEXT,
    "endereco_complemento" TEXT,
    "endereco_bairro" TEXT,
    "endereco_cidade" TEXT DEFAULT 'Brasília',
    "endereco_uf" TEXT DEFAULT 'DF',
    "endereco_cep" TEXT,
    "endereco_ra" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "responsavelLegal" TEXT,
    "parentescoResponsavel" TEXT,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgaoDemandante" TEXT NOT NULL,
    "origem" "CaseOrigin" NOT NULL DEFAULT 'ESPONTANEA',
    "urgencia" TEXT NOT NULL,
    "pesoUrgencia" INTEGER NOT NULL DEFAULT 1,
    "violacao" TEXT[],
    "categoria" TEXT NOT NULL,
    "numeroSei" TEXT,
    "linkSei" TEXT,
    "observacoes" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'AGUARDANDO_ACOLHIDA',
    "beneficios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoPorId" TEXT NOT NULL,
    "agenteAcolhidaId" TEXT,
    "especialistaPAEFIId" TEXT,
    "dataInicioPAEFI" TIMESTAMP(3),
    "dataDesligamento" TIMESTAMP(3),
    "motivoDesligamento" TEXT,
    "destinoDesligamento" TEXT,
    "parecerFinal" TEXT,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "dataDeletado" TIMESTAMP(3),

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evolucao" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "sigilo" BOOLEAN NOT NULL DEFAULT false,
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
    "tipo" TEXT NOT NULL DEFAULT 'Atendimento',
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

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encaminhamento" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "instituicao" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retorno" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "Encaminhamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembroFamilia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "idade" INTEGER,
    "cpf" TEXT,
    "nascimento" TIMESTAMP(3),
    "telefone" TEXT,
    "ocupacao" TEXT,
    "renda" DECIMAL(10,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,

    CONSTRAINT "MembroFamilia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDeliverable" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataEntrega" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,

    CONSTRAINT "ServiceDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupActivity" (
    "id" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "tipo" "GroupType" NOT NULL,
    "dataRealizacao" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "descricao" TEXT,
    "orgaosEnvolvidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilitadorId" TEXT NOT NULL,

    CONSTRAINT "GroupActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAttendance" (
    "id" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grupoId" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,

    CONSTRAINT "GroupAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_matricula_key" ON "User"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "cases_cpf_key" ON "cases"("cpf");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_dataEntrada_idx" ON "cases"("dataEntrada");

-- CreateIndex
CREATE INDEX "cases_pesoUrgencia_idx" ON "cases"("pesoUrgencia");

-- CreateIndex
CREATE INDEX "cases_agenteAcolhidaId_idx" ON "cases"("agenteAcolhidaId");

-- CreateIndex
CREATE INDEX "cases_especialistaPAEFIId_idx" ON "cases"("especialistaPAEFIId");

-- CreateIndex
CREATE INDEX "cases_violacao_idx" ON "cases"("violacao");

-- CreateIndex
CREATE INDEX "cases_endereco_ra_idx" ON "cases"("endereco_ra");

-- CreateIndex
CREATE INDEX "Evolucao_casoId_createdAt_idx" ON "Evolucao"("casoId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Paf_casoId_key" ON "Paf"("casoId");

-- CreateIndex
CREATE INDEX "Agendamento_responsavelId_data_idx" ON "Agendamento"("responsavelId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "GroupAttendance_grupoId_casoId_key" ON "GroupAttendance"("grupoId", "casoId");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_agenteAcolhidaId_fkey" FOREIGN KEY ("agenteAcolhidaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_especialistaPAEFIId_fkey" FOREIGN KEY ("especialistaPAEFIId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paf" ADD CONSTRAINT "Paf_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paf" ADD CONSTRAINT "Paf_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PafVersion" ADD CONSTRAINT "PafVersion_pafId_fkey" FOREIGN KEY ("pafId") REFERENCES "Paf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PafVersion" ADD CONSTRAINT "PafVersion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLog" ADD CONSTRAINT "CaseLog_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLog" ADD CONSTRAINT "CaseLog_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaminhamento" ADD CONSTRAINT "Encaminhamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaminhamento" ADD CONSTRAINT "Encaminhamento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroFamilia" ADD CONSTRAINT "MembroFamilia_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDeliverable" ADD CONSTRAINT "ServiceDeliverable_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDeliverable" ADD CONSTRAINT "ServiceDeliverable_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupActivity" ADD CONSTRAINT "GroupActivity_facilitadorId_fkey" FOREIGN KEY ("facilitadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAttendance" ADD CONSTRAINT "GroupAttendance_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GroupActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAttendance" ADD CONSTRAINT "GroupAttendance_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

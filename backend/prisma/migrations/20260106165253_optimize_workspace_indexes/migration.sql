-- AlterTable
ALTER TABLE "GroupActivity" ADD COLUMN     "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Agendamento_responsavelId_data_idx" ON "Agendamento"("responsavelId", "data");

-- CreateIndex
CREATE INDEX "Case_agenteAcolhidaId_idx" ON "Case"("agenteAcolhidaId");

-- CreateIndex
CREATE INDEX "Case_especialistaPAEFIId_idx" ON "Case"("especialistaPAEFIId");

-- CreateIndex
CREATE INDEX "Case_violacao_idx" ON "Case"("violacao");

-- CreateIndex
CREATE INDEX "Evolucao_casoId_createdAt_idx" ON "Evolucao"("casoId", "createdAt" DESC);

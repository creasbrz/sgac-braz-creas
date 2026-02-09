-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "casoPrincipalId" TEXT,
ADD COLUMN     "dataUltimaRevisaoGerencial" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "manterReferencia" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TechnicalDocument" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "TechnicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cases_cpf_idx" ON "cases"("cpf");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_casoPrincipalId_fkey" FOREIGN KEY ("casoPrincipalId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

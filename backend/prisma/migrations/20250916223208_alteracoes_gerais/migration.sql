-- CreateTable
CREATE TABLE "public"."Evolucao" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "Evolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PAF" (
    "id" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "objetivos" TEXT NOT NULL,
    "estrategias" TEXT NOT NULL,
    "prazos" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "PAF_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PAF_casoId_key" ON "public"."PAF"("casoId");

-- AddForeignKey
ALTER TABLE "public"."Evolucao" ADD CONSTRAINT "Evolucao_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "public"."Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Evolucao" ADD CONSTRAINT "Evolucao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PAF" ADD CONSTRAINT "PAF_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "public"."Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PAF" ADD CONSTRAINT "PAF_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

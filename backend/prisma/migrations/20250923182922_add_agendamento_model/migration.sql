-- CreateTable
CREATE TABLE "public"."Agendamento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casoId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Agendamento" ADD CONSTRAINT "Agendamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "public"."Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Agendamento" ADD CONSTRAINT "Agendamento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Encaminhamento" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "instituicao" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retorno" TEXT,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encaminhamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Encaminhamento" ADD CONSTRAINT "Encaminhamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaminhamento" ADD CONSTRAINT "Encaminhamento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

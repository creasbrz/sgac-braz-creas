-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

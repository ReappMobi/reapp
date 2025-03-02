-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_CONFIRMATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

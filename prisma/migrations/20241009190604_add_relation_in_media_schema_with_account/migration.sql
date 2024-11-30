/*
  Warnings:

  - You are about to alter the column `accountId` on the `MediaAttachment` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "MediaAttachment" ALTER COLUMN "accountId" SET DATA TYPE INTEGER;

-- AddForeignKey
ALTER TABLE "MediaAttachment" ADD CONSTRAINT "MediaAttachment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

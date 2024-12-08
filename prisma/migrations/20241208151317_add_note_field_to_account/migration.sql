/*
  Warnings:

  - You are about to alter the column `email` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(200)`.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "note" VARCHAR(255),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(200);

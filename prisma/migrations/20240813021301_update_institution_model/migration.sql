/*
  Warnings:

  - A unique constraint covering the columns `[cnpj]` on the table `Institution` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `city` to the `Institution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cnpj` to the `Institution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Institution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `Institution` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Institution" DROP CONSTRAINT "Institution_accountId_fkey";

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "city" VARCHAR(255) NOT NULL,
ADD COLUMN     "cnpj" TEXT NOT NULL,
ADD COLUMN     "phone" VARCHAR(20) NOT NULL,
ADD COLUMN     "state" VARCHAR(2) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Institution_cnpj_key" ON "Institution"("cnpj");

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

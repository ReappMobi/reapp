/*
  Warnings:

  - You are about to drop the column `donorId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `donorId` on the `Like` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Like` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_donorId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_donorId_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "donorId",
ADD COLUMN     "accountId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Like" DROP COLUMN "donorId",
ADD COLUMN     "accountId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

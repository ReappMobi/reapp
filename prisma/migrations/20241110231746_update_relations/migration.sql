/*
  Warnings:

  - You are about to drop the column `institutionId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "institutionId",
DROP COLUMN "projectId";

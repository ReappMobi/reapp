/*
  Warnings:

  - You are about to drop the column `follwingCount` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Institution` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Institution` table. All the data in the column will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Collaborator` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Field` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Partner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Volunteer` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Institution` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InstitutionMemberType" AS ENUM ('PARTNER', 'VOLUNTEER', 'COLLABORATOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DonationStatus" ADD VALUE 'FAILED';
ALTER TYPE "DonationStatus" ADD VALUE 'CANCELED';

-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "Collaborator" DROP CONSTRAINT "Collaborator_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "Field" DROP CONSTRAINT "Field_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "Partner" DROP CONSTRAINT "Partner_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "Volunteer" DROP CONSTRAINT "Volunteer_institutionId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "follwingCount",
ADD COLUMN     "followingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Institution" DROP COLUMN "city",
DROP COLUMN "state",
ADD COLUMN     "categoryId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "Collaborator";

-- DropTable
DROP TABLE "Field";

-- DropTable
DROP TABLE "Partner";

-- DropTable
DROP TABLE "Volunteer";

-- CreateTable
CREATE TABLE "InstitutionField" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "institutionId" INTEGER NOT NULL,

    CONSTRAINT "InstitutionField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionMember" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "avatar" VARCHAR(255) NOT NULL,
    "memberType" "InstitutionMemberType" NOT NULL,
    "institutionId" INTEGER,

    CONSTRAINT "InstitutionMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionField_name_key" ON "InstitutionField"("name");

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionField" ADD CONSTRAINT "InstitutionField_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

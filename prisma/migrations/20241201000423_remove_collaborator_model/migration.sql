/*
  Warnings:

  - You are about to drop the column `avatar` on the `InstitutionMember` table. All the data in the column will be lost.
  - You are about to drop the `Collaborator` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Collaborator" DROP CONSTRAINT "Collaborator_avatar_fkey";

-- DropForeignKey
ALTER TABLE "Collaborator" DROP CONSTRAINT "Collaborator_institutionId_fkey";

-- AlterTable
ALTER TABLE "InstitutionMember" DROP COLUMN "avatar",
ADD COLUMN     "avatarId" VARCHAR(255);

-- DropTable
DROP TABLE "Collaborator";

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "MediaAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

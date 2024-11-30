/*
  Warnings:

  - You are about to drop the column `bannerUrl` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "bannerUrl",
DROP COLUMN "mediaUrl",
ADD COLUMN     "mediaId" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

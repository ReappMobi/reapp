/*
  Warnings:

  - The primary key for the `MediaAttachment` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_mediaId_fkey";

-- AlterTable
ALTER TABLE "MediaAttachment" DROP CONSTRAINT "MediaAttachment_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "MediaAttachment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MediaAttachment_id_seq";

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "mediaId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `mediaUrl` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "mediaUrl",
ADD COLUMN     "mediaId" BIGINT;

-- CreateTable
CREATE TABLE "MediaAttachment" (
    "id" BIGSERIAL NOT NULL,
    "statusId" BIGINT,
    "fileFileName" TEXT,
    "fileContentType" TEXT,
    "fileFileSize" INTEGER,
    "fileUpdatedAt" TIMESTAMP(3),
    "remoteUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shortcode" TEXT,
    "type" INTEGER NOT NULL DEFAULT 0,
    "fileMeta" JSONB,
    "accountId" BIGINT,
    "description" TEXT,
    "scheduledStatusId" BIGINT,
    "blurhash" TEXT,
    "processing" INTEGER,
    "fileStorageSchemaVersion" INTEGER,
    "thumbnailFileName" TEXT,
    "thumbnailContentType" TEXT,
    "thumbnailFileSize" INTEGER,
    "thumbnailUpdatedAt" TIMESTAMP(3),
    "thumbnailRemoteUrl" TEXT,

    CONSTRAINT "MediaAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

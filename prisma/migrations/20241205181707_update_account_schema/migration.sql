/*
  Warnings:

  - You are about to drop the column `avatar` on the `Account` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[avatarId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "avatar",
ADD COLUMN     "avatarId" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "Account_avatarId_key" ON "Account"("avatarId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "MediaAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

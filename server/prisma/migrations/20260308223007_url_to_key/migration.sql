/*
  Warnings:

  - You are about to drop the column `url` on the `Song` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Song" DROP COLUMN "url",
ADD COLUMN     "key" TEXT NOT NULL DEFAULT '';

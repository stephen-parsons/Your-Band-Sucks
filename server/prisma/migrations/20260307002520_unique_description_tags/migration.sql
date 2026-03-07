/*
  Warnings:

  - A unique constraint covering the columns `[description]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Tag_description_key" ON "Tag"("description");

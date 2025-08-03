/*
  Warnings:

  - You are about to drop the column `voiceoverScript` on the `scenes` table. All the data in the column will be lost.
  - Added the required column `voiceover` to the `scenes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "scenes" DROP COLUMN "voiceoverScript",
ADD COLUMN     "voiceover" TEXT NOT NULL;

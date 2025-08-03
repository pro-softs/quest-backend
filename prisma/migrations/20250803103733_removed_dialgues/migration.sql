/*
  Warnings:

  - You are about to drop the column `dialogue` on the `scenes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scenes" DROP COLUMN "dialogue",
ALTER COLUMN "orderIndex" DROP NOT NULL;

-- AlterTable
ALTER TABLE "videos" ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "topic" DROP NOT NULL,
ALTER COLUMN "subject" DROP NOT NULL,
ALTER COLUMN "genre" DROP NOT NULL,
ALTER COLUMN "ageGroup" DROP NOT NULL;

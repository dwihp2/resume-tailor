/*
  Warnings:

  - You are about to drop the column `narrative` on the `tailoring_runs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tailoring_runs" DROP COLUMN "narrative",
ADD COLUMN     "notes" TEXT;

/*
  Warnings:

  - A unique constraint covering the columns `[normalized]` on the table `Ingredient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalized` to the `Ingredient` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Ingredient_name_key";

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "normalized" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_normalized_key" ON "Ingredient"("normalized");

/*
  Warnings:

  - You are about to drop the column `amountDue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the `InvoiceItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `description` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_invoiceId_fkey";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "amountDue",
DROP COLUMN "dueDate",
DROP COLUMN "tax",
DROP COLUMN "totalAmount",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "price" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "total" DECIMAL(65,30) NOT NULL;

-- DropTable
DROP TABLE "InvoiceItem";

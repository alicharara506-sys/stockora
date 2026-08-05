-- CreateEnum
CREATE TYPE "TaxSystem" AS ENUM ('VAT', 'GST', 'SALES_TAX', 'CONSUMPTION_TAX', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaxTreatment" AS ENUM ('STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE');

-- AlterTable
ALTER TABLE "BusinessSetting" ADD COLUMN     "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxCountry" TEXT,
ADD COLUMN     "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxRegistrationNumber" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxNumber" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "pricesIncludedTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxBreakdown" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "reverseCharge" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tax" ADD COLUMN     "country" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isCompound" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "system" "TaxSystem" NOT NULL DEFAULT 'VAT',
ADD COLUMN     "treatment" "TaxTreatment" NOT NULL DEFAULT 'STANDARD';

-- CreateIndex
CREATE INDEX "Tax_businessId_isActive_idx" ON "Tax"("businessId", "isActive");

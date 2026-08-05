-- AlterTable
ALTER TABLE "BusinessSetting" ADD COLUMN     "requireCustomerAtCheckout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireCustomerEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireCustomerPhone" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "company" TEXT,
ADD COLUMN     "whatsapp" TEXT;

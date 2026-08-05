-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sizeChartId" TEXT;

-- CreateIndex
CREATE INDEX "Category_sizeChartId_idx" ON "Category"("sizeChartId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

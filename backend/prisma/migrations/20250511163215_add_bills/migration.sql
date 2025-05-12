-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNPAID', 'PAID', 'VOID');

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "diningSessionId" TEXT NOT NULL,
    "staffIdGeneratedBy" TEXT NOT NULL,
    "generationTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotalAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentConfirmationTime" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bills_diningSessionId_key" ON "bills"("diningSessionId");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_diningSessionId_fkey" FOREIGN KEY ("diningSessionId") REFERENCES "dining_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_staffIdGeneratedBy_fkey" FOREIGN KEY ("staffIdGeneratedBy") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

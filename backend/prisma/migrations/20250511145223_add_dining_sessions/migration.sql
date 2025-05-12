-- CreateEnum
CREATE TYPE "DiningSessionStatus" AS ENUM ('ACTIVE', 'BILLED', 'CLOSED');

-- CreateTable
CREATE TABLE "dining_sessions" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "reservationId" TEXT,
    "staffIdOpenedBy" TEXT NOT NULL,
    "partyIdentifier" TEXT,
    "partySize" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "DiningSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dining_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dining_sessions_reservationId_key" ON "dining_sessions"("reservationId");

-- AddForeignKey
ALTER TABLE "dining_sessions" ADD CONSTRAINT "dining_sessions_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_sessions" ADD CONSTRAINT "dining_sessions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_sessions" ADD CONSTRAINT "dining_sessions_staffIdOpenedBy_fkey" FOREIGN KEY ("staffIdOpenedBy") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

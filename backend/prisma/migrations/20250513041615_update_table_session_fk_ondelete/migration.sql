-- DropForeignKey
ALTER TABLE "dining_sessions" DROP CONSTRAINT "dining_sessions_tableId_fkey";

-- AlterTable
ALTER TABLE "dining_sessions" ALTER COLUMN "tableId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "dining_sessions" ADD CONSTRAINT "dining_sessions_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

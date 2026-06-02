-- CreateTable
CREATE TABLE "_FormAllowedRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_FormAllowedRoles_AB_unique" ON "_FormAllowedRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_FormAllowedRoles_B_index" ON "_FormAllowedRoles"("B");

-- AddForeignKey
ALTER TABLE "_FormAllowedRoles" ADD CONSTRAINT "_FormAllowedRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormAllowedRoles" ADD CONSTRAINT "_FormAllowedRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

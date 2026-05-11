ALTER TABLE "Submission"
ADD COLUMN "formSchemaSnapshot" JSONB,
ADD COLUMN "workflowId" TEXT,
ADD COLUMN "workflowVersion" INTEGER,
ADD COLUMN "workflowDefinition" JSONB;

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_prevent_update ON "AuditLog";
CREATE TRIGGER audit_log_prevent_update
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS audit_log_prevent_delete ON "AuditLog";
CREATE TRIGGER audit_log_prevent_delete
BEFORE DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();

ALTER TABLE "Form" ADD COLUMN "translations" JSONB;

ALTER TABLE "FormVersion" ADD COLUMN "translations" JSONB;

ALTER TABLE "Submission" ADD COLUMN "submittedLocale" TEXT NOT NULL DEFAULT 'de';

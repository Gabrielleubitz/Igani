-- The signed agreement PDF is no longer stored in the database: it is emailed to both parties and kept by them.
ALTER TABLE "AgreementAcceptance" DROP COLUMN "pdf";

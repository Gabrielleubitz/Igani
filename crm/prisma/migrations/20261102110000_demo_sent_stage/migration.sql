-- AlterEnum: a new pipeline stage between "Demo scheduled" and "Proposal sent" (admin-set)
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'DEMO_SENT' BEFORE 'PROPOSAL_SENT';

-- Reset Metrics Data Script
-- This script deletes all metric-related data while preserving integrations
-- Run this to test fresh AI transformer generation

-- Start transaction for safety
BEGIN;

-- 1. Unlink metrics from roles (set metricId to NULL)
UPDATE "Role" SET "metricId" = NULL WHERE "metricId" IS NOT NULL;

-- 2. Delete ChartTransformer (AI-generated chart code)
DELETE FROM "ChartTransformer";

-- 3. Delete DashboardChart (chart configurations)
DELETE FROM "DashboardChart";

-- 4. Delete MetricDataPoint (time-series data)
DELETE FROM "MetricDataPoint";

-- 5. Delete DataIngestionTransformer (AI-generated ingestion code)
DELETE FROM "DataIngestionTransformer";

-- 6. Delete Metric (metric definitions)
DELETE FROM "Metric";

-- 7. Reset SystemsCanvas (optional - clears canvas positions)
DELETE FROM "SystemsCanvas";

-- Commit if everything succeeded
COMMIT;

-- Verify what's left
SELECT 'Integrations preserved:' as status, COUNT(*) as count FROM "Integration";
SELECT 'Teams preserved:' as status, COUNT(*) as count FROM "Team";
SELECT 'Roles preserved (unlinked):' as status, COUNT(*) as count FROM "Role";

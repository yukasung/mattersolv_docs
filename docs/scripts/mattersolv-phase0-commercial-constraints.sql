-- MatterSolv Phase 0 commercial constraints for PostgreSQL 18+.
-- Apply after the base schema exported from database.ddb.

BEGIN;

-- Fail with a clear migration error instead of letting index creation report
-- only the first duplicate key. Resolve duplicate current subscriptions before
-- applying this migration to an existing database.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "subscriptions"
        WHERE "status" IN ('trialing', 'active', 'past_due', 'suspended')
        GROUP BY "tenant_id"
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Cannot enforce one current subscription per tenant: duplicate current subscriptions exist';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_subscriptions_current_per_tenant"
    ON "subscriptions" ("tenant_id")
    WHERE "status" IN ('trialing', 'active', 'past_due', 'suspended');

COMMIT;

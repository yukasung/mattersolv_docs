-- MatterSolv Phase 0 tenant isolation for PostgreSQL 18+.
-- Apply after the base schema exported from database.ddb.
--
-- Deployment contract:
-- - The Django runtime role is NOSUPERUSER, NOBYPASSRLS, and does not own tables.
-- - Only trusted runtime roles receive DML privileges on these tables.
-- - Pre-provisioning rows whose tenant_id is NULL use a separately controlled
--   provisioning role with BYPASSRLS; the normal runtime role cannot see them.
-- - X-Tenant-ID contains tenants.public_id. The server resolves it to tenants.id,
--   validates active membership, then runs
--   SET LOCAL app.tenant_id = '<verified-internal-bigint>'.

BEGIN;

-- A counter may advance and gaps are allowed, but issued numbers must never be
-- made reusable by moving next_number backwards.
CREATE OR REPLACE FUNCTION prevent_tenant_number_sequence_rewind()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.next_number < OLD.next_number THEN
        RAISE EXCEPTION 'tenant number sequence cannot move backwards'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_number_sequences_no_rewind
    ON tenant_number_sequences;
CREATE TRIGGER tenant_number_sequences_no_rewind
    BEFORE UPDATE OF next_number ON tenant_number_sequences
    FOR EACH ROW EXECUTE FUNCTION prevent_tenant_number_sequence_rewind();

CREATE OR REPLACE FUNCTION reject_department_hierarchy_cycle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.parent_department_id IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_department_id FROM departments
            WHERE tenant_id = NEW.tenant_id AND id = NEW.parent_department_id
          UNION
            SELECT department.id, department.parent_department_id
            FROM departments AS department
            JOIN ancestors ON department.id = ancestors.parent_department_id
            WHERE department.tenant_id = NEW.tenant_id
        ) SELECT 1 FROM ancestors WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'department hierarchy cannot contain a cycle' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS departments_no_cycle ON departments;
CREATE CONSTRAINT TRIGGER departments_no_cycle
AFTER INSERT OR UPDATE OF parent_department_id ON departments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION reject_department_hierarchy_cycle();

CREATE OR REPLACE FUNCTION reject_employee_manager_cycle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.manager_employee_id IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (
        WITH RECURSIVE managers AS (
            SELECT id, manager_employee_id FROM employees
            WHERE tenant_id = NEW.tenant_id AND id = NEW.manager_employee_id
          UNION
            SELECT employee.id, employee.manager_employee_id
            FROM employees AS employee
            JOIN managers ON employee.id = managers.manager_employee_id
            WHERE employee.tenant_id = NEW.tenant_id
        ) SELECT 1 FROM managers WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'employee reporting line cannot contain a cycle' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS employees_manager_no_cycle ON employees;
CREATE CONSTRAINT TRIGGER employees_manager_no_cycle
AFTER INSERT OR UPDATE OF manager_employee_id ON employees
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION reject_employee_manager_cycle();

-- Enforce tenant consistency for relationships between tenant-owned records.
-- Existing single-column foreign keys remain useful for their delete actions;
-- these composite keys add the tenant equality invariant.

ALTER TABLE "tenant_users"
    DROP CONSTRAINT IF EXISTS "fk_tenant_users_inviter_tenant";
ALTER TABLE "tenant_users"
    ADD CONSTRAINT "fk_tenant_users_inviter_tenant"
    FOREIGN KEY ("tenant_id", "invited_by_tenant_user_id") REFERENCES "tenant_users" ("tenant_id", "id");

ALTER TABLE "tenant_role_assignments"
    DROP CONSTRAINT IF EXISTS "fk_tenant_role_assignments_membership_tenant";
ALTER TABLE "tenant_role_assignments"
    ADD CONSTRAINT "fk_tenant_role_assignments_membership_tenant"
    FOREIGN KEY ("tenant_id", "tenant_user_id") REFERENCES "tenant_users" ("tenant_id", "id");
ALTER TABLE "tenant_role_assignments"
    DROP CONSTRAINT IF EXISTS "fk_tenant_role_assignments_group_tenant";
ALTER TABLE "tenant_role_assignments"
    ADD CONSTRAINT "fk_tenant_role_assignments_group_tenant"
    FOREIGN KEY ("tenant_id", "tenant_group_id") REFERENCES "tenant_groups" ("tenant_id", "id");
ALTER TABLE "tenant_role_assignments"
    DROP CONSTRAINT IF EXISTS "fk_tenant_role_assignments_assigner_tenant";
ALTER TABLE "tenant_role_assignments"
    ADD CONSTRAINT "fk_tenant_role_assignments_assigner_tenant"
    FOREIGN KEY ("tenant_id", "assigned_by_tenant_user_id") REFERENCES "tenant_users" ("tenant_id", "id");

ALTER TABLE "employees"
    DROP CONSTRAINT IF EXISTS "fk_employees_membership_tenant";
ALTER TABLE "employees"
    ADD CONSTRAINT "fk_employees_membership_tenant"
    FOREIGN KEY ("tenant_id", "tenant_user_id") REFERENCES "tenant_users" ("tenant_id", "id");

ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "fk_departments_parent_tenant";
ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_parent_tenant"
    FOREIGN KEY ("tenant_id", "parent_department_id") REFERENCES "departments" ("tenant_id", "id")
    ON DELETE RESTRICT;
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "fk_employees_department_tenant";
ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_department_tenant"
    FOREIGN KEY ("tenant_id", "department_id") REFERENCES "departments" ("tenant_id", "id")
    ON DELETE RESTRICT;
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "fk_employees_job_position_tenant";
ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_job_position_tenant"
    FOREIGN KEY ("tenant_id", "job_position_id") REFERENCES "job_positions" ("tenant_id", "id")
    ON DELETE RESTRICT;
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "fk_employees_manager_tenant";
ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_manager_tenant"
    FOREIGN KEY ("tenant_id", "manager_employee_id") REFERENCES "employees" ("tenant_id", "id")
    ON DELETE SET NULL ("manager_employee_id");

ALTER TABLE "employee_addresses"
    DROP CONSTRAINT IF EXISTS "fk_employee_addresses_employee_tenant";
ALTER TABLE "employee_addresses"
    ADD CONSTRAINT "fk_employee_addresses_employee_tenant"
    FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "employees" ("tenant_id", "id");

ALTER TABLE "audit_events"
    DROP CONSTRAINT IF EXISTS "fk_audit_events_actor_tenant";
ALTER TABLE "audit_events"
    ADD CONSTRAINT "fk_audit_events_actor_tenant"
    FOREIGN KEY ("tenant_id", "actor_tenant_user_id") REFERENCES "tenant_users" ("tenant_id", "id");

ALTER TABLE "payment_transactions"
    DROP CONSTRAINT IF EXISTS "fk_payment_transactions_checkout_tenant";
ALTER TABLE "payment_transactions"
    ADD CONSTRAINT "fk_payment_transactions_checkout_tenant"
    FOREIGN KEY ("tenant_id", "checkout_session_id") REFERENCES "checkout_sessions" ("tenant_id", "id");
ALTER TABLE "payment_transactions"
    DROP CONSTRAINT IF EXISTS "fk_payment_transactions_subscription_tenant";
ALTER TABLE "payment_transactions"
    ADD CONSTRAINT "fk_payment_transactions_subscription_tenant"
    FOREIGN KEY ("tenant_id", "subscription_id") REFERENCES "subscriptions" ("tenant_id", "id");

ALTER TABLE "payment_events"
    DROP CONSTRAINT IF EXISTS "fk_payment_events_transaction_tenant";
ALTER TABLE "payment_events"
    ADD CONSTRAINT "fk_payment_events_transaction_tenant"
    FOREIGN KEY ("tenant_id", "payment_transaction_id") REFERENCES "payment_transactions" ("tenant_id", "id");

ALTER TABLE "tenant_invitations"
    DROP CONSTRAINT IF EXISTS "fk_tenant_invitations_membership_tenant";
ALTER TABLE "tenant_invitations"
    ADD CONSTRAINT "fk_tenant_invitations_membership_tenant"
    FOREIGN KEY ("tenant_id", "tenant_user_id") REFERENCES "tenant_users" ("tenant_id", "id");
ALTER TABLE "tenant_invitations"
    DROP CONSTRAINT IF EXISTS "fk_tenant_invitations_group_tenant";
ALTER TABLE "tenant_invitations"
    ADD CONSTRAINT "fk_tenant_invitations_group_tenant"
    FOREIGN KEY ("tenant_id", "tenant_group_id") REFERENCES "tenant_groups" ("tenant_id", "id");
ALTER TABLE "tenant_invitations"
    DROP CONSTRAINT IF EXISTS "fk_tenant_invitations_inviter_tenant";
ALTER TABLE "tenant_invitations"
    ADD CONSTRAINT "fk_tenant_invitations_inviter_tenant"
    FOREIGN KEY ("tenant_id", "invited_by_tenant_user_id") REFERENCES "tenant_users" ("tenant_id", "id");

-- The tenants table uses id as its isolation key. Every other policy denies
-- NULL tenant_id values to the normal runtime role.

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenants";
CREATE POLICY tenant_isolation ON "tenants"
    FOR ALL TO PUBLIC
    USING ("id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_users" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_users";
CREATE POLICY tenant_isolation ON "tenant_users"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_groups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_groups";
CREATE POLICY tenant_isolation ON "tenant_groups"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_role_assignments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_role_assignments";
CREATE POLICY tenant_isolation ON "tenant_role_assignments"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_profiles";
CREATE POLICY tenant_isolation ON "tenant_profiles"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_addresses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_addresses";
CREATE POLICY tenant_isolation ON "tenant_addresses"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_number_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_number_sequences" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_number_sequences";
DROP POLICY IF EXISTS tenant_isolation_select ON "tenant_number_sequences";
CREATE POLICY tenant_isolation_select ON "tenant_number_sequences"
    FOR SELECT TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);
DROP POLICY IF EXISTS tenant_isolation_update ON "tenant_number_sequences";
CREATE POLICY tenant_isolation_update ON "tenant_number_sequences"
    FOR UPDATE TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "departments";
CREATE POLICY tenant_isolation ON "departments"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "job_positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_positions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "job_positions";
CREATE POLICY tenant_isolation ON "job_positions"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_select ON "audit_events";
CREATE POLICY tenant_isolation_select ON "audit_events"
    FOR SELECT TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);
DROP POLICY IF EXISTS tenant_isolation_insert ON "audit_events";
CREATE POLICY tenant_isolation_insert ON "audit_events"
    FOR INSERT TO PUBLIC
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "employees";
CREATE POLICY tenant_isolation ON "employees"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "employee_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_addresses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "employee_addresses";
CREATE POLICY tenant_isolation ON "employee_addresses"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "subscriptions";
CREATE POLICY tenant_isolation ON "subscriptions"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_entitlement_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_entitlement_overrides" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_entitlement_overrides";
CREATE POLICY tenant_isolation ON "tenant_entitlement_overrides"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "checkout_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checkout_sessions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "checkout_sessions";
CREATE POLICY tenant_isolation ON "checkout_sessions"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_transactions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "payment_transactions";
CREATE POLICY tenant_isolation ON "payment_transactions"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "payment_events";
CREATE POLICY tenant_isolation ON "payment_events"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "tenant_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_invitations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_invitations";
CREATE POLICY tenant_isolation ON "tenant_invitations"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

COMMIT;

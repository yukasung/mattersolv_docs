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

-- Employment versions retain past, current, and future assignment state.
-- Voided corrections may share an effective date, but only one active version
-- can apply to an employee on that date.
CREATE UNIQUE INDEX IF NOT EXISTS
    uq_employee_employment_versions_active_effective_date
ON employee_employment_versions (tenant_id, employee_id, effective_from)
WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_employee_employment_versions_active_lookup
ON employee_employment_versions (tenant_id, employee_id, effective_from DESC)
WHERE is_active;

-- drawDB renders DATE column checks in the canvas but its PostgreSQL exporter
-- does not emit them, so install these as executable table constraints.
ALTER TABLE employees
    DROP CONSTRAINT IF EXISTS chk_employees_contract_dates;
ALTER TABLE employees
    ADD CONSTRAINT chk_employees_contract_dates CHECK (
      contract_end_date IS NULL OR (
        contract_start_date IS NOT NULL
        AND contract_end_date >= contract_start_date
      )
    );
ALTER TABLE employee_employment_versions
    DROP CONSTRAINT IF EXISTS chk_employee_employment_versions_contract_dates;
ALTER TABLE employee_employment_versions
    ADD CONSTRAINT chk_employee_employment_versions_contract_dates CHECK (
      contract_end_date IS NULL OR (
        contract_start_date IS NOT NULL
        AND contract_end_date >= contract_start_date
      )
    );

CREATE OR REPLACE FUNCTION select_employee_employment_version(
    p_tenant_id bigint,
    p_employee_id bigint,
    p_business_date date
) RETURNS bigint
LANGUAGE sql
STABLE
AS $$
    SELECT version.id
    FROM employee_employment_versions AS version
    WHERE version.tenant_id = p_tenant_id
      AND version.employee_id = p_employee_id
      AND version.is_active
    ORDER BY
      CASE WHEN version.effective_from <= p_business_date THEN 0 ELSE 1 END,
      CASE WHEN version.effective_from <= p_business_date THEN version.effective_from END DESC,
      CASE WHEN version.effective_from > p_business_date THEN version.effective_from END ASC,
      version.id DESC
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION validate_employee_employment_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    affected_tenant_id bigint;
    affected_employee_id bigint;
    business_date date;
    selected_version_id bigint;
    employee_row employees%ROWTYPE;
    version_row employee_employment_versions%ROWTYPE;
BEGIN
    IF TG_TABLE_NAME = 'employees' THEN
        affected_tenant_id := NEW.tenant_id;
        affected_employee_id := NEW.id;
    ELSE
        affected_tenant_id := NEW.tenant_id;
        affected_employee_id := NEW.employee_id;
    END IF;

    SELECT (CURRENT_TIMESTAMP AT TIME ZONE tenant.timezone)::date
    INTO STRICT business_date
    FROM tenants AS tenant
    WHERE tenant.id = affected_tenant_id;

    SELECT * INTO STRICT employee_row
    FROM employees
    WHERE tenant_id = affected_tenant_id AND id = affected_employee_id;

    selected_version_id := select_employee_employment_version(
        affected_tenant_id,
        affected_employee_id,
        business_date
    );
    IF selected_version_id IS NULL THEN
        RAISE EXCEPTION 'employee must have an active employment version'
            USING ERRCODE = '23514';
    END IF;

    SELECT * INTO STRICT version_row
    FROM employee_employment_versions
    WHERE tenant_id = affected_tenant_id
      AND employee_id = affected_employee_id
      AND id = selected_version_id;

    IF employee_row.current_employment_version_id IS DISTINCT FROM version_row.id
       OR employee_row.department_id IS DISTINCT FROM version_row.department_id
       OR employee_row.job_position_id IS DISTINCT FROM version_row.job_position_id
       OR employee_row.manager_employee_id IS DISTINCT FROM version_row.manager_employee_id
       OR employee_row.employment_type IS DISTINCT FROM version_row.employment_type
       OR employee_row.contract_start_date IS DISTINCT FROM version_row.contract_start_date
       OR employee_row.contract_end_date IS DISTINCT FROM version_row.contract_end_date THEN
        RAISE EXCEPTION 'employee current employment snapshot is inconsistent'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_employment_snapshot_consistent ON employees;
CREATE CONSTRAINT TRIGGER employees_employment_snapshot_consistent
AFTER INSERT OR UPDATE OF current_employment_version_id, department_id,
  job_position_id, manager_employee_id, employment_type,
  contract_start_date, contract_end_date ON employees
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_employee_employment_snapshot();

DROP TRIGGER IF EXISTS employee_employment_versions_snapshot_consistent
  ON employee_employment_versions;
CREATE CONSTRAINT TRIGGER employee_employment_versions_snapshot_consistent
AFTER INSERT OR UPDATE OF tenant_id, employee_id, effective_from,
  department_id, job_position_id, manager_employee_id, employment_type,
  contract_start_date, contract_end_date, is_active
  ON employee_employment_versions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_employee_employment_snapshot();

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
    ON DELETE RESTRICT;

ALTER TABLE "employee_employment_versions"
    DROP CONSTRAINT IF EXISTS "fk_employee_employment_versions_employee_tenant";
ALTER TABLE "employee_employment_versions"
    ADD CONSTRAINT "fk_employee_employment_versions_employee_tenant"
    FOREIGN KEY ("tenant_id", "employee_id")
    REFERENCES "employees" ("tenant_id", "id") ON DELETE RESTRICT;
ALTER TABLE "employee_employment_versions"
    DROP CONSTRAINT IF EXISTS "fk_employee_employment_versions_department_tenant";
ALTER TABLE "employee_employment_versions"
    ADD CONSTRAINT "fk_employee_employment_versions_department_tenant"
    FOREIGN KEY ("tenant_id", "department_id")
    REFERENCES "departments" ("tenant_id", "id") ON DELETE RESTRICT;
ALTER TABLE "employee_employment_versions"
    DROP CONSTRAINT IF EXISTS "fk_employee_employment_versions_job_position_tenant";
ALTER TABLE "employee_employment_versions"
    ADD CONSTRAINT "fk_employee_employment_versions_job_position_tenant"
    FOREIGN KEY ("tenant_id", "job_position_id")
    REFERENCES "job_positions" ("tenant_id", "id") ON DELETE RESTRICT;
ALTER TABLE "employee_employment_versions"
    DROP CONSTRAINT IF EXISTS "fk_employee_employment_versions_manager_tenant";
ALTER TABLE "employee_employment_versions"
    ADD CONSTRAINT "fk_employee_employment_versions_manager_tenant"
    FOREIGN KEY ("tenant_id", "manager_employee_id")
    REFERENCES "employees" ("tenant_id", "id") ON DELETE RESTRICT;
ALTER TABLE "employee_employment_versions"
    DROP CONSTRAINT IF EXISTS "fk_employee_employment_versions_recorder_tenant";
ALTER TABLE "employee_employment_versions"
    ADD CONSTRAINT "fk_employee_employment_versions_recorder_tenant"
    FOREIGN KEY ("tenant_id", "recorded_by_tenant_user_id")
    REFERENCES "tenant_users" ("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "employees"
    DROP CONSTRAINT IF EXISTS "fk_employees_current_employment_version";
ALTER TABLE "employees"
    ADD CONSTRAINT "fk_employees_current_employment_version"
    FOREIGN KEY ("tenant_id", "id", "current_employment_version_id")
    REFERENCES "employee_employment_versions" ("tenant_id", "employee_id", "id")
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

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

ALTER TABLE "employee_employment_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_employment_versions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "employee_employment_versions";
DROP POLICY IF EXISTS tenant_isolation_select ON "employee_employment_versions";
CREATE POLICY tenant_isolation_select ON "employee_employment_versions"
    FOR SELECT TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);
DROP POLICY IF EXISTS tenant_isolation_insert ON "employee_employment_versions";
CREATE POLICY tenant_isolation_insert ON "employee_employment_versions"
    FOR INSERT TO PUBLIC
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);
DROP POLICY IF EXISTS tenant_isolation_update ON "employee_employment_versions";
CREATE POLICY tenant_isolation_update ON "employee_employment_versions"
    FOR UPDATE TO PUBLIC
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

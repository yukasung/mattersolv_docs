-- Run against disposable PostgreSQL 18 after loading the drawDB export and
-- mattersolv-phase0-tenant-isolation.sql.
\set ON_ERROR_STOP on

INSERT INTO auth_user (
    password, username, first_name, last_name, email,
    is_superuser, is_staff, is_active, date_joined
) VALUES (
    'unusable', 'history@example.test', '', '', 'history@example.test',
    false, false, true, now()
) RETURNING id AS actor_user_id \gset

INSERT INTO tenants (slug, name, timezone)
VALUES ('employment-history-a', 'Employment History A', 'Asia/Bangkok')
RETURNING id AS tenant_a_id \gset
INSERT INTO tenants (slug, name, timezone)
VALUES ('employment-history-b', 'Employment History B', 'Asia/Bangkok')
RETURNING id AS tenant_b_id \gset

INSERT INTO tenant_users (tenant_id, user_id, invited_email)
VALUES (:'tenant_a_id', :'actor_user_id', 'history@example.test')
RETURNING id AS actor_tenant_user_id \gset
INSERT INTO tenant_users (tenant_id, user_id, invited_email)
VALUES (:'tenant_b_id', :'actor_user_id', 'history@example.test')
RETURNING id AS tenant_b_actor_tenant_user_id \gset

INSERT INTO departments (tenant_id, code, code_key, name) VALUES
  (:'tenant_a_id', 'civil', 'civil', 'Civil'),
  (:'tenant_a_id', 'criminal', 'criminal', 'Criminal');
INSERT INTO departments (tenant_id, code, code_key, name)
VALUES (:'tenant_b_id', 'civil', 'civil', 'Civil')
RETURNING id AS tenant_b_department_id \gset
INSERT INTO job_positions (tenant_id, code, code_key, name)
VALUES (:'tenant_a_id', 'employee', 'employee', 'Employee')
RETURNING id AS tenant_a_position_id \gset

SELECT id AS tenant_a_department_id FROM departments
WHERE tenant_id = :'tenant_a_id' AND code_key = 'civil' \gset
SELECT id AS tenant_a_next_department_id FROM departments
WHERE tenant_id = :'tenant_a_id' AND code_key = 'criminal' \gset

BEGIN;
INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix, first_name, last_name,
  work_email, work_phone, department_id, job_position_id, employment_start_date,
  identity_document_type, identity_number
) VALUES (
  :'tenant_a_id', 'HIST-MGR', 'hist-mgr', 'mr', 'History', 'Manager',
  'history-manager@example.test', '+66810001001', :'tenant_a_department_id',
  :'tenant_a_position_id', DATE '2000-01-01', 'national_id', '1100000000001'
) RETURNING id AS manager_employee_id \gset
INSERT INTO employee_employment_versions (
  tenant_id, employee_id, effective_from, department_id, job_position_id,
  employment_type, contract_start_date, recorded_by_tenant_user_id
) VALUES (
  :'tenant_a_id', :'manager_employee_id', DATE '2000-01-01',
  :'tenant_a_department_id', :'tenant_a_position_id', 'employee',
  DATE '2000-01-01', :'actor_tenant_user_id'
) RETURNING id AS manager_initial_version_id \gset
UPDATE employees SET
  current_employment_version_id = :'manager_initial_version_id',
  employment_type = 'employee', contract_start_date = DATE '2000-01-01'
WHERE id = :'manager_employee_id';
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

BEGIN;
INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix, first_name, last_name,
  work_email, work_phone, department_id, job_position_id, manager_employee_id,
  employment_start_date, identity_document_type, identity_number
) VALUES (
  :'tenant_a_id', 'HIST-SUB', 'hist-sub', 'ms', 'History', 'Subordinate',
  'history-subordinate@example.test', '+66810001002', :'tenant_a_department_id',
  :'tenant_a_position_id', :'manager_employee_id', DATE '2000-01-01',
  'national_id', '1100000000002'
) RETURNING id AS subordinate_employee_id \gset
INSERT INTO employee_employment_versions (
  tenant_id, employee_id, effective_from, department_id, job_position_id,
  manager_employee_id, employment_type, contract_start_date,
  recorded_by_tenant_user_id
) VALUES (
  :'tenant_a_id', :'subordinate_employee_id', DATE '2000-01-01',
  :'tenant_a_department_id', :'tenant_a_position_id', :'manager_employee_id',
  'employee', DATE '2000-01-01', :'actor_tenant_user_id'
) RETURNING id AS subordinate_version_id \gset
UPDATE employees SET
  current_employment_version_id = :'subordinate_version_id',
  employment_type = 'employee', contract_start_date = DATE '2000-01-01'
WHERE id = :'subordinate_employee_id';
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

BEGIN;
INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix, first_name, last_name,
  work_email, work_phone, employment_start_date,
  identity_document_type, identity_number
) VALUES (
  :'tenant_b_id', 'HIST-B', 'hist-b', 'mr', 'Tenant', 'Bee',
  'history-b@example.test', '+66810001003', DATE '2000-01-01',
  'national_id', '1100000000003'
) RETURNING id AS tenant_b_employee_id \gset
INSERT INTO employee_employment_versions (
  tenant_id, employee_id, effective_from, employment_type,
  recorded_by_tenant_user_id
) VALUES (
  :'tenant_b_id', :'tenant_b_employee_id', DATE '2000-01-01', 'employee',
  :'tenant_b_actor_tenant_user_id'
) RETURNING id AS tenant_b_version_id \gset
UPDATE employees SET
  current_employment_version_id = :'tenant_b_version_id',
  employment_type = 'employee'
WHERE id = :'tenant_b_employee_id';
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  department_a bigint := (SELECT department.id FROM departments AS department JOIN tenants AS tenant ON tenant.id = department.tenant_id WHERE tenant.slug = 'employment-history-a' AND department.code_key = 'civil');
  position_a bigint := (SELECT position.id FROM job_positions AS position JOIN tenants AS tenant ON tenant.id = position.tenant_id WHERE tenant.slug = 'employment-history-a' AND position.code_key = 'employee');
  actor_a bigint := (SELECT membership.id FROM tenant_users AS membership JOIN tenants AS tenant ON tenant.id = membership.tenant_id WHERE tenant.slug = 'employment-history-a');
BEGIN
  BEGIN
    INSERT INTO employee_employment_versions (
      tenant_id, employee_id, effective_from, department_id, job_position_id,
      recorded_by_tenant_user_id
    ) VALUES (
      tenant_a, employee_a, DATE '2000-01-01', department_a, position_a, actor_a
    );
    RAISE EXCEPTION 'Duplicate active effective date was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  department_b bigint := (SELECT department.id FROM departments AS department JOIN tenants AS tenant ON tenant.id = department.tenant_id WHERE tenant.slug = 'employment-history-b');
  position_a bigint := (SELECT position.id FROM job_positions AS position JOIN tenants AS tenant ON tenant.id = position.tenant_id WHERE tenant.slug = 'employment-history-a');
  actor_a bigint := (SELECT membership.id FROM tenant_users AS membership JOIN tenants AS tenant ON tenant.id = membership.tenant_id WHERE tenant.slug = 'employment-history-a');
BEGIN
  BEGIN
    INSERT INTO employee_employment_versions (
      tenant_id, employee_id, effective_from, department_id, job_position_id,
      recorded_by_tenant_user_id
    ) VALUES (
      tenant_a, employee_a, DATE '2002-01-01', department_b, position_a, actor_a
    );
    RAISE EXCEPTION 'Cross-tenant employment reference was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  actor_b bigint := (SELECT membership.id FROM tenant_users AS membership JOIN tenants AS tenant ON tenant.id = membership.tenant_id WHERE tenant.slug = 'employment-history-b');
BEGIN
  BEGIN
    INSERT INTO employee_employment_versions (
      tenant_id, employee_id, effective_from, recorded_by_tenant_user_id
    ) VALUES (tenant_a, employee_a, DATE '2002-01-01', actor_b);
    RAISE EXCEPTION 'Cross-tenant recorder was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  another_version bigint := (SELECT id FROM employee_employment_versions WHERE employee_id = (SELECT id FROM employees WHERE employee_number = 'HIST-SUB'));
BEGIN
  BEGIN
    UPDATE employees SET current_employment_version_id = another_version
    WHERE id = employee_a;
    SET CONSTRAINTS fk_employees_current_employment_version IMMEDIATE;
    RAISE EXCEPTION 'Current pointer accepted another employee version';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  other_department bigint := (SELECT department.id FROM departments AS department JOIN tenants AS tenant ON tenant.id = department.tenant_id WHERE tenant.slug = 'employment-history-a' AND department.code_key = 'criminal');
BEGIN
  BEGIN
    UPDATE employees SET department_id = other_department WHERE id = employee_a;
    SET CONSTRAINTS employees_employment_snapshot_consistent IMMEDIATE;
    RAISE EXCEPTION 'Snapshot mismatch was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  actor_a bigint := (SELECT membership.id FROM tenant_users AS membership JOIN tenants AS tenant ON tenant.id = membership.tenant_id WHERE tenant.slug = 'employment-history-a');
BEGIN
  BEGIN
    INSERT INTO employee_employment_versions (
      tenant_id, employee_id, effective_from, contract_start_date,
      contract_end_date, recorded_by_tenant_user_id
    ) VALUES (
      tenant_a, employee_a, DATE '2002-01-01', DATE '2025-12-31',
      DATE '2025-01-01', actor_a
    );
    RAISE EXCEPTION 'Invalid contract date range was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  actor_a bigint := (SELECT membership.id FROM tenant_users AS membership JOIN tenants AS tenant ON tenant.id = membership.tenant_id WHERE tenant.slug = 'employment-history-a');
BEGIN
  BEGIN
    INSERT INTO employee_employment_versions (
      tenant_id, employee_id, effective_from, manager_employee_id,
      recorded_by_tenant_user_id
    ) VALUES (tenant_a, employee_a, DATE '2002-01-01', employee_a, actor_a);
    RAISE EXCEPTION 'Self-manager version was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

BEGIN;
INSERT INTO employee_employment_versions (
  tenant_id, employee_id, effective_from, department_id, job_position_id,
  employment_type, contract_start_date, recorded_by_tenant_user_id
) VALUES (
  :'tenant_a_id', :'manager_employee_id', DATE '2001-01-01',
  :'tenant_a_next_department_id', :'tenant_a_position_id', 'contractor',
  DATE '2001-01-01', :'actor_tenant_user_id'
) RETURNING id AS manager_current_version_id \gset
UPDATE employees SET
  current_employment_version_id = :'manager_current_version_id',
  department_id = :'tenant_a_next_department_id', employment_type = 'contractor',
  contract_start_date = DATE '2001-01-01'
WHERE id = :'manager_employee_id';
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  employee_a bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  expected_version bigint := (SELECT id FROM employee_employment_versions WHERE employee_id = employee_a AND effective_from = DATE '2001-01-01' AND is_active);
BEGIN
  IF select_employee_employment_version(tenant_a, employee_a, DATE '2026-09-02')
       IS DISTINCT FROM expected_version THEN
    RAISE EXCEPTION 'Latest effective version was not selected';
  END IF;
END $$;

BEGIN;
INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix, first_name, last_name,
  work_email, work_phone, employment_start_date,
  identity_document_type, identity_number
) VALUES (
  :'tenant_a_id', 'HIST-FUTURE', 'hist-future', 'ms', 'Future', 'Employee',
  'history-future@example.test', '+66810001004', DATE '2999-01-01',
  'national_id', '1100000000004'
) RETURNING id AS future_employee_id \gset
INSERT INTO employee_employment_versions (
  tenant_id, employee_id, effective_from, employment_type,
  recorded_by_tenant_user_id
) VALUES
  (:'tenant_a_id', :'future_employee_id', DATE '2999-02-01', 'employee', :'actor_tenant_user_id'),
  (:'tenant_a_id', :'future_employee_id', DATE '2999-01-01', 'trainee', :'actor_tenant_user_id')
RETURNING id, effective_from;
SELECT id AS future_current_version_id FROM employee_employment_versions
WHERE employee_id = :'future_employee_id' AND effective_from = DATE '2999-01-01' \gset
UPDATE employees SET
  current_employment_version_id = :'future_current_version_id',
  employment_type = 'trainee'
WHERE id = :'future_employee_id';
INSERT INTO employee_employment_versions (
  tenant_id, employee_id, effective_from, employment_type, is_active,
  recorded_by_tenant_user_id
) VALUES (
  :'tenant_a_id', :'future_employee_id', DATE '2099-01-01', 'worker', false,
  :'actor_tenant_user_id'
);
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  future_employee bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-FUTURE');
  expected_version bigint := (SELECT id FROM employee_employment_versions WHERE employee_id = future_employee AND effective_from = DATE '2999-01-01' AND is_active);
  inactive_version bigint := (SELECT id FROM employee_employment_versions WHERE employee_id = future_employee AND NOT is_active);
  selected_version bigint;
BEGIN
  selected_version := select_employee_employment_version(tenant_a, future_employee, DATE '2026-09-02');
  IF selected_version IS DISTINCT FROM expected_version THEN
    RAISE EXCEPTION 'Earliest future version was not selected';
  END IF;
  IF selected_version = inactive_version THEN
    RAISE EXCEPTION 'Inactive version participated in selection';
  END IF;
END $$;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'employment-history-a');
  manager_id bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-MGR');
  subordinate_id bigint := (SELECT id FROM employees WHERE employee_number = 'HIST-SUB');
  current_department bigint := (SELECT department_id FROM employees WHERE id = manager_id);
  current_position bigint := (SELECT job_position_id FROM employees WHERE id = manager_id);
  actor_a bigint := (SELECT membership.id FROM tenant_users AS membership JOIN tenants AS tenant ON tenant.id = membership.tenant_id WHERE tenant.slug = 'employment-history-a');
  cycle_version bigint;
BEGIN
  BEGIN
    INSERT INTO employee_employment_versions (
      tenant_id, employee_id, effective_from, department_id, job_position_id,
      manager_employee_id, employment_type, contract_start_date,
      recorded_by_tenant_user_id
    ) VALUES (
      tenant_a, manager_id, DATE '2002-01-01', current_department,
      current_position, subordinate_id, 'contractor', DATE '2001-01-01', actor_a
    ) RETURNING id INTO cycle_version;
    UPDATE employees SET
      current_employment_version_id = cycle_version,
      manager_employee_id = subordinate_id
    WHERE id = manager_id;
    SET CONSTRAINTS employees_manager_no_cycle IMMEDIATE;
    RAISE EXCEPTION 'Current manager cycle was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

UPDATE employees SET status = 'archived' WHERE employee_number = 'HIST-MGR';
DO $$
DECLARE
  employee_a employees%ROWTYPE;
BEGIN
  SELECT * INTO STRICT employee_a FROM employees WHERE employee_number = 'HIST-MGR';
  IF employee_a.current_employment_version_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM employee_employment_versions
       WHERE employee_id = employee_a.id
     ) THEN
    RAISE EXCEPTION 'Archiving employee removed employment history';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'mattersolv_employment_history_test_runtime'
  ) THEN
    CREATE ROLE mattersolv_employment_history_test_runtime
      NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO mattersolv_employment_history_test_runtime;
GRANT SELECT, INSERT, UPDATE ON employee_employment_versions
  TO mattersolv_employment_history_test_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO mattersolv_employment_history_test_runtime;

SET ROLE mattersolv_employment_history_test_runtime;
BEGIN;
SELECT set_config('app.tenant_id', :'tenant_a_id', true);
SELECT set_config('app.test_tenant_b_id', :'tenant_b_id', true);
DO $$
DECLARE
  tenant_b bigint := current_setting('app.test_tenant_b_id')::bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM employee_employment_versions WHERE tenant_id = tenant_b
  ) THEN
    RAISE EXCEPTION 'RLS exposed Tenant B employment history to Tenant A';
  END IF;
  BEGIN
    DELETE FROM employee_employment_versions
    WHERE id = (SELECT min(id) FROM employee_employment_versions);
    RAISE EXCEPTION 'Runtime role deleted employment history';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
COMMIT;
RESET ROLE;

\echo 'Verified effective-dated employment history, snapshot integrity, RLS, and lifecycle'

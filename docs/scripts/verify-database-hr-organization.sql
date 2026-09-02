-- Run against disposable PostgreSQL 18 after loading the drawDB export and
-- mattersolv-phase0-tenant-isolation.sql.
\set ON_ERROR_STOP on

INSERT INTO tenants (slug, name) VALUES ('hr-org-a', 'HR Organization A') RETURNING id AS tenant_a_id \gset
INSERT INTO tenants (slug, name) VALUES ('hr-org-b', 'HR Organization B') RETURNING id AS tenant_b_id \gset
INSERT INTO departments (tenant_id, code, code_key, name) VALUES
  (:'tenant_a_id', 'civil', 'civil', 'Civil'),
  (:'tenant_a_id', 'criminal', 'criminal', 'Criminal');
INSERT INTO departments (tenant_id, code, code_key, name)
VALUES (:'tenant_b_id', 'civil', 'civil', 'Civil') RETURNING id AS tenant_b_department_id \gset
INSERT INTO job_positions (tenant_id, code, code_key, name)
VALUES (:'tenant_a_id', 'employee', 'employee', 'Employee') RETURNING id AS tenant_a_position_id \gset
INSERT INTO job_positions (tenant_id, code, code_key, name)
VALUES (:'tenant_b_id', 'employee', 'employee', 'Employee') RETURNING id AS tenant_b_position_id \gset
SELECT id AS tenant_a_department_id FROM departments
WHERE tenant_id = :'tenant_a_id' AND code_key = 'civil' \gset

INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix, first_name, last_name,
  work_email, work_phone, department_id, job_position_id, employment_start_date,
  identity_document_type, identity_number
) VALUES (
  :'tenant_a_id', 'EMP-MGR', 'emp-mgr', 'mr', 'Manager', 'One',
  'manager@example.test', '+66810000001', :'tenant_a_department_id',
  :'tenant_a_position_id', DATE '2026-01-01', 'national_id', '1000000000001'
) RETURNING id AS manager_employee_id \gset
INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix, first_name, last_name,
  work_email, work_phone, department_id, job_position_id, manager_employee_id,
  employment_start_date, identity_document_type, identity_number
) VALUES (
  :'tenant_a_id', 'EMP-SUB', 'emp-sub', 'ms', 'Subordinate', 'One',
  'subordinate@example.test', '+66810000002', :'tenant_a_department_id',
  :'tenant_a_position_id', :'manager_employee_id', DATE '2026-01-01',
  'national_id', '1000000000002'
) RETURNING id AS subordinate_employee_id \gset

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'hr-org-a');
  tenant_b_department bigint := (SELECT department.id FROM departments AS department JOIN tenants AS tenant ON tenant.id = department.tenant_id WHERE tenant.slug = 'hr-org-b' AND department.code_key = 'civil');
  subordinate bigint := (SELECT id FROM employees WHERE employee_number = 'EMP-SUB');
  tenant_a_position bigint := (SELECT position.id FROM job_positions AS position JOIN tenants AS tenant ON tenant.id = position.tenant_id WHERE tenant.slug = 'hr-org-a' AND position.code_key = 'employee');
BEGIN
  BEGIN
    UPDATE employees SET department_id = tenant_b_department WHERE id = subordinate;
    RAISE EXCEPTION 'Cross-tenant department was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO departments (tenant_id, code, code_key, name)
    VALUES (tenant_a, 'CIVIL', 'civil', 'Duplicate');
    RAISE EXCEPTION 'Duplicate normalized department code was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE employees SET manager_employee_id = id WHERE id = subordinate;
    RAISE EXCEPTION 'Self-manager was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    DELETE FROM job_positions WHERE id = tenant_a_position;
    RAISE EXCEPTION 'Deleting an in-use job position was accepted';
  EXCEPTION WHEN restrict_violation OR foreign_key_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'hr-org-a');
  tenant_a_department bigint := (SELECT department.id FROM departments AS department JOIN tenants AS tenant ON tenant.id = department.tenant_id WHERE tenant.slug = 'hr-org-a' AND department.code_key = 'civil');
  child_department_id bigint;
BEGIN
  INSERT INTO departments (tenant_id, code, code_key, name, parent_department_id)
  VALUES (tenant_a, 'appeals', 'appeals', 'Appeals', tenant_a_department)
  RETURNING id INTO child_department_id;
  BEGIN
    UPDATE departments SET parent_department_id = child_department_id WHERE id = tenant_a_department;
    SET CONSTRAINTS departments_no_cycle IMMEDIATE;
    RAISE EXCEPTION 'Department cycle was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$
DECLARE
  manager bigint := (SELECT id FROM employees WHERE employee_number = 'EMP-MGR');
  subordinate bigint := (SELECT id FROM employees WHERE employee_number = 'EMP-SUB');
BEGIN
  BEGIN
    UPDATE employees SET manager_employee_id = subordinate WHERE id = manager;
    SET CONSTRAINTS employees_manager_no_cycle IMMEDIATE;
    RAISE EXCEPTION 'Employee manager cycle was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DELETE FROM employees WHERE employee_number = 'EMP-MGR';
DO $$
BEGIN
  IF (SELECT manager_employee_id FROM employees WHERE employee_number = 'EMP-SUB') IS NOT NULL THEN
    RAISE EXCEPTION 'Manager deletion did not clear manager_employee_id';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mattersolv_hr_org_test_runtime') THEN
    CREATE ROLE mattersolv_hr_org_test_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO mattersolv_hr_org_test_runtime;
GRANT SELECT ON departments, job_positions TO mattersolv_hr_org_test_runtime;
SET ROLE mattersolv_hr_org_test_runtime;
BEGIN;
SELECT set_config('app.tenant_id', :'tenant_a_id', true);
SELECT set_config('app.test_tenant_b_id', :'tenant_b_id', true);
DO $$
DECLARE tenant_b bigint := current_setting('app.test_tenant_b_id')::bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM departments WHERE tenant_id = tenant_b) THEN
    RAISE EXCEPTION 'RLS exposed Tenant B departments to Tenant A';
  END IF;
END $$;
COMMIT;
RESET ROLE;

\echo 'Verified tenant HR organization constraints, RLS, and lifecycle'

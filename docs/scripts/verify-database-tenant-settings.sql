-- Run against a disposable PostgreSQL 18 database after loading the drawDB
-- export and mattersolv-phase0-tenant-isolation.sql.
\set ON_ERROR_STOP on

INSERT INTO tenants (slug, name)
VALUES ('tenant-settings-a', 'Tenant Settings A')
RETURNING id AS tenant_a_id \gset
INSERT INTO tenants (slug, name)
VALUES ('tenant-settings-b', 'Tenant Settings B')
RETURNING id AS tenant_b_id \gset

INSERT INTO tenant_users (tenant_id, invited_email, status)
VALUES (:'tenant_a_id', 'owner@tenant-settings-a.example.test', 'active')
RETURNING id AS tenant_a_actor_id \gset

INSERT INTO tenant_profiles (tenant_id, company_email, website)
SELECT id, slug || '@example.test', 'https://' || slug || '.example.test'
FROM tenants WHERE slug LIKE 'tenant-settings-%';

INSERT INTO tenant_addresses (tenant_id, building)
SELECT id, '1 Test Building' FROM tenants WHERE slug LIKE 'tenant-settings-%';

INSERT INTO tenant_number_sequences (tenant_id, sequence_key, prefix)
SELECT tenant.id, defaults.sequence_key, defaults.prefix
FROM tenants AS tenant
CROSS JOIN (VALUES
    ('client', 'CUS-'),
    ('employee', 'EMP-'),
    ('matter', 'MAT-'),
    ('quotation', 'QT-')
) AS defaults(sequence_key, prefix)
WHERE tenant.slug LIKE 'tenant-settings-%';

DO $$
DECLARE
    sequence_count integer;
BEGIN
    SELECT count(*) INTO sequence_count
    FROM tenant_number_sequences
    WHERE next_number = 1 AND padding = 5;
    IF sequence_count <> 8 THEN
        RAISE EXCEPTION 'Expected eight provisioned default sequences, got %', sequence_count;
    END IF;

    IF (SELECT prefix || lpad(next_number::text, padding, '0')
        FROM tenant_number_sequences AS sequence
        JOIN tenants AS tenant ON tenant.id = sequence.tenant_id
        WHERE tenant.slug = 'tenant-settings-a' AND sequence_key = 'matter') <> 'MAT-00001' THEN
        RAISE EXCEPTION 'Matter number formatting contract failed';
    END IF;
END $$;

DO $$
DECLARE tenant_a bigint := (SELECT id FROM tenants WHERE slug = 'tenant-settings-a');
BEGIN
    BEGIN
        INSERT INTO tenant_number_sequences (tenant_id, sequence_key, prefix)
        VALUES (tenant_a, 'matter', 'DUP-');
        RAISE EXCEPTION 'Duplicate sequence key was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO tenant_number_sequences (tenant_id, sequence_key, prefix)
        VALUES (tenant_a, 'unknown', 'BAD-');
        RAISE EXCEPTION 'Unknown sequence key was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE tenant_number_sequences SET prefix = ''
        WHERE tenant_id = tenant_a AND sequence_key = 'client';
        RAISE EXCEPTION 'Empty prefix was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE tenant_number_sequences SET next_number = 0
        WHERE tenant_id = tenant_a AND sequence_key = 'client';
        RAISE EXCEPTION 'Invalid counter was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    UPDATE tenant_number_sequences SET next_number = 2
    WHERE tenant_id = tenant_a AND sequence_key = 'client';
    BEGIN
        UPDATE tenant_number_sequences SET next_number = 1
        WHERE tenant_id = tenant_a AND sequence_key = 'client';
        RAISE EXCEPTION 'Sequence rewind was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE tenant_number_sequences SET padding = 13
        WHERE tenant_id = tenant_a AND sequence_key = 'client';
        RAISE EXCEPTION 'Invalid padding was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO audit_events (tenant_id, action, entity_type)
        VALUES (tenant_a, 'tenant.number_format_changed', 'tenant_number_sequence');
        RAISE EXCEPTION 'Incomplete number format audit event was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO audit_events (
            tenant_id, actor_tenant_user_id, action, entity_type, before_data, after_data
        ) VALUES (
            tenant_a,
            (SELECT id FROM tenant_users WHERE tenant_id = tenant_a LIMIT 1),
            'tenant.number_format_changed',
            'tenant_number_sequence',
            '{"prefix":null,"padding":"bad"}',
            '{"prefix":"MAT-","padding":5}'
        );
        RAISE EXCEPTION 'Malformed number format audit event was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mattersolv_settings_test_runtime') THEN
        CREATE ROLE mattersolv_settings_test_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
    END IF;
END $$;
GRANT USAGE ON SCHEMA public TO mattersolv_settings_test_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    tenants, tenant_profiles, tenant_addresses, tenant_number_sequences, audit_events
    TO mattersolv_settings_test_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mattersolv_settings_test_runtime;

SET ROLE mattersolv_settings_test_runtime;
BEGIN;
SELECT set_config('app.tenant_id', :'tenant_a_id', true);
SELECT set_config('app.test_tenant_b_id', :'tenant_b_id', true);
SELECT set_config('app.test_actor_id', :'tenant_a_actor_id', true);

DO $$
DECLARE visible_count integer;
DECLARE changed_count integer;
DECLARE tenant_a bigint := current_setting('app.tenant_id')::bigint;
DECLARE tenant_b bigint := current_setting('app.test_tenant_b_id')::bigint;
DECLARE actor_id bigint := current_setting('app.test_actor_id')::bigint;
BEGIN
    SELECT count(*) INTO visible_count FROM tenant_number_sequences;
    IF visible_count <> 4 THEN
        RAISE EXCEPTION 'RLS expected four Tenant A sequences, got %', visible_count;
    END IF;

    UPDATE tenant_number_sequences SET prefix = 'LEAK-'
    WHERE tenant_id = tenant_b;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 0 THEN
        RAISE EXCEPTION 'RLS allowed Tenant A to update Tenant B';
    END IF;

    DELETE FROM tenant_number_sequences
    WHERE tenant_id = tenant_a AND sequence_key = 'client';
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 0 THEN
        RAISE EXCEPTION 'Runtime role deleted a provisioned number sequence';
    END IF;

    BEGIN
        INSERT INTO tenant_number_sequences (tenant_id, sequence_key, prefix)
        VALUES (tenant_a, 'client', 'RESET-');
        RAISE EXCEPTION 'Runtime role recreated a number sequence';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    INSERT INTO audit_events (
        tenant_id, actor_tenant_user_id, action, entity_type, before_data, after_data
    ) VALUES (
        tenant_a,
        actor_id,
        'tenant.number_format_changed',
        'tenant_number_sequence',
        '{"prefix":"MAT-","padding":5}',
        '{"prefix":"CASE-","padding":6}'
    );

    UPDATE audit_events SET action = 'tampered';
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 0 THEN
        RAISE EXCEPTION 'Append-only audit event was updated';
    END IF;

    DELETE FROM audit_events;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 0 THEN
        RAISE EXCEPTION 'Append-only audit event was deleted';
    END IF;
END $$;

COMMIT;
RESET ROLE;

CREATE TABLE tenant_settings_allocation_results (
    issued_number bigint PRIMARY KEY
);
GRANT INSERT ON tenant_settings_allocation_results TO mattersolv_settings_test_runtime;

\echo 'Verified tenant settings constraints, defaults, formatting, RLS, and append-only audit policy'

-- Run against a disposable PostgreSQL 18 database after exporting database.ddb.
-- Verifies the runtime behavior of BIGINT internal keys and UUID v7 public keys.
\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    tenant_internal_id BIGINT;
    tenant_public_id UUID;
    membership_internal_id BIGINT;
    django_user_id BIGINT;
BEGIN
    INSERT INTO tenants (slug, name)
    VALUES ('hybrid-key-test', 'Hybrid key test')
    RETURNING id, public_id INTO tenant_internal_id, tenant_public_id;

    IF pg_typeof(tenant_internal_id) <> 'bigint'::regtype THEN
        RAISE EXCEPTION 'tenants.id is not BIGINT';
    END IF;
    IF uuid_extract_version(tenant_public_id) <> 7 THEN
        RAISE EXCEPTION 'tenants.public_id is not UUID v7';
    END IF;
    IF (SELECT id FROM tenants WHERE public_id = tenant_public_id) <> tenant_internal_id THEN
        RAISE EXCEPTION 'public tenant UUID did not resolve to the internal BIGINT key';
    END IF;

    INSERT INTO auth_user (
        password, is_superuser, username, first_name, last_name, email,
        is_staff, is_active, date_joined
    ) VALUES (
        'pbkdf2_sha256$placeholder', false, 'hybrid-key@example.test', '', '',
        'hybrid-key@example.test', false, true, now()
    ) RETURNING id INTO django_user_id;

    INSERT INTO tenant_users (
        tenant_id, user_id, invited_email, status, invitation_status
    ) VALUES (
        tenant_internal_id, django_user_id, 'hybrid-key@example.test',
        'active', 'accepted'
    ) RETURNING id INTO membership_internal_id;

    IF pg_typeof(membership_internal_id) <> 'bigint'::regtype THEN
        RAISE EXCEPTION 'tenant_users.id is not BIGINT';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM tenant_users membership
        JOIN tenants tenant ON tenant.id = membership.tenant_id
        WHERE membership.id = membership_internal_id
          AND tenant.public_id = tenant_public_id
    ) THEN
        RAISE EXCEPTION 'membership does not join through the internal BIGINT tenant key';
    END IF;

    BEGIN
        INSERT INTO tenants (public_id, slug, name)
        VALUES (tenant_public_id, 'duplicate-public-id', 'Duplicate public ID');
        RAISE EXCEPTION 'duplicate public_id was accepted';
    EXCEPTION WHEN unique_violation THEN
        NULL;
    END;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'tenant_role_assignments'
          AND column_name = 'public_id'
    ) THEN
        RAISE EXCEPTION 'internal join table exposes a redundant public_id';
    END IF;
END
$$;

CREATE ROLE hybrid_identifier_runtime_test NOSUPERUSER NOBYPASSRLS;
GRANT SELECT ON tenants, tenant_users TO hybrid_identifier_runtime_test;

INSERT INTO tenants (public_id, slug, name)
VALUES (
    '0199b000-0000-7000-8000-000000000011',
    'rls-hybrid-tenant-a',
    'RLS hybrid tenant A'
)
RETURNING id AS tenant_a_id \gset

INSERT INTO tenants (public_id, slug, name)
VALUES (
    '0199b000-0000-7000-8000-000000000012',
    'rls-hybrid-tenant-b',
    'RLS hybrid tenant B'
)
RETURNING id AS tenant_b_id \gset

SET LOCAL ROLE hybrid_identifier_runtime_test;
SELECT set_config('app.tenant_id', :'tenant_a_id', true);

DO $$
BEGIN
    IF (SELECT count(*) FROM tenants) <> 1 THEN
        RAISE EXCEPTION 'BIGINT tenant context did not isolate tenants';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM tenants
        WHERE public_id = '0199b000-0000-7000-8000-000000000011'
    ) THEN
        RAISE EXCEPTION 'tenant selected by internal BIGINT context is not tenant A';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM tenants
        WHERE public_id = '0199b000-0000-7000-8000-000000000012'
    ) THEN
        RAISE EXCEPTION 'tenant B leaked through tenant A RLS context';
    END IF;
END
$$;

RESET ROLE;

ROLLBACK;

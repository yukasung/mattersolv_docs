-- Run against a disposable PostgreSQL 18 database after exporting and loading database.ddb.
-- The transaction is rolled back so this fixture can be rerun safely.
\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    protected_tenant BIGINT;
    unused_tenant BIGINT;
    user_id BIGINT;
BEGIN
    INSERT INTO tenants (public_id, slug, name)
    VALUES ('0199b000-0000-7000-8000-000000000001', 'protected-tenant', 'Protected tenant')
    RETURNING id INTO protected_tenant;

    INSERT INTO tenants (public_id, slug, name)
    VALUES ('0199b000-0000-7000-8000-000000000002', 'unused-tenant', 'Unused tenant')
    RETURNING id INTO unused_tenant;

    BEGIN
        UPDATE tenants SET status = 'archived' WHERE id = protected_tenant;
        RAISE EXCEPTION 'archived tenant without archived_at was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    UPDATE tenants
    SET status = 'archived', archived_at = now()
    WHERE id = protected_tenant;

    INSERT INTO auth_user (
        password, is_superuser, username, first_name, last_name, email,
        is_staff, is_active, date_joined
    ) VALUES (
        'pbkdf2_sha256$placeholder', false, 'tenant-owner@example.test', '', '',
        'tenant-owner@example.test', false, true, now()
    ) RETURNING id INTO user_id;

    INSERT INTO tenant_users (
        tenant_id, user_id, invited_email, status, invitation_status
    ) VALUES (
        protected_tenant, user_id, 'tenant-owner@example.test', 'active', 'accepted'
    );

    BEGIN
        DELETE FROM tenants WHERE id = protected_tenant;
        RAISE EXCEPTION 'referenced tenant was deleted';
    EXCEPTION WHEN restrict_violation OR foreign_key_violation THEN
        NULL;
    END;

    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = protected_tenant) THEN
        RAISE EXCEPTION 'protected tenant no longer exists';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tenant_users WHERE tenant_id = protected_tenant) THEN
        RAISE EXCEPTION 'tenant membership no longer exists';
    END IF;

    DELETE FROM tenants WHERE id = unused_tenant;
    IF EXISTS (SELECT 1 FROM tenants WHERE id = unused_tenant) THEN
        RAISE EXCEPTION 'unused tenant was not deleted';
    END IF;
END
$$;

ROLLBACK;

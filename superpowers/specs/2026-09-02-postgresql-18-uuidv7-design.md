# PostgreSQL 18 UUID v7 identifiers

## Goal

Use time-ordered UUID v7 identifiers throughout the MatterSolv Phase 0 schema so
new rows retain globally unique, opaque identifiers while producing more
index-friendly insertion order than random UUID v4 values.

## Platform contract

- MatterSolv targets PostgreSQL 18 or later on Cloud SQL.
- Database-generated identifiers use PostgreSQL's native `uuidv7()` function.
- The column type remains `UUID`; foreign-key shapes and API identifier formats do
  not change.
- No custom UUID extension or application-side UUID generator is introduced.

## Schema changes

Change the default of every UUID primary-key field in the 19 Phase 0 tables from
`gen_random_uuid()` to `uuidv7()`. Applying the rule consistently avoids mixed
identifier-generation policies across catalog, membership, employee, entitlement,
subscription, payment, event, and invitation tables.

Existing UUID values remain valid and require no rewrite. The change affects only
rows created after the migration. UUID v7 embeds creation time, so identifiers
must not be treated as secrets; authorization continues to rely on verified tenant
membership, permissions, and RLS.

Add a drawDB note stating the PostgreSQL 18 minimum and the native UUID v7 default.
The generated SQL must contain `DEFAULT uuidv7()` for all 19 primary keys and must
not contain `DEFAULT gen_random_uuid()`.

## Migration behavior

The future Django migration changes database defaults without modifying primary
keys or foreign keys. Deployments must upgrade or provision PostgreSQL 18 before
applying that migration. Rollback restores `gen_random_uuid()` as the default;
UUID v7 rows created in the meantime remain valid UUID values.

## Verification

- Validate that the diagram remains PostgreSQL with 19 tables and 34 relationships.
- Validate every table has one UUID primary key whose default is `uuidv7()`.
- Export PostgreSQL SQL and confirm all 19 primary-key defaults use `uuidv7()`.
- Import the exported SQL back into drawDB and confirm the schema shape survives.
- Run the drawDB MCP type-check and complete test suite.

## Out of scope

- Rewriting existing UUID v4 identifiers.
- Adding a UUID v7 implementation for PostgreSQL 17 or earlier.
- Creating Django models or migrations in this change.
- Inferring record creation time from UUIDs in application business logic; the
  authoritative timestamp remains `created_at`.

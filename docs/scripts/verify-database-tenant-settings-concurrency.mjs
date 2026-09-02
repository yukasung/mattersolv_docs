import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'

const psql = process.env.PSQL ?? 'psql'
const clients = 8
const transactionsPerClient = 25
const totalTransactions = clients * transactionsPerClient

function runSync(sql) {
  const result = spawnSync(psql, ['-X', '-v', 'ON_ERROR_STOP=1', '-At'], {
    encoding: 'utf8',
    env: process.env,
    input: sql
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout.trim()
}

const [tenantId, initialNextNumber] = runSync(`
  SELECT tenant.id, sequence.next_number
  FROM tenants AS tenant
  JOIN tenant_number_sequences AS sequence ON sequence.tenant_id = tenant.id
  WHERE tenant.slug = 'tenant-settings-a' AND sequence.sequence_key = 'matter';
`).split('|').map(Number)

assert.ok(Number.isSafeInteger(tenantId), 'Tenant A fixture must exist')
assert.ok(Number.isSafeInteger(initialNextNumber), 'Matter sequence fixture must exist')
runSync('TRUNCATE tenant_settings_allocation_results;')

const allocation = `
BEGIN;
SET LOCAL ROLE mattersolv_settings_test_runtime;
SELECT set_config('app.tenant_id', '${tenantId}', true);
WITH issued AS (
  UPDATE tenant_number_sequences
  SET next_number = next_number + 1,
      last_issued_at = now(),
      updated_at = now()
  WHERE tenant_id = ${tenantId} AND sequence_key = 'matter'
  RETURNING next_number - 1 AS issued_number
)
INSERT INTO tenant_settings_allocation_results (issued_number)
SELECT issued_number FROM issued;
COMMIT;
`.repeat(transactionsPerClient)

await Promise.all(Array.from({ length: clients }, () => new Promise((resolve, reject) => {
  const child = spawn(psql, ['-X', '-v', 'ON_ERROR_STOP=1', '-q'], {
    env: process.env,
    stdio: ['pipe', 'ignore', 'pipe']
  })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => { stderr += chunk })
  child.on('error', reject)
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr)))
  child.stdin.end(allocation)
})))

const [count, minimum, maximum, nextNumber] = runSync(`
  SELECT count(*), min(issued_number), max(issued_number),
    (SELECT next_number FROM tenant_number_sequences
     WHERE tenant_id = ${tenantId} AND sequence_key = 'matter')
  FROM tenant_settings_allocation_results;
`).split('|').map(Number)

assert.equal(count, totalTransactions)
assert.equal(minimum, initialNextNumber)
assert.equal(maximum, initialNextNumber + totalTransactions - 1)
assert.equal(nextNumber, initialNextNumber + totalTransactions)
console.log(`Verified ${totalTransactions} concurrent atomic allocations without duplicate numbers`)

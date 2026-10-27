import { describe, it, expect } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { ensureSchema } from '../../server/schema-migration.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('concurrent PostgreSQL bootstrap', () => {
  it('serializes cold table/type creation across independent app pools', async () => {
    const name = `bootstrap_${randomUUID().replaceAll('-', '')}`;
    const pools = Array.from({length: 8}, () => new Pool({connectionString: process.env.TEST_DATABASE_URL, max: 1}));
    try {
      const ddl = `CREATE TABLE IF NOT EXISTS ${name} (id integer PRIMARY KEY, value text NOT NULL); CREATE INDEX IF NOT EXISTS ${name}_value ON ${name}(value)`;
      await Promise.all(pools.map(pool => ensureSchema(pool, name, ddl)));
      await pools[0].query(`INSERT INTO ${name} VALUES (1, 'ready')`);
      expect((await pools[1].query(`SELECT value FROM ${name}`)).rows).toEqual([{value:'ready'}]);
      await expect(ensureSchema(pools[0], name, 'INVALID SQL')).rejects.toThrow();
      await ensureSchema(pools[0], name, ddl); // Rollback released the connection and transaction lock.
    } finally {
      await pools[0].query(`DROP TABLE IF EXISTS ${name}`);
      await Promise.all(pools.map(pool => pool.end()));
    }
  });
});

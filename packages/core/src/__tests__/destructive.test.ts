import { describe, expect, it } from 'vitest';
import { checkDestructive } from '../destructive.js';

const deny = (command: string, type: 'shell' | 'db_write' | 'file' = 'shell') =>
  checkDestructive({ type, command });

describe('deterministic destructive rules', () => {
  it('blocks DROP TABLE', () => {
    expect(deny('DROP TABLE users;', 'db_write').matched).toBe(true);
    expect(deny('drop   table  customers', 'db_write').rule).toBe('sql.drop_table');
  });

  it('blocks DROP DATABASE / SCHEMA', () => {
    expect(deny('DROP DATABASE prod', 'db_write').matched).toBe(true);
    expect(deny('drop schema public cascade', 'db_write').matched).toBe(true);
  });

  it('blocks TRUNCATE', () => {
    expect(deny('TRUNCATE TABLE orders', 'db_write').rule).toBe('sql.truncate');
    expect(deny('truncate payments', 'db_write').matched).toBe(true);
  });

  it('blocks DELETE/UPDATE without WHERE', () => {
    expect(deny('DELETE FROM accounts;', 'db_write').rule).toBe('sql.unscoped_mutation');
    expect(deny('update users set admin = true', 'db_write').matched).toBe(true);
  });

  it('allows DELETE/UPDATE with WHERE', () => {
    expect(deny('DELETE FROM accounts WHERE id = 5;', 'db_write').matched).toBe(false);
    expect(deny("update users set name='x' where id=1", 'db_write').matched).toBe(false);
  });

  it('blocks rm -rf variants', () => {
    expect(deny('rm -rf /').matched).toBe(true);
    expect(deny('rm -fr ./build').matched).toBe(true);
    expect(deny('sudo rm -rf --no-preserve-root /').rule).toBe('shell.rm_rf');
  });

  it('blocks disk wipe / fork bomb', () => {
    expect(deny('mkfs.ext4 /dev/sda').matched).toBe(true);
    expect(deny('dd if=/dev/zero of=/dev/sda').matched).toBe(true);
  });

  it('blocks .env and secret reads', () => {
    expect(deny('cat .env').rule).toBe('secret.env_read');
    expect(deny('cat .env.production').matched).toBe(true);
    expect(deny('cat ~/.aws/credentials').matched).toBe(true);
    expect(deny('cat /etc/secrets/db', 'file').matched).toBe(true);
  });

  it('blocks production-scoped destructive verbs', () => {
    expect(deny('terraform destroy -target prod_db').matched).toBe(true);
    expect(deny('kubectl delete ns production').matched).toBe(true);
  });

  it('blocks force-push to protected branches', () => {
    expect(deny('git push --force origin main').matched).toBe(true);
  });

  it('does not flag benign commands', () => {
    expect(deny('ls -la').matched).toBe(false);
    expect(deny('SELECT * FROM users WHERE id = 1', 'db_write').matched).toBe(false);
    expect(deny('npm install').matched).toBe(false);
    expect(deny('git push origin feature/x').matched).toBe(false);
  });

  it('ignores payments (handled by financial signals, not destructive rules)', () => {
    expect(checkDestructive({ type: 'payment', command: 'DROP TABLE users' }).matched).toBe(false);
  });
});

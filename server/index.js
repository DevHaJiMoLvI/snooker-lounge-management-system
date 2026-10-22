import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const databaseName = process.env.PGDATABASE || 'shender_club_prototype';
if (!/^[A-Za-z0-9_-]+$/.test(databaseName)) throw new Error('PGDATABASE may only contain letters, numbers, underscores, and hyphens.');
const psqlPath = process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const commonArgs = ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-w', '-h', process.env.PGHOST || '127.0.0.1', '-p', String(process.env.PGPORT || 5432), '-U', process.env.PGUSER || 'postgres'];
const psqlEnv = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || '', PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT || '3' };
function runSql(sql, database = databaseName) {
  return new Promise((resolve, reject) => {
    const child = spawn(psqlPath, [...commonArgs, '-d', database], { env: psqlEnv, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `psql exited with code ${code}`)));
    child.stdin.end(sql);
  });
}
let databaseReady = false;
async function ensureSchema() {
  if (databaseReady) return;
  try { await runSql('SELECT 1'); }
  catch {
    const createDatabaseSql = 'CREATE DATABASE "' + databaseName + '"';
    try { await runSql(createDatabaseSql, 'postgres'); }
    catch (error) { if (!/already exists/i.test(error.message)) throw error; }
  }
  await runSql("CREATE TABLE IF NOT EXISTS crm_records (collection TEXT NOT NULL, record_id TEXT NOT NULL, location_id TEXT NOT NULL DEFAULT 'main', payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (collection, record_id)); CREATE INDEX IF NOT EXISTS crm_records_location_idx ON crm_records (location_id);");
  databaseReady = true;
}
const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
const allowedCollections = new Set(['sessions', 'players', 'inventory', 'expenses', 'cues', 'users', 'locations', 'tables', 'notifications']);
const sendJson = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/postgres/health' && req.method === 'GET') {
    try { await ensureSchema(); return sendJson(res, 200, { ok: true, database: databaseName }); }
    catch (error) { return sendJson(res, 503, { ok: false, error: 'PostgreSQL is unavailable. Start its service and check the project .env settings.' }); }
  }
  if (req.url === '/api/postgres/snapshot' && req.method === 'GET') {
    try {
      await ensureSchema();
      const output = await runSql("SELECT COALESCE(json_agg(json_build_object('collection', collection, 'record_id', record_id, 'location_id', location_id, 'payload', payload)), '[]'::json)::text FROM crm_records;");
      const rows = JSON.parse(output || '[]');
      const stores = {};
      const appStorage = {};
      for (const row of rows) {
        if (row.collection === 'tables') appStorage[row.record_id] = JSON.stringify(row.payload);
        else (stores[row.collection] ||= []).push(row.payload);
      }
      return sendJson(res, 200, { stores, appStorage, recordCount: rows.length });
    } catch (error) {
      console.error('PostgreSQL read failed:', error.message);
      return sendJson(res, 503, { error: 'Could not read from PostgreSQL. Check that PostgreSQL is running and configured.' });
    }
  }
  if (req.url === '/api/postgres/snapshot' && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 80 * 1024 * 1024) return sendJson(res, 413, { error: 'Database snapshot is too large.' }); }
      const snapshot = JSON.parse(body || '{}');
      if (!snapshot.stores || typeof snapshot.stores !== 'object' || !snapshot.appStorage || typeof snapshot.appStorage !== 'object') return sendJson(res, 400, { error: 'Invalid database snapshot.' });
      const records = [];
      for (const [collection, values] of Object.entries(snapshot.stores)) {
        if (!allowedCollections.has(collection) || !Array.isArray(values)) return sendJson(res, 400, { error: `Invalid collection: ${collection}` });
        for (const value of values) if (value && value.id != null) records.push([collection, String(value.id), String(value.locationId || 'main'), JSON.stringify(value)]);
      }
      for (const [key, value] of Object.entries(snapshot.appStorage)) {
        if (!key.startsWith('shender_tables') || typeof value !== 'string') continue;
        let payload; try { payload = JSON.parse(value); } catch { continue; }
        if (!Array.isArray(payload)) continue;
        const location = key === 'shender_tables' ? 'main' : key.slice('shender_tables_'.length) || 'main';
        records.push(['tables', key, location, JSON.stringify(payload)]);
      }
      await ensureSchema();
      const statements = ['BEGIN', 'DELETE FROM crm_records'];
      for (const [collection, id, locationId, payload] of records) statements.push(`INSERT INTO crm_records (collection, record_id, location_id, payload) VALUES (${quote(collection)}, ${quote(id)}, ${quote(locationId)}, ${quote(payload)}::jsonb)`);
      statements.push('COMMIT');
      await runSql(statements.join('; ') + ';');
      return sendJson(res, 200, { ok: true, savedRecords: records.length, savedAt: new Date().toISOString() });
    } catch (error) {
      console.error('PostgreSQL save failed:', error.message);
      return sendJson(res, 503, { error: 'Could not save to PostgreSQL. Check its service and the project .env settings.' });
    }
  }
  return sendJson(res, 404, { error: 'Not found' });
});
const port = Number(process.env.API_PORT || 4001);
server.listen(port, '127.0.0.1', () => console.log(`Local PostgreSQL API listening on http://127.0.0.1:${port}`));


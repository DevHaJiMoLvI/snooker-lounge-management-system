import db from './localDB';

let status = 'checking';
let syncInFlight = null;
const BOOTSTRAP_KEY = 'shender_postgres_bootstrapped';
const reportStatus = next => {
  status = next;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('shender:postgres-status', { detail: next }));
};
export const getPostgresSyncStatus = () => status;

async function getSnapshot() {
  const response = await fetch('/api/postgres/snapshot');
  if (!response.ok) throw new Error(`PostgreSQL API returned ${response.status}`);
  return response.json();
}

async function buildSnapshot(database = db) {
  const stores = {};
  for (const table of database.tables) stores[table.name] = await table.toArray();
  const appStorage = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith('shender_tables')) appStorage[key] = localStorage.getItem(key);
  }
  return { stores, appStorage };
}

async function pushSnapshot(database = db) {
  const snapshot = await buildSnapshot(database);
  const response = await fetch('/api/postgres/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot)
  });
  if (!response.ok) throw new Error(`PostgreSQL save failed (${response.status})`);
  return response.json();
}

export async function initializePostgres(database = db) {
  try {
    const remote = await getSnapshot();
    const isFirstConnection = localStorage.getItem(BOOTSTRAP_KEY) !== '1';
    const hasSavedTables = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).some(key => key?.startsWith('shender_tables'));
    const hasLocalRecords = hasSavedTables || await Promise.all(['sessions', 'players', 'expenses', 'cues'].map(name => database[name].count())).then(counts => counts.some(count => count > 0));
    if (isFirstConnection && !hasLocalRecords && remote.recordCount > 0) {
      await database.transaction('rw', database.tables, async () => {
        for (const table of database.tables) {
          const remoteRecords = remote.stores?.[table.name];
          if (Array.isArray(remoteRecords) && remoteRecords.length) await table.bulkPut(remoteRecords);
        }
      });
      for (const [key, value] of Object.entries(remote.appStorage || {})) {
        if (key.startsWith('shender_tables') && typeof value === 'string' && localStorage.getItem(key) === null) localStorage.setItem(key, value);
      }
    }
    const result = await pushSnapshot(database);
    localStorage.setItem(BOOTSTRAP_KEY, '1');
    reportStatus('saved');
    return result;
  } catch (error) {
    console.warn('PostgreSQL is not available; continuing with the local browser database.', error.message);
    reportStatus('offline');
    return null;
  }
}

export async function syncToPostgres(database = db) {
  if (localStorage.getItem(BOOTSTRAP_KEY) !== '1') return initializePostgres(database);
  if (syncInFlight) return syncInFlight;
  syncInFlight = pushSnapshot(database)
    .then(result => { reportStatus('saved'); return result; })
    .catch(error => { reportStatus('offline'); return null; })
    .finally(() => { syncInFlight = null; });
  return syncInFlight;
}



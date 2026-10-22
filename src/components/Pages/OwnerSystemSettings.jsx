import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { firestore } from '../../config/firebase';
import { getPostgresSyncStatus } from '../../db/postgresSync';
import db from '../../db/localDB';

const BACKUP_FORMAT = 'shender-club-backup';
const BACKUP_VERSION = 1;
const APP_STORAGE_PREFIX = 'shender_tables';

export default function OwnerSystemSettings() {
  const { user } = useAuth();
  const { syncStatus, pendingChanges, tables, players, inventory } = useApp();
  const [postgresStatus, setPostgresStatus] = useState(getPostgresSyncStatus());
  useEffect(() => { const listener = event => setPostgresStatus(event.detail); window.addEventListener('shender:postgres-status', listener); return () => window.removeEventListener('shender:postgres-status', listener); }, []);
  const [backupMessage, setBackupMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);
  const cloudConfigured = Boolean(firestore);
  const storageValue = cloudConfigured ? (syncStatus === 'syncing' ? 'Uploading changes' : syncStatus === 'online' ? 'Firebase configured' : 'Cloud unavailable') : (postgresStatus === 'saved' ? 'PostgreSQL on this laptop' : postgresStatus === 'checking' ? 'Checking PostgreSQL' : 'Local only');
  const storageDetail = cloudConfigured ? 'This device uploads pending records to Firebase.' : postgresStatus === 'saved' ? 'CRM records are saved to PostgreSQL on this laptop.' : 'PostgreSQL is not connected. The local browser copy remains available until it starts.';
  const item = (label, value, detail) => <div style={{ padding: 15, borderBottom: '1px solid #334155' }}><div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div><strong style={{ display: 'block', marginTop: 5, color: '#f1f5f9' }}>{value}</strong>{detail && <small style={{ display: 'block', marginTop: 4, color: '#64748b' }}>{detail}</small>}</div>;

  const exportBackup = async () => {
    setBusy(true);
    setBackupMessage('');
    try {
      const stores = {};
      for (const table of db.tables) stores[table.name] = await table.toArray();
      const appStorage = {};
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key?.startsWith(APP_STORAGE_PREFIX)) appStorage[key] = localStorage.getItem(key);
      }
      const payload = { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date().toISOString(), stores, appStorage };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shender-club-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupMessage('Backup downloaded. Keep it somewhere safe on your laptop or an external drive.');
    } catch (error) {
      console.error('Backup export failed:', error);
      setBackupMessage('Could not create the backup. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setBackupMessage('');
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.format !== BACKUP_FORMAT || backup?.version !== BACKUP_VERSION || !backup.stores || typeof backup.stores !== 'object') {
        throw new Error('This is not a supported Snooker Club backup file.');
      }
      const storeNames = new Set(db.tables.map(table => table.name));
      if (Object.keys(backup.stores).some(name => !storeNames.has(name) || !Array.isArray(backup.stores[name]))) {
        throw new Error('The backup contains unknown or invalid database records.');
      }
      if (!window.confirm('Restore this backup? This replaces the current local database and table data on this browser. Download a backup of the current data first if you may need it.')) return;
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          const records = backup.stores[table.name] || [];
          await table.clear();
          if (records.length) await table.bulkPut(records);
        }
      });
      for (let index = localStorage.length - 1; index >= 0; index--) {
        const key = localStorage.key(index);
        if (key?.startsWith(APP_STORAGE_PREFIX)) localStorage.removeItem(key);
      }
      for (const [key, value] of Object.entries(backup.appStorage || {})) {
        if (key.startsWith(APP_STORAGE_PREFIX) && typeof value === 'string') localStorage.setItem(key, value);
      }
      setBackupMessage('Backup restored. Reload the page to show the restored data.');
    } catch (error) {
      console.error('Backup restore failed:', error);
      setBackupMessage(error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message || 'Could not restore this backup.');
    } finally {
      setBusy(false);
    }
  };

  return <div style={{ padding: 28, color: '#f1f5f9', minHeight: '100%' }}>
    <h1 style={{ margin: 0 }}>System Settings</h1><p style={{ color: '#94a3b8', margin: '6px 0 22px' }}>Owner access, local data, and sync status.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
      <section style={panel}><h2 style={heading}>Owner profile</h2>{item('Signed in as', user?.name || user?.username || 'Owner', user?.username ? `Username: ${user.username}` : '')}{item('Access level', 'Owner', 'Owner dashboard and staff account management')}</section>
      <section style={panel}><h2 style={heading}>System status</h2>{item('Data storage', storageValue, storageDetail)}{item('Pending changes', cloudConfigured ? pendingChanges : postgresStatus === 'saved' ? 'Saved to PostgreSQL' : 'Waiting for PostgreSQL', cloudConfigured ? 'Local records waiting to upload' : postgresStatus === 'saved' ? 'Browser data is backed up to this laptop’s PostgreSQL database.' : 'Start PostgreSQL to send the local records to the database.')}{item('Local data', 'Available', `${tables.length} tables · ${players.length} players · ${inventory.length} canteen items`)}</section>
      <section style={panel}>
        <h2 style={heading}>Database backup</h2>
        <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>Download a portable copy of the local database to your laptop, or restore a previous backup.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy} onClick={exportBackup} style={button('#16a34a')}>{busy ? 'Please wait…' : 'Download backup'}</button>
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} style={button('#2563eb')}>Restore backup</button>
          <input ref={fileInput} type="file" accept="application/json,.json" onChange={restoreBackup} style={{ display: 'none' }} />
        </div>
        <small style={{ display: 'block', color: '#fbbf24', marginTop: 12, lineHeight: 1.5 }}>Backup files include all local records, including user account details. Store them securely. Restoring replaces this browser’s current local data.</small>
        {backupMessage && <div role="status" style={{ marginTop: 12, color: '#bfdbfe' }}>{backupMessage}</div>}
      </section>
    </div>
  </div>;
}

const panel = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 18 };
const heading = { margin: '0 0 5px', fontSize: 17 };
const button = background => ({ background, color: 'white', border: 0, borderRadius: 8, padding: '11px 15px', fontWeight: 700, cursor: 'pointer' });





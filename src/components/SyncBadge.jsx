import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { firestore } from '../config/firebase';
import { getPostgresSyncStatus } from '../db/postgresSync';

const states = {
  saved: { label: 'PostgreSQL saved', color: '#4ade80' },
  checking: { label: 'Checking PostgreSQL…', color: '#60a5fa' },
  offline: { label: 'Local only · PostgreSQL unavailable', color: '#fbbf24' }
};

export default function SyncBadge() {
  const { syncStatus, pendingChanges } = useApp();
  const [postgresStatus, setPostgresStatus] = useState(getPostgresSyncStatus());
  useEffect(() => {
    const onStatus = event => setPostgresStatus(event.detail);
    window.addEventListener('shender:postgres-status', onStatus);
    return () => window.removeEventListener('shender:postgres-status', onStatus);
  }, []);
  const state = firestore
    ? { label: syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'online' ? 'Online' : 'Offline', color: syncStatus === 'online' ? '#4ade80' : '#fbbf24' }
    : (states[postgresStatus] || states.checking);
  const pendingLabel = firestore && pendingChanges > 0 ? ` · ${pendingChanges} pending` : '';
  const title = firestore
    ? pendingChanges ? `${pendingChanges} changes waiting to upload` : 'No pending cloud changes'
    : postgresStatus === 'saved' ? 'Local changes are being backed up to PostgreSQL on this laptop.' : 'The CRM still works locally; PostgreSQL backup is unavailable until its service starts.';
  return <div title={title} style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'center', gap: 7, width: 'fit-content', maxWidth: 'calc(100% - 32px)', boxSizing: 'border-box', flexWrap: 'wrap', margin: '10px 16px 0 auto', padding: '6px 10px', borderRadius: 999, background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 12 }}>
    <span style={{ width: 8, height: 8, borderRadius: 50, background: state.color, boxShadow: `0 0 8px ${state.color}` }} />
    {state.label}{pendingLabel}
  </div>;
}

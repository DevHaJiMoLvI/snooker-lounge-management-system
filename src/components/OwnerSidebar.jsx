import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import db from '../db/localDB';
import { PAGES } from '../utils/constants';

const items = [
  [PAGES.DASHBOARD, 'Dashboard'],
  [PAGES.TABLE_MANAGEMENT, 'Table Management'],
  [PAGES.CANTEEN, 'Shop'],
  [PAGES.PLAYER_RECORDS, 'Player Credits'],
  [PAGES.EXPENSES, 'Financial Reports'],
  [PAGES.OWNER_PANEL, 'Staff Management'],
  [PAGES.OWNER_AUDIT, 'Audit Log'],
  [PAGES.OWNER_SETTINGS, 'System Settings']
];

export default function OwnerSidebar() {
  const { currentPage, setCurrentPage, locationId, selectOwnerLocation } = useApp();
  const { user, logout } = useAuth();
  const [locations, setLocations] = useState([]);
  useEffect(() => { db.locations.toArray().then(setLocations); }, []);
  const inputStyle = { width: '100%', boxSizing: 'border-box', marginTop: 7, padding: '10px 9px', borderRadius: 8, border: '1px solid #475569', background: '#0f172a', color: 'white', font: 'inherit' };
  const actionStyle = active => ({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', border: 0, borderRadius: 8, background: active ? '#334155' : 'transparent', color: active ? 'white' : '#cbd5e1', textAlign: 'left', fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer' });
  return <aside className="prototype-sidebar prototype-owner-sidebar" style={{ width: 238, flex: '0 0 238px', display: 'flex', flexDirection: 'column', padding: '22px 14px 16px', boxSizing: 'border-box', background: '#172338', borderRight: '1px solid #334155' }}>
    <div style={{ padding: '0 10px', marginBottom: 26 }}><div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 800, letterSpacing: 1.3 }}>OWNER PORTAL</div><div style={{ marginTop: 6, fontSize: 18, color: 'white', fontWeight: 900 }}>786-SHENDER-1</div><div style={{ color: '#94a3b8', fontSize: 12, marginTop: 5 }}>{user?.name || 'Owner'}</div></div>
    <label style={{ display: 'block', padding: '0 10px', marginBottom: 14, color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.7 }}>Current lounge<select value={locationId} onChange={e => selectOwnerLocation(e.target.value)} style={inputStyle}>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
    <nav style={{ display: 'grid', gap: 5, flex: 1, alignContent: 'start' }}>{items.map(([id, label]) => <button key={id} onClick={() => setCurrentPage(id)} style={actionStyle(currentPage === id)}>{label}</button>)}</nav>
    <button onClick={logout} style={{ ...actionStyle(false), marginTop: 18, color: 'white', background: '#ef4444', justifyContent: 'center' }}>↪ Logout</button>
  </aside>;
}


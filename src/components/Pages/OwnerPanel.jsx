import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import db from '../../db/localDB';

export default function OwnerPanel() {
  const { isOwner, createAdminUser, createLocation, deleteStaffUser } = useAuth();
  const { locationId, selectOwnerLocation } = useApp();
  const [form, setForm] = useState({ name: '', username: '', password: '', confirm: '', locationId: 'main', shiftStart: '', shiftEnd: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [staff, setStaff] = useState([]);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [locations, setLocations] = useState([]);
  const [newLocationName, setNewLocationName] = useState('');

  const loadStaff = async () => setStaff((await db.users.toArray()).filter(account => account.role !== 'owner'));
  const loadLocations = async () => setLocations(await db.locations.toArray());
  useEffect(() => { if (isOwner) { loadStaff(); loadLocations(); } }, [isOwner]);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (form.password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    const result = await createAdminUser(form);
    if (!result.ok) { setError(result.error); return; }
    setMessage(`Admin account “${form.username.trim()}” created.`);
    setForm({ name: '', username: '', password: '', confirm: '', locationId: 'main', shiftStart: '', shiftEnd: '' });
    setShowForm(false);
    loadStaff();
  };

  const removeStaff = async () => {
    if (!deleteTarget) return;
    setError('');
    const result = await deleteStaffUser(deleteTarget.id);
    if (!result.ok) { setError(result.error); return; }
    setMessage(`Staff account “${deleteTarget.username || deleteTarget.name}” deleted.`);
    setDeleteTarget(null);
    await loadStaff();
  };

  const addLocation = async e => {
    e.preventDefault();
    setError('');
    const result = await createLocation(newLocationName);
    if (!result.ok) { setError(result.error); return; }
    setNewLocationName('');
    await loadLocations();
    setForm(current => ({ ...current, locationId: result.location.id }));
    setMessage(`Lounge “${result.location.name}” added.`);
  };

  const field = { width: '100%', boxSizing: 'border-box', marginTop: 7, padding: 12, borderRadius: 8, border: '1px solid #475569', background: '#0f172a', color: 'white', font: 'inherit' };
  const button = (bg) => ({ padding: '11px 16px', border: 0, borderRadius: 8, background: bg, color: 'white', fontWeight: 800, cursor: 'pointer' });

  return <div style={{ padding: 32, color: '#f1f5f9', minHeight: '100%' }}>
    <h1 style={{ margin: '0 0 8px' }}>Staff Management</h1>
    <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>Manage staff access and administrator accounts.</p>
    <section style={{ maxWidth: 1000, padding: 24, borderRadius: 14, background: '#1e293b', border: '1px solid #334155' }}>
      <h2 style={{ margin: '0 0 8px' }}>Admin accounts</h2>
      <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>Create lounge locations and assign each staff account to one lounge. Each location has its own tables, sessions, players, stock, expenses, and reports.</p>
      {isOwner && <div style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', margin: '18px 0', padding: 16, borderRadius: 12, background: '#0f172a' }}>
        <label style={{ minWidth: 220, flex: 1, color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Owner view location<select value={locationId} onChange={e => selectOwnerLocation(e.target.value)} style={field}>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
        <form onSubmit={addLocation} style={{ display: 'flex', gap: 8, flex: 2, minWidth: 280 }}><input aria-label="New lounge name" placeholder="New lounge name" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} style={{ ...field, flex: 1 }} /><button type="submit" style={button('#2563eb')}>+ Add Lounge</button></form>
      </div>}
      {isOwner && <div style={{ overflowX: 'auto', margin: '16px 0' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr>{['Staff member', 'Username', 'Lounge', 'Shift', 'Access'].map(label => <th key={label} style={{ padding: 10, color: '#94a3b8', borderBottom: '1px solid #334155' }}>{label}</th>)}</tr></thead><tbody>{staff.map(account => <tr key={account.id} style={{ borderBottom: '1px solid #334155' }}><td style={{ padding: 10 }}>{account.name}</td><td style={{ padding: 10, color: '#cbd5e1' }}>{account.username || 'admin'}</td><td style={{ padding: 10 }}>{locations.find(location => location.id === (account.locationId || 'main'))?.name || 'Main Lounge'}</td><td style={{ padding: 10, color: '#cbd5e1' }}>{account.shiftStart && account.shiftEnd ? `${account.shiftStart} – ${account.shiftEnd}` : 'Not set'}</td><td style={{ padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => { setPasswordTarget(account); setNewPassword(''); setError(''); }} style={button('#2563eb')}>Change password</button><button onClick={() => { setDeleteTarget(account); setError(''); }} style={button('#dc2626')}>Delete user</button></td></tr>)}</tbody></table></div>}
      {!isOwner ? <div style={{ color: '#fbbf24', padding: 14, borderRadius: 8, background: '#422006' }}>Owner access is required to create admin accounts.</div> : <button onClick={() => { setShowForm(true); setError(''); setMessage(''); }} style={button('#16a34a')}>+ Create Admin User</button>}
      {message && <p role="status" style={{ color: '#4ade80', marginBottom: 0 }}>{message}</p>}
    </section>
    {showForm && isOwner && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.78)' }} onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
      <form onSubmit={submit} style={{ width: 'min(500px, 96vw)', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', padding: 24, borderRadius: 16, background: '#1e293b', border: '1px solid #475569', boxShadow: '0 24px 70px #0008' }}>
        <h2 style={{ margin: '0 0 6px' }}>Create Admin User</h2><p style={{ margin: '0 0 20px', color: '#94a3b8' }}>Add a staff username and password.</p>
        <label style={{ display: 'block', marginBottom: 14, fontSize: 13, color: '#cbd5e1', fontWeight: 700 }}>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={field} /></label>
        <label style={{ display: 'block', marginBottom: 14, fontSize: 13, color: '#cbd5e1', fontWeight: 700 }}>Username<input required autoComplete="off" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={field} /></label>
        <label style={{ display: 'block', marginBottom: 14, fontSize: 13, color: '#cbd5e1', fontWeight: 700 }}>Password<input required type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={field} /></label>
        <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', fontWeight: 700 }}>Confirm password<input required type="password" autoComplete="new-password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} style={field} /></label>
        <label style={{ display: 'block', marginTop: 14, fontSize: 13, color: '#cbd5e1', fontWeight: 700 }}>Lounge location<select required value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })} style={field}>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
        <fieldset style={{ margin: '16px 0 0', padding: 12, border: '1px solid #475569', borderRadius: 10 }}><legend style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Shift time (optional)</legend><div style={{ display: 'flex', gap: 12 }}><label style={{ flex: 1, color: '#94a3b8', fontSize: 12 }}>Start<input type="time" value={form.shiftStart} onChange={e => setForm({ ...form, shiftStart: e.target.value })} style={field} /></label><label style={{ flex: 1, color: '#94a3b8', fontSize: 12 }}>End<input type="time" value={form.shiftEnd} onChange={e => setForm({ ...form, shiftEnd: e.target.value })} style={field} /></label></div></fieldset>
        {error && <p role="alert" style={{ color: '#fca5a5', marginBottom: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}><button type="button" onClick={() => setShowForm(false)} style={{ ...button('#334155'), flex: 1 }}>Cancel</button><button type="submit" style={{ ...button('#16a34a'), flex: 1 }}>Create Account</button></div>
      </form>
    </div>}
    {passwordTarget && isOwner && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.78)' }} onMouseDown={e => { if (e.target === e.currentTarget) setPasswordTarget(null); }}>
      <form onSubmit={async e => { e.preventDefault(); if (newPassword.length < 4) { setError('Password must be at least 4 characters.'); return; } await db.users.update(passwordTarget.id, { password: newPassword, pin: newPassword }); setPasswordTarget(null); setMessage(`Password updated for ${passwordTarget.name}.`); }} style={{ width: 'min(420px, 96vw)', boxSizing: 'border-box', padding: 24, borderRadius: 16, background: '#1e293b', border: '1px solid #475569' }}>
        <h2 style={{ margin: '0 0 6px' }}>Change staff password</h2><p style={{ color: '#94a3b8' }}>{passwordTarget.name} · {passwordTarget.username || 'admin'}</p>
        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>New password<input autoFocus required type="password" minLength="4" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={field} /></label>
        {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button type="button" onClick={() => { setPasswordTarget(null); setError(''); }} style={{ ...button('#334155'), flex: 1 }}>Cancel</button><button type="submit" style={{ ...button('#16a34a'), flex: 1 }}>Save Password</button></div>
      </form>
    </div>}
    {deleteTarget && isOwner && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.78)' }} onMouseDown={e => { if (e.target === e.currentTarget) { setDeleteTarget(null); setError(''); } }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" style={{ width: 'min(420px, 96vw)', boxSizing: 'border-box', padding: 24, borderRadius: 16, background: '#1e293b', border: '1px solid #7f1d1d', boxShadow: '0 24px 70px #0008' }}>
        <h2 id="delete-user-title" style={{ margin: '0 0 8px' }}>Delete staff user?</h2>
        <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>This will permanently remove <strong>{deleteTarget.name}</strong> ({deleteTarget.username || 'admin'}) and prevent that account from signing in.</p>
        {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button onClick={() => { setDeleteTarget(null); setError(''); }} style={{ ...button('#334155'), flex: 1 }}>Cancel</button><button onClick={removeStaff} style={{ ...button('#dc2626'), flex: 1 }}>Delete user</button></div>
      </section>
    </div>}
  </div>;
}


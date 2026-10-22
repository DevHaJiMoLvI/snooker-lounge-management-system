import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function CueManagement() {
  const { cues, addCue, updateCue } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', brand: '', status: 'Available' });
  const submit = async event => {
    event.preventDefault();
    if (!form.name.trim()) return;
    await addCue({ name: form.name.trim(), brand: form.brand.trim(), status: form.status, createdAt: Date.now() });
    setForm({ name: '', brand: '', status: 'Available' });
    setShowForm(false);
  };
  const field = { width: '100%', boxSizing: 'border-box', marginTop: 6, padding: 11, borderRadius: 8, border: '1px solid #475569', background: '#0f172a', color: 'white' };
  return <div style={{ padding: 28, color: '#f1f5f9', minHeight: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><div><h1 style={{ margin: 0 }}>Cue Management</h1><p style={{ margin: '6px 0 0', color: '#94a3b8' }}>Track club cues and their availability.</p></div><button onClick={() => setShowForm(true)} style={button('#16a34a')}>+ Add Cue</button></div>
    <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'auto' }}><table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse', textAlign: 'left' }}><thead style={{ background: '#0f172a' }}><tr>{['Cue', 'Brand', 'Status', 'Added'].map(x => <th key={x} style={cellHead}>{x}</th>)}</tr></thead><tbody>{cues.length ? cues.map(cue => <tr key={cue.id} style={{ borderTop: '1px solid #334155' }}><td style={cell}>{cue.name || 'Cue'}</td><td style={cell}>{cue.brand || '—'}</td><td style={cell}><select value={cue.status || 'Available'} onChange={e => updateCue(cue.id, { status: e.target.value })} style={{ ...field, width: 'auto', margin: 0 }}><option>Available</option><option>In Use</option><option>Repair</option></select></td><td style={{ ...cell, color: '#94a3b8' }}>{cue.createdAt ? new Date(cue.createdAt).toLocaleDateString() : '—'}</td></tr>) : <tr><td colSpan="4" style={{ ...cell, textAlign: 'center', padding: 36, color: '#94a3b8' }}>No cues have been added yet.</td></tr>}</tbody></table></section>
    {showForm && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.78)' }} onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><form onSubmit={submit} style={{ width: 'min(420px, 96vw)', padding: 24, borderRadius: 16, background: '#1e293b', border: '1px solid #475569' }}><h2 style={{ margin: '0 0 18px' }}>Add Cue</h2><label style={label}>Cue name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={field} /></label><label style={label}>Brand<input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} style={field} /></label><label style={label}>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={field}><option>Available</option><option>In Use</option><option>Repair</option></select></label><div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button type="button" onClick={() => setShowForm(false)} style={{ ...button('#334155'), flex: 1 }}>Cancel</button><button type="submit" style={{ ...button('#16a34a'), flex: 1 }}>Save Cue</button></div></form></div>}
  </div>;
}
const label = { display: 'block', color: '#cbd5e1', fontWeight: 700, fontSize: 13, marginBottom: 14 };
const cell = { padding: 12, color: '#e2e8f0', fontSize: 13 };
const cellHead = { padding: 12, color: '#cbd5e1', fontSize: 13 };
const button = background => ({ padding: '10px 14px', border: 0, borderRadius: 8, background, color: 'white', fontWeight: 800, cursor: 'pointer' });


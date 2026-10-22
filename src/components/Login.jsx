import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import db from '../db/localDB';

export default function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState('counter');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [locations, setLocations] = useState([{ id: 'main', name: 'Main Lounge' }]);
  const [locationId, setLocationId] = useState('main');
  const [error, setError] = useState('');
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.locations.toArray().then(found => {
      if (!found.length) return;
      setLocations(found);
      const savedLocation = localStorage.getItem('ownerLocationId');
      setLocationId(found.some(location => location.id === savedLocation) ? savedLocation : found[0].id);
    }).catch(error => console.error('Could not load lounge locations', error));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    const ok = await login(username, password, role, locationId);
    setBusy(false);
    if (!ok) setError('Username or password is incorrect for this login.');
  };

  const field = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 8, background: '#111b30', border: '1px solid #35435c', color: '#f8fafc', outline: 'none', fontSize: 14 };
  const button = active => ({ flex: 1, padding: '10px 8px', border: active ? '1px solid #60a5fa' : '1px solid #334155', borderRadius: 8, color: active ? 'white' : '#aab6ca', background: active ? '#263d61' : '#172238', cursor: 'pointer', fontWeight: 700 });

  return (
    <main className="prototype-login" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, color: 'white', fontFamily: 'Inter,Segoe UI,sans-serif', background: 'radial-gradient(ellipse at 50% 45%, #25344c 0%, #17243a 48%, #0c1526 100%)' }}>
      <form className="prototype-login__card" onSubmit={submit} style={{ width: 'min(380px, 94vw)', boxSizing: 'border-box', padding: '30px 26px 22px', borderRadius: 12, border: '1px solid rgba(148,163,184,.18)', background: 'linear-gradient(145deg, rgba(40,54,76,.97), rgba(27,39,58,.98))', boxShadow: '0 24px 70px rgba(0,0,0,.4)', textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '.3px' }}>786-SHENDER-1</div>
        <h1 style={{ margin: '20px 0 24px', fontSize: 17, letterSpacing: '.4px' }}>{role === 'owner' ? 'OWNER LOGIN PORTAL' : 'ADMIN LOGIN PORTAL'}</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => { setRole('counter'); setError(''); }} style={button(role !== 'owner')}>Staff Login</button>
          <button type="button" onClick={() => { setRole('owner'); setError(''); }} style={button(role === 'owner')}>Owner Login</button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {role !== 'owner' && (
            <select aria-label="Lounge location" value={locationId} onChange={e => setLocationId(e.target.value)} style={field}>
              {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          )}
          <input autoComplete="username" placeholder={role === 'owner' ? 'Owner ID' : 'Username'} value={username} onChange={e => setUsername(e.target.value)} style={field} />
          <input autoComplete="current-password" type="password" placeholder={role === 'owner' ? 'Master Password' : 'Password'} value={password} onChange={e => setPassword(e.target.value)} style={field} />
        </div>
        <button type="button" onClick={() => setHelp(v => !v)} style={{ margin: '12px 0 16px', padding: 4, border: 0, background: 'none', color: '#93c5fd', textDecoration: 'underline', cursor: 'pointer' }}>{role === 'owner' ? 'Forgot Master Password?' : 'Forgot Password?'}</button>
        {help && <p style={{ margin: '-6px 0 14px', color: '#cbd5e1', fontSize: 12 }}>Please contact the club owner to reset your sign-in details.</p>}
        {error && <div role="alert" style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ width: '100%', padding: 13, border: 0, borderRadius: 7, background: role === 'owner' ? '#2856b6' : '#20ae68', color: 'white', fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .7 : 1 }}>{busy ? 'Signing in…' : role === 'owner' ? '🔑  Log In (Owner)' : 'Log In (Staff)'}</button>
        <div style={{ borderTop: '1px solid rgba(148,163,184,.17)', margin: '22px -26px 0', paddingTop: 14, color: '#cbd5e1', fontSize: 11 }}>Snooker Club Management System</div>
      </form>
    </main>
  );
}


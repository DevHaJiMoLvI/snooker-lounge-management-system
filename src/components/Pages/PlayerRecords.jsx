import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function PlayerRecords() {
  const { players, adjustPlayerCredit, updatePlayer } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [creditPlayer, setCreditPlayer] = useState(null);
  const [creditValue, setCreditValue] = useState('');
  const [infoPlayer, setInfoPlayer] = useState(null);
  const [infoName, setInfoName] = useState('');
  const [infoPhone, setInfoPhone] = useState('');
  const [infoError, setInfoError] = useState('');

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  return (
    <div style={{ padding: '2rem', color: '#f1f5f9', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Player Records</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Search name or phone..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: '#1e293b',
              color: 'white',
              width: '300px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#1e293b', 
        borderRadius: '12px', 
        overflow: 'auto',
        flex: 1,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#0f172a', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '1px solid #334155' }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '1px solid #334155' }}>Phone</th>
              <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '1px solid #334155' }}>Hours Played</th>
              <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '1px solid #334155' }}>Total Spent</th>
              <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '1px solid #334155' }}>Pending Dues</th>
              <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '1px solid #334155' }}>Joined</th>
              <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '1px solid #334155' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No players found. Try starting a session to add some!
                </td>
              </tr>
            ) : (
              filteredPlayers.map(player => (
                <tr key={player.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{player.name}</td>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>{player.phone}</td>
                  <td style={{ padding: '1rem' }}>{player.totalHoursPlayed?.toFixed(1) || 0} hrs</td>
                  <td style={{ padding: '1rem', color: '#4ade80' }}>{formatCurrency(player.totalAmountPaid || 0)}</td>
                  <td style={{ padding: '1rem', color: (player.pendingDues > 0) ? '#ef4444' : '#94a3b8', fontWeight: player.pendingDues > 0 ? 'bold' : 'normal' }}>
                    {formatCurrency(player.pendingDues || 0)}
                  </td>
                  <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>{formatDate(player.createdAt)}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => { setInfoPlayer(player); setInfoName(player.name); setInfoPhone(player.phone); setInfoError(''); }} style={actionButton('#2563eb')}>Edit Info</button>
                      <button onClick={() => { setCreditPlayer(player); setCreditValue(String(player.pendingDues || 0)); }} style={actionButton('#475569')}>Credit</button>
                      {player.pendingDues > 0 && <button onClick={() => adjustPlayerCredit(player.id, 0)} style={actionButton('#16a34a')}>Clear</button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {infoPlayer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.78)' }} onMouseDown={e => { if (e.target === e.currentTarget) setInfoPlayer(null); }}>
          <form onSubmit={async e => { e.preventDefault(); setInfoError(''); const saved = await updatePlayer(infoPlayer.id, infoName, infoPhone); if (saved) setInfoPlayer(null); else setInfoError('Enter a name and phone number. The phone number must be unique.'); }} style={{ width: 'min(440px, 96vw)', padding: 24, borderRadius: 16, background: '#1e293b', border: '1px solid #475569', boxShadow: '0 24px 70px #0008' }}>
            <h2 style={{ margin: '0 0 6px' }}>Edit player information</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 20px' }}>Update this player’s name and phone number.</p>
            <label style={fieldLabel}>Player name<input autoFocus required maxLength="100" value={infoName} onChange={e => setInfoName(e.target.value)} style={fieldInput} /></label>
            <label style={{ ...fieldLabel, marginTop: 14 }}>Phone number<input required maxLength="40" value={infoPhone} onChange={e => setInfoPhone(e.target.value)} style={fieldInput} /></label>
            {infoError && <p role="alert" style={{ color: '#fca5a5', margin: '12px 0 0' }}>{infoError}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}><button type="button" onClick={() => setInfoPlayer(null)} style={actionButton('#334155')}>Cancel</button><button type="submit" style={actionButton('#16a34a')}>Save Info</button></div>
          </form>
        </div>
      )}
      {creditPlayer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.78)' }} onMouseDown={e => { if (e.target === e.currentTarget) setCreditPlayer(null); }}>
          <form onSubmit={e => { e.preventDefault(); if (Number.isFinite(Number(creditValue)) && Number(creditValue) >= 0) { adjustPlayerCredit(creditPlayer.id, creditValue); setCreditPlayer(null); } }} style={{ width: 'min(440px, 96vw)', padding: 24, borderRadius: 16, background: '#1e293b', border: '1px solid #475569', boxShadow: '0 24px 70px #0008' }}>
            <h2 style={{ margin: '0 0 6px' }}>Edit player credit</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 20px' }}>{creditPlayer.name} · Current balance {formatCurrency(creditPlayer.pendingDues || 0)}</p>
            <label style={{ display: 'block', color: '#cbd5e1', fontWeight: 700, fontSize: 13 }}>New credit balance (Rs.)<input autoFocus required min="0" type="number" value={creditValue} onChange={e => setCreditValue(e.target.value)} style={{ display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #475569', background: '#0f172a', color: 'white' }} /></label>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}><button type="button" onClick={() => setCreditPlayer(null)} style={actionButton('#334155')}>Cancel</button><button type="submit" style={actionButton('#16a34a')}>Save Credit</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function actionButton(background) {
  return { border: 0, borderRadius: 6, padding: '7px 10px', background, color: 'white', cursor: 'pointer', fontWeight: 700 };
}

const fieldLabel = { display: 'block', color: '#cbd5e1', fontWeight: 700, fontSize: 13 };
const fieldInput = { display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #475569', background: '#0f172a', color: 'white' };

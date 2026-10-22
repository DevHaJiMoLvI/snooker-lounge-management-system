import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function StartSessionModal({ tableId, onClose }) {
  const { tables, searchPlayers, startSession } = useApp();
  const table = tables?.find(t => t.id === tableId);
  const tableName = table?.name || 'Unknown Table';

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [controllerCount, setControllerCount] = useState('1');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    if (val.length >= 3) {
      const results = searchPlayers(val);
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } else {
      setShowDropdown(false);
    }
  };

  const handleSelectPlayer = (player) => {
    setPhone(player.phone);
    setName(player.name);
    setShowDropdown(false);
  };

  const handleStart = () => {
    startSession(tableId, name, phone, { controllerCount: Number(controllerCount) });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#f1f5f9' }}>Start Session - {tableName}</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <input 
            className="input" 
            placeholder="Player Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px' }}
          />
        </div>

        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <input 
            className="input" 
            placeholder="Phone number (03XX-XXXXXXX)" 
            value={phone} 
            onChange={handlePhoneChange}
            style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px' }}
          />
          {showDropdown && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, marginTop: '4px' }}>
              {searchResults.map(player => (
                <div 
                  key={player.id}
                  onClick={() => handleSelectPlayer(player)}
                  style={{ padding: '12px', cursor: 'pointer', color: '#f1f5f9' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {player.name} - {player.phone}
                </div>
              ))}
            </div>
          )}
        </div>

        {table?.type === 'ps5' && (
          <label style={{ display: 'block', marginBottom: 20, color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>
            Controllers (Rs. {table.controllerRatePerHour || 100} each / hour)
            <select value={controllerCount} onChange={e => setControllerCount(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9' }}>
              {[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            style={{ flex: 1, minHeight: '44px', color: '#94a3b8' }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-success" 
            disabled={!name || !phone}
            onClick={handleStart}
            style={{ flex: 1, minHeight: '44px', opacity: (!name || !phone) ? 0.5 : 1 }}
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

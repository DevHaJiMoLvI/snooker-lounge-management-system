import React from 'react';
import { useApp } from '../../context/AppContext';

export default function SwitchTableModal({ tableId, onClose }) {
  const { tables, activeSessions, switchTable } = useApp();
  
  const availableTables = tables?.filter(t => t.id !== tableId && !activeSessions[t.id] && t.enabled !== false) || [];

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#f1f5f9' }}>Switch Table</h2>
        
        {availableTables.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
            No tables available for switching
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {availableTables.map(t => (
              <div 
                key={t.id}
                onClick={() => { switchTable(tableId, t.id); onClose(); }}
                style={{ 
                  backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', 
                  border: '1px solid #334155', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: '#f1f5f9', fontSize: '18px' }}>{t.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '14px' }}>Rs. {t.ratePerHour}/{t.rateUnit === 'hour' ? 'hr' : 'min'}{t.type === 'ps5' ? ` + Rs. ${t.controllerRatePerHour || 100}/controller/hr` : ''}</div>
                </div>
                <span className={`badge ${t.type === 'snooker' ? 'badge-info' : 'badge-primary'}`} style={{ backgroundColor: t.type === 'snooker' ? '#a855f7' : '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                  {t.type}
                </span>
              </div>
            ))}
          </div>
        )}

        <button 
          className="btn btn-ghost" 
          onClick={onClose}
          style={{ width: '100%', minHeight: '44px', color: '#94a3b8', marginTop: '20px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

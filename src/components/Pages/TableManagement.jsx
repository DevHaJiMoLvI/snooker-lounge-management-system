import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatHumanDuration, getLiveTableDurations } from '../../utils/helpers';

export default function TableManagement() {
  const { tables, activeSessions, addTable, editTable, deleteTable, toggleTableEnabled } = useApp();
  const [filterType, setFilterType] = useState('');
  const [now, setNow] = useState(Date.now());
  const [formTable, setFormTable] = useState(null);
  const [tableForm, setTableForm] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeCount = Object.keys(activeSessions).length;
  const availableCount = tables.length - activeCount;

  const handleEditRate = (table) => {
    openTableForm(table);
  };

  const openTableForm = (table = null) => {
    setFormTable(table);
    setTableForm(table ? { name: table.name, type: table.type, ratePerHour: String(table.ratePerHour), rateUnit: table.rateUnit || 'minute', controllerRatePerHour: String(table.controllerRatePerHour || 100) } : { name: '', type: 'snooker', ratePerHour: '500', rateUnit: 'minute', controllerRatePerHour: '100' });
  };

  const saveTableForm = () => {
    const rate = Number(tableForm.ratePerHour);
    if (!tableForm.name.trim() || !Number.isFinite(rate) || rate < 0) return;
    const updates = { name: tableForm.name.trim(), type: tableForm.type, ratePerHour: rate, rateUnit: tableForm.rateUnit, controllerRatePerHour: tableForm.type === 'ps5' ? Number(tableForm.controllerRatePerHour) || 100 : 0 };
    if (formTable) editTable(formTable.id, updates);
    else addTable(updates);
    setFormTable(null);
    setTableForm(null);
  };

  const handleAddTable = () => {
    openTableForm();
  };

  const handleEditTable = (table) => {
    openTableForm(table);
  };

  const handleDeleteTable = (tableId, isActive) => {
    if (isActive) {
      alert("Cannot delete a table while a session is active!");
      return;
    }
    if (window.confirm("Are you sure you want to delete this table?")) {
      deleteTable(tableId);
    }
  };

  return (
    <div style={{ padding: '2rem', color: '#f1f5f9', height: '100%', overflowY: 'auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>TABLE MANAGEMENT</h1>
        <button 
          onClick={handleAddTable}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#22c55e', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>+</span> Add Table
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', fontSize: '1.2rem' }}>
          Total Tables: {tables.length}
        </div>
        <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', fontSize: '1.2rem' }}>
          Active: {activeCount}
        </div>
        <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', fontSize: '1.2rem' }}>
          Available: {availableCount}
        </div>
        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="🔍 Filter by Type" 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1.5rem 1rem', 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155', 
              borderRadius: '12px', 
              color: 'white',
              outline: 'none',
              fontSize: '1rem'
            }}
          />
        </div>
      </div>

      {/* Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {tables.filter(t => t.type.includes(filterType.toLowerCase())).map(table => {
          const session = activeSessions[table.id];
          const isActive = !!session;
          const enabled = table.enabled !== false;
          const { activeMs, idleMs } = getLiveTableDurations(table, session, now);

          return (
            <div key={table.id} style={{ 
              backgroundColor: '#1e293b', 
              backgroundImage: `linear-gradient(rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.92)), url(${table.type === 'snooker' ? '/snooker.jpg' : table.type === 'pool' ? '/pool.jpg' : table.type === 'table-tennis' ? '/table-tennis.jpg' : '/ps5.jpg'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '12px', 
              padding: '1.5rem',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              minHeight: '220px'
            }}>
              
              {/* Pill */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ 
                  backgroundColor: !enabled ? '#64748b' : isActive ? '#ef4444' : '#22c55e', 
                  color: 'white', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '9999px', 
                  fontSize: '0.8rem', 
                  fontWeight: 'bold' 
                }}>
                  {!enabled ? 'OFF' : isActive ? 'BUSY' : 'IDLE'}
                </div>
              </div>

              {/* Title & Rate */}
              <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {table.name}
                </h2>
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {table.type !== 'table-tennis' && table.type !== 'ps5' && <><span style={{ textTransform: 'capitalize' }}>{table.type}</span><span>•</span></>}
                  <span>{formatCurrency(table.ratePerHour)}/{table.rateUnit === 'hour' ? 'hr' : 'min'}</span>
                  <button 
                    onClick={() => handleEditRate(table)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '1rem', color: '#94a3b8' }}
                    title="Edit Rate"
                  >
                    ✏️
                  </button>
                </div>
                <div style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(15,23,42,0.75)', borderRadius: 8, padding: '0.55rem 0.4rem' }}>
                    <div style={{ fontSize: 11, color: '#86efac', letterSpacing: 0.4 }}>ACTIVE</div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{formatHumanDuration(activeMs / 1000)}</div>
                  </div>
                  <div style={{ background: 'rgba(15,23,42,0.75)', borderRadius: 8, padding: '0.55rem 0.4rem' }}>
                    <div style={{ fontSize: 11, color: '#fcd34d', letterSpacing: 0.4 }}>IDLE</div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{formatHumanDuration(idleMs / 1000)}</div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <button
                  onClick={() => toggleTableEnabled(table.id)}
                  title={enabled ? 'Turn table off' : 'Turn table on'}
                  style={{
                    width: 44,
                    height: 24,
                    backgroundColor: enabled ? '#22c55e' : '#475569',
                    borderRadius: 9999,
                    position: 'relative',
                    cursor: 'pointer',
                    border: 'none',
                    padding: 0
                  }}
                >
                  <span style={{
                    width: 18,
                    height: 18,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: 3,
                    left: enabled ? 23 : 3,
                    transition: 'left 0.15s ease'
                  }} />
                </button>

                {/* Edit & Delete */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handleEditTable(table)}
                    style={{ padding: '0.5rem', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteTable(table.id, isActive)}
                    style={{ padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: isActive ? 0.5 : 1 }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {/* Add New Table Placeholder */}
        <div 
          onClick={handleAddTable}
          style={{ 
            backgroundColor: 'transparent',
            border: '2px dashed #475569',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '220px',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(71, 85, 105, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ fontSize: '3rem', fontWeight: 300 }}>+</div>
          <div style={{ fontSize: '1.1rem' }}>Add New Table</div>
        </div>

      </div>
      {tableForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,.78)', display: 'grid', placeItems: 'center', padding: 16 }} onMouseDown={e => { if (e.target === e.currentTarget) { setFormTable(null); setTableForm(null); } }}>
          <form onSubmit={e => { e.preventDefault(); saveTableForm(); }} style={{ width: 'min(460px, 96vw)', background: '#1e293b', border: '1px solid #475569', borderRadius: 16, padding: 24, boxShadow: '0 24px 70px #0008' }}>
            <h2 style={{ margin: '0 0 6px' }}>{formTable ? 'Edit Table' : 'Add Table'}</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 20px' }}>Update the activity name and rate.</p>
            <label style={labelStyle}>Table name<input required value={tableForm?.name || ''} onChange={e => setTableForm({ ...tableForm, name: e.target.value })} style={inputStyle} placeholder="e.g. Table 8" /></label>
            <label style={labelStyle}>Table type<select value={tableForm?.type || 'snooker'} onChange={e => { const type = e.target.value; const hourly = type === 'table-tennis' || type === 'ps5'; setTableForm({ ...tableForm, type, rateUnit: hourly ? 'hour' : 'minute', ratePerHour: type === 'table-tennis' ? '600' : type === 'ps5' ? '900' : tableForm.ratePerHour }); }} style={inputStyle}><option value="snooker">Snooker</option><option value="pool">Pool</option><option value="table-tennis">Table Tennis</option><option value="ps5">PS5</option></select></label>
            <label style={labelStyle}>Rate per {tableForm?.rateUnit === 'hour' ? 'hour' : 'minute'} (Rs.)<input required min="0" step="any" inputMode="decimal" type="number" value={tableForm?.ratePerHour ?? ''} onChange={e => setTableForm({ ...tableForm, ratePerHour: e.target.value })} style={inputStyle} placeholder={tableForm?.rateUnit === 'hour' ? 'e.g. 600' : 'e.g. 12'} /></label>
            {tableForm?.type === 'ps5' && <label style={labelStyle}>Per controller per hour (Rs.)<input required min="0" step="any" inputMode="decimal" type="number" value={tableForm?.controllerRatePerHour ?? '100'} onChange={e => setTableForm({ ...tableForm, controllerRatePerHour: e.target.value })} style={inputStyle} /></label>}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}><button type="button" onClick={() => { setFormTable(null); setTableForm(null); }} style={modalButton('#334155')}>Cancel</button><button type="submit" style={modalButton('#16a34a')}>Save Table</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', color: '#cbd5e1', fontSize: 13, fontWeight: 700, marginBottom: 14 };
const inputStyle = { display: 'block', width: '100%', marginTop: 7, padding: '11px 12px', borderRadius: 8, border: '1px solid #475569', background: '#0f172a', color: 'white', font: 'inherit' };
const modalButton = background => ({ flex: 1, padding: 12, border: 0, borderRadius: 8, background, color: 'white', fontWeight: 800, cursor: 'pointer' });

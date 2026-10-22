import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatTime, formatCurrency, getElapsedSeconds } from '../../utils/helpers';
import StartSessionModal from '../Modals/StartSessionModal';
import BillModal from '../Modals/BillModal';
import SwitchTableModal from '../Modals/SwitchTableModal';
import AddItemModal from '../Modals/AddItemModal';

export default function TableCard({ table }) {
  const { activeSessions, selectedTableId, setSelectedTableId, getSessionBill } = useApp();
  const session = activeSessions[table.id];
  const isSelected = selectedTableId === table.id;

  const [showStartModal, setShowStartModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval;
    if (session?.startTime) {
      setElapsed(getElapsedSeconds(session.startTime));
      interval = setInterval(() => {
        setElapsed(getElapsedSeconds(session.startTime));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session?.startTime]);

  let borderStyle = 'border-left: 4px solid #22c55e;';
  let boxShadowStyle = 'none';
  if (session) {
    borderStyle = 'border-left: 4px solid #ef4444;';
    boxShadowStyle = '0 0 15px rgba(239,68,68,0.1)';
  }

  const calculatedCost = getSessionBill(table.id)?.tableCost || 0;
  const totalQty = session?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <>
      <div 
        onClick={() => setSelectedTableId(table.id)}
        style={{
          backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px',
          border: '1px solid #334155', cursor: 'pointer',
          borderLeft: session ? '4px solid #ef4444' : '4px solid #22c55e',
          boxShadow: boxShadowStyle,
          outline: isSelected ? '2px solid #3b82f6' : 'none',
          outlineOffset: isSelected ? '2px' : '0'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#f1f5f9' }}>{table.name}</span>
            <span className={`badge ${table.type === 'snooker' ? 'badge-info' : 'badge-primary'}`} style={{ backgroundColor: table.type === 'snooker' ? '#a855f7' : '#3b82f6' }}>
              {table.type}
            </span>
          </div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: session ? '#ef4444' : '#22c55e' }}></div>
        </div>

        {!session ? (
          <button 
            className="btn btn-success" 
            style={{ width: '100%', minHeight: '48px', fontSize: '16px' }}
            onClick={(e) => { e.stopPropagation(); setShowStartModal(true); }}
          >
            ▶ Start Session
          </button>
        ) : (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{session.playerName}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{session.playerPhone}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', fontFamily: 'monospace', color: '#06b6d4', fontWeight: 'bold' }}>
                {formatTime(elapsed)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ color: '#eab308', fontWeight: 'bold' }}>{formatCurrency(calculatedCost)}</div>
                {totalQty > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: '10px', marginTop: '4px' }}>
                    {totalQty} items
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-cyan" 
                style={{ flex: 1, minHeight: '44px', fontSize: '14px', fontWeight: 600, padding: '0 4px' }}
                onClick={(e) => { e.stopPropagation(); setShowAddItemModal(true); }}
              >
                🍹 Add
              </button>
              <button 
                className="btn btn-cyan" 
                style={{ flex: 1, minHeight: '44px', fontSize: '14px', fontWeight: 600, padding: '0 4px' }}
                onClick={(e) => { e.stopPropagation(); setShowSwitchModal(true); }}
              >
                🔄 Switch
              </button>
              <button 
                className="btn btn-danger" 
                style={{ flex: 1.5, minHeight: '44px', fontSize: '14px', fontWeight: 600, padding: '0 4px' }}
                onClick={(e) => { e.stopPropagation(); setShowBillModal(true); }}
              >
                ⬛ Stop & Bill
              </button>
            </div>
          </div>
        )}
      </div>

      {showStartModal && <StartSessionModal tableId={table.id} onClose={() => setShowStartModal(false)} />}
      {showBillModal && <BillModal tableId={table.id} onClose={() => setShowBillModal(false)} />}
      {showSwitchModal && <SwitchTableModal tableId={table.id} onClose={() => setShowSwitchModal(false)} />}
      {showAddItemModal && <AddItemModal tableId={table.id} onClose={() => setShowAddItemModal(false)} />}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatTime, formatCurrency, getElapsedSeconds } from '../../utils/helpers';
import BillModal from '../Modals/BillModal';

export default function QuickBill() {
  const { selectedTableId, activeSessions, tables, getSessionBill } = useApp();
  const session = selectedTableId ? activeSessions[selectedTableId] : null;
  const table = tables?.find(t => t.id === selectedTableId);
  const [showBillModal, setShowBillModal] = useState(false);
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

  if (!selectedTableId || !session || !table) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>💰 Quick Checkout</h3>
        <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
          Select an active table to view bill
        </div>
      </div>
    );
  }

  const tableCost = getSessionBill(selectedTableId)?.tableCost || 0;
  const itemsCost = session.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const totalAmount = tableCost + itemsCost;

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>💰 Quick Checkout</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', color: '#f1f5f9', fontSize: '18px' }}>{session.playerName}</div>
        <div style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: '16px' }}>{formatTime(elapsed)}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '8px' }}>
        <span>Table Time</span>
        <span>{formatCurrency(tableCost)}</span>
      </div>

      {session.items?.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          {session.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              <span>{item.quantity}x {item.name}</span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #334155', margin: '12px 0' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f1f5f9', fontWeight: 'bold', fontSize: '20px', marginBottom: '20px' }}>
        <span>Total</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>

      <button 
        className="btn btn-danger" 
        style={{ width: '100%', minHeight: '48px', fontSize: '16px' }}
        onClick={() => setShowBillModal(true)}
      >
        ⬛ Stop & Bill
      </button>

      {showBillModal && <BillModal tableId={selectedTableId} onClose={() => setShowBillModal(false)} />}
    </div>
  );
}

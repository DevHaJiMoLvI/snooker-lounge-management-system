import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';

export default function QuickCanteen() {
  const { inventory, selectedTableId, activeSessions, addItemToSession, removeItemFromSession } = useApp();
  const session = selectedTableId ? activeSessions[selectedTableId] : null;
  const isEnabled = selectedTableId && session;

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>🍹 Quick Canteen</h3>
      
      {!isEnabled ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
          Select an active table to add items
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
          {inventory?.map(item => {
            const sessionItem = session.items?.find(i => i.itemId === item.id || i.id === item.id);
            const qty = sessionItem ? sessionItem.quantity : 0;
            const lowStock = item.stock < 5;

            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{item.image ? <img src={item.image} alt="" style={{ width: 28, height: 28, objectFit: 'contain', verticalAlign: 'middle' }} /> : item.icon}</span>
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: '500' }}>{item.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {formatCurrency(item.price)} • <span style={{ color: lowStock ? '#ef4444' : 'inherit' }}>Stock: {item.stock}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    className="btn btn-danger btn-sm"
                    disabled={qty === 0}
                    onClick={() => removeItemFromSession(selectedTableId, item.id)}
                    style={{ minWidth: '32px' }}
                  >-</button>
                  <span style={{ color: '#f1f5f9', width: '20px', textAlign: 'center' }}>{qty}</span>
                  <button 
                    className="btn btn-success btn-sm"
                    disabled={item.stock === 0}
                    onClick={() => addItemToSession(selectedTableId, item, 1)}
                    style={{ minWidth: '32px' }}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

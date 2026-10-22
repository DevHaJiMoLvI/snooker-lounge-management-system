import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import ItemThumb from '../ItemThumb';

export default function AddItemModal({ tableId, onClose }) {
  const { tables, inventory, addItemToSession } = useApp();
  const table = tables?.find(t => t.id === tableId);
  const tableName = table?.name || 'Unknown Table';

  const [quantities, setQuantities] = useState({});

  const updateQty = (itemId, delta) => {
    setQuantities(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const hasSelectedItems = Object.values(quantities).some(qty => qty > 0);

  const handleAdd = () => {
    Object.entries(quantities).forEach(([itemId, qty]) => {
      if (qty > 0) {
        const item = inventory.find(i => i.id === itemId);
        if (item) {
          addItemToSession(tableId, item, qty);
        }
      }
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#f1f5f9' }}>Add Items to {tableName}</h2>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {inventory?.map(item => {
            const qty = quantities[item.id] || 0;
            const disabledAdd = item.stock === 0 || qty >= item.stock;

            return (
              <div key={item.id} style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ marginBottom: 12 }}><ItemThumb item={item} size={64} /></div>
                <div style={{ color: '#f1f5f9', fontWeight: 'bold', textAlign: 'center' }}>{item.name}</div>
                <div style={{ color: '#06b6d4', marginBottom: '4px' }}>{formatCurrency(item.price)}</div>
                <div style={{ color: item.stock < 5 ? '#ef4444' : '#94a3b8', fontSize: '12px', marginBottom: '16px' }}>Stock: {item.stock}</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    className="btn btn-danger btn-sm"
                    disabled={qty === 0}
                    onClick={() => updateQty(item.id, -1)}
                    style={{ minWidth: '32px', minHeight: '32px' }}
                  >-</button>
                  <span style={{ color: '#f1f5f9', width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{qty}</span>
                  <button 
                    className="btn btn-success btn-sm"
                    disabled={disabledAdd}
                    onClick={() => updateQty(item.id, 1)}
                    style={{ minWidth: '32px', minHeight: '32px' }}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            style={{ flex: 1, minHeight: '48px', color: '#94a3b8' }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-success" 
            disabled={!hasSelectedItems}
            onClick={handleAdd}
            style={{ flex: 2, minHeight: '48px', opacity: !hasSelectedItems ? 0.5 : 1 }}
          >
            Add Selected Items
          </button>
        </div>
      </div>
    </div>
  );
}

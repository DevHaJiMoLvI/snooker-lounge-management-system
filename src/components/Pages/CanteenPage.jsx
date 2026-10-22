import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import ItemThumb from '../ItemThumb';

export default function CanteenPage() {
  const { inventory, updateStock, addInventoryItem, updateInventoryItem } = useApp();
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', stock: '', image: '', icon: '🥤', category: 'drinks' });

  const handleImage = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const saveItem = async () => {
    if (!form.name || form.price === '' || Number(form.price) < 0) return;
    const itemData = {
      name: form.name,
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      image: form.image,
      icon: form.icon || '🥤',
      category: form.category
    };
    if (editingItem) await updateInventoryItem(editingItem.id, itemData);
    else await addInventoryItem(itemData);
    setForm({ name: '', price: '', stock: '', image: '', icon: '🥤', category: 'drinks' });
    setEditingItem(null);
    setShowForm(false);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, price: String(item.price), stock: String(item.stock), image: item.image || '', icon: item.icon || '🥤', category: item.category || 'drinks' });
    setShowForm(true);
  };

  return (
    <div style={{ padding: '2rem', color: '#f1f5f9', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Canteen Inventory</h1>
          <p style={{ color: '#94a3b8', margin: '6px 0 0' }}>Add photos, stock, and prices for drinks and snacks.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '0.75rem 1.25rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          + Add Item
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {inventory.map(item => (
          <div key={item.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#0f172a', borderRadius: 10, padding: 12, minHeight: 120, alignItems: 'center' }}>
              <ItemThumb item={item} size={96} />
            </div>
            <div style={{ fontWeight: 800 }}>{item.name}</div>
            <div style={{ color: '#4ade80' }}>{formatCurrency(item.price)}</div>
            <button onClick={() => openEdit(item)} style={{ ...stockBtn('#2563eb'), minHeight: 36 }}>✎ Edit item / price</button>
            <div style={{ color: item.stock < 5 ? '#f87171' : '#94a3b8', fontSize: 13 }}>Stock: {item.stock}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updateStock(item.id, -1)} style={stockBtn('#334155')}>-</button>
              <button onClick={() => updateStock(item.id, 1)} style={stockBtn('#22c55e')}>+</button>
            </div>
            <label style={{ fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
              Change photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={e => handleImage(e.target.files?.[0], (data) => updateInventoryItem(item.id, { image: data }))}
              />
            </label>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ width: 420, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>{editingItem ? 'Edit Canteen Item' : 'Add Canteen Item'}</h2>
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={field} />
            <input placeholder="Price" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={field} />
            <input placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} style={field} />
            <input type="file" accept="image/*" onChange={e => handleImage(e.target.files?.[0], (data) => setForm(f => ({ ...f, image: data })))} style={{ ...field, padding: 8 }} />
            {form.image && <img src={form.image} alt="preview" style={{ width: 80, height: 80, objectFit: 'contain', display: 'block', marginBottom: 12 }} />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }} style={{ ...stockBtn('#334155'), flex: 1, minHeight: 44 }}>Cancel</button>
              <button onClick={saveItem} style={{ ...stockBtn('#22c55e'), flex: 1, minHeight: 44 }}>{editingItem ? 'Save Changes' : 'Save Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const field = {
  width: '100%',
  marginBottom: 10,
  padding: 12,
  background: '#0f172a',
  border: '1px solid #334155',
  color: 'white',
  borderRadius: 8
};

function stockBtn(bg) {
  return { flex: 1, padding: '8px 0', background: bg, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 };
}

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import db from '../../db/localDB';
import { formatTime, formatCurrency, formatClockTime, getSessionRevenue } from '../../utils/helpers';
import StartSessionModal from '../Modals/StartSessionModal';
import BillModal from '../Modals/BillModal';
import AddItemModal from '../Modals/AddItemModal';
import ItemThumb from '../ItemThumb';

export default function Dashboard() {
  const { 
    tables, 
    activeSessions, 
    inventory,
    players,
    completedSessions,
    switchTable,
    updateStock,
    createPlayer,
    checkoutQuickSale,
    locationId
  } = useApp();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [transferringTableId, setTransferringTableId] = useState(null);
  const [startTableId, setStartTableId] = useState(null);
  const [billTableId, setBillTableId] = useState(null);
  const [addItemTableId, setAddItemTableId] = useState(null);
  const [quickItems, setQuickItems] = useState([]);
  const [playerQuery, setPlayerQuery] = useState('');
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [playerForm, setPlayerForm] = useState({ name: '', phone: '' });
  const [currentLocationName, setCurrentLocationName] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!locationId) {
      setCurrentLocationName('');
      return undefined;
    }
    db.locations.get(locationId)
      .then(location => {
        if (!cancelled) setCurrentLocationName(location?.name || (locationId === 'main' ? 'Main Lounge' : locationId));
      })
      .catch(() => {
        if (!cancelled) setCurrentLocationName(locationId === 'main' ? 'Main Lounge' : locationId);
      });
    return () => { cancelled = true; };
  }, [locationId]);

  const activeTablesCount = Object.keys(activeSessions).length;
  
  // Calculate today's sales from completed sessions today
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaysSales = completedSessions
    .filter(s => s.endTime >= todayStart)
    .reduce((sum, s) => sum + getSessionRevenue(s).total, 0);
  const quickTotal = quickItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const addQuickItem = (item) => setQuickItems(prev => {
    const existing = prev.find(line => line.itemId === item.id);
    if (existing?.quantity >= item.stock) return prev;
    return existing
      ? prev.map(line => line.itemId === item.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1, icon: item.icon }];
  });
  const adjustQuickQuantity = (itemId, change) => setQuickItems(prev => {
    const line = prev.find(item => item.itemId === itemId);
    if (!line) return prev;
    const nextQuantity = line.quantity + change;
    const stock = inventory.find(item => item.id === itemId)?.stock || 0;
    if (nextQuantity > stock) return prev;
    if (nextQuantity <= 0) return prev.filter(item => item.itemId !== itemId);
    return prev.map(item => item.itemId === itemId ? { ...item, quantity: nextQuantity } : item);
  });
  const finishQuickSale = async () => {
    if (!quickItems.length) return;
    const ok = await checkoutQuickSale(quickItems);
    if (ok) setQuickItems([]);
    else window.alert('Some items do not have enough stock. Please review the cart.');
  };
  const savePlayer = async (event) => {
    event.preventDefault();
    const created = await createPlayer(playerForm.name, playerForm.phone);
    if (!created) { window.alert('Enter a name and phone number that is not already registered.'); return; }
    setPlayerForm({ name: '', phone: '' });
    setShowPlayerForm(false);
  };
  const recentMatches = completedSessions.slice().reverse().filter(s => !playerQuery || `${s.playerName} ${s.playerPhone || ''}`.toLowerCase().includes(playerQuery.toLowerCase())).slice(0, 5);
  const filteredPlayers = players.filter(player => !playerQuery || `${player.name} ${player.phone}`.toLowerCase().includes(playerQuery.toLowerCase())).slice(0, 12);

  return (
    <div className="prototype-dashboard">
      <header className="prototype-dashboard__header">
        <div className="prototype-dashboard__heading"><span className="prototype-dashboard__logo">786</span><div><div className="prototype-dashboard__location">{currentLocationName || 'Snooker Club'}</div><h1>Shop</h1></div></div>
        <div className="prototype-dashboard__summary"><span>Active tables <b>{activeTablesCount}/{tables.length}</b></span><span>Today’s sales <b>{formatCurrency(todaysSales)}</b></span><span>{new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <h2 className="prototype-dashboard__credits-title">Player Credits</h2>
      </header>

      <div className="prototype-dashboard__layout">
        <main className="prototype-dashboard__main">
          <section>
            <div className="prototype-section-heading"><h2>Reserve Table</h2><span>{tables.length} tables</span></div>
            <div className="prototype-table-grid">
              {tables.map(table => {
                const session = activeSessions[table.id];
                const isActive = !!session;
                const enabled = table.enabled !== false;
                const duration = isActive ? Math.floor((currentTime - session.startTime) / 1000) : 0;
                const isTransferringThis = transferringTableId === table.id;
                const isTransferTarget = transferringTableId && transferringTableId !== table.id && !isActive && enabled;
                return <article key={table.id} className={`prototype-table-card ${isTransferTarget ? 'is-target' : isActive ? 'is-busy' : enabled ? 'is-available' : 'is-off'}`}>
                  <span className="prototype-table-card__status">{!enabled ? 'OFF' : isActive ? `IN USE · ${formatTime(duration)}` : 'AVAILABLE'}</span>
                  <div className="prototype-table-card__info"><h3>{table.name}</h3><span>{formatCurrency(table.ratePerHour)}/{table.rateUnit === 'hour' ? 'hr' : 'min'}</span>{isActive && <small>In use · {session.playerName}</small>}</div>
                  <div className="prototype-table-card__actions">
                    {transferringTableId ? isTransferringThis ? <button onClick={() => setTransferringTableId(null)} className="prototype-button prototype-button--muted">Cancel transfer</button> : !isActive && enabled ? <button onClick={() => { switchTable(transferringTableId, table.id); setTransferringTableId(null); }} className="prototype-button prototype-button--blue">Move here</button> : <span className="prototype-unavailable">Unavailable</span> : !isActive ? <button disabled={!enabled} onClick={() => enabled && setStartTableId(table.id)} className="prototype-button prototype-button--start">{enabled ? 'Start session' : 'Table off'}</button> : <><button onClick={() => setAddItemTableId(table.id)} className="prototype-button prototype-button--blue">Add item</button><button onClick={() => setTransferringTableId(table.id)} className="prototype-button prototype-button--amber">Transfer</button><button onClick={() => setBillTableId(table.id)} className="prototype-button prototype-button--red">Stop & bill</button></>}
                  </div>
                </article>;
              })}
            </div>
          </section>

          <section className="prototype-quick-canteen">
            <div className="prototype-section-heading"><h2>Quick Canteen</h2><span>Stock & sales</span></div>
            <div className="prototype-quick-layout">
              <div className="prototype-inventory-grid">{inventory.slice(0, 6).map(item => {
                const cartQuantity = quickItems.find(line => line.itemId === item.id)?.quantity || 0;
                const availableStock = Math.max(0, item.stock - cartQuantity);
                return <article key={item.id} className="prototype-inventory-card"><ItemThumb item={item} size={42} /><div className="prototype-inventory-card__details"><b>{item.name}</b><small>Qty: {availableStock} left</small><div className="prototype-stock-controls"><button onClick={() => updateStock(item.id, -1)} disabled={item.stock <= cartQuantity}>−</button><button onClick={() => updateStock(item.id, 1)}>+</button></div><button className="prototype-add-to-bill" onClick={() => addQuickItem(item)} disabled={availableStock < 1}>Add to Quick Bill</button></div></article>;
              })}</div>
              <div className="prototype-quick-bill"><h3>Quick Bill</h3><div className="prototype-quick-bill__items">{quickItems.map(item => <div key={item.itemId} className="prototype-quick-bill__row"><span className="prototype-quick-bill__name">{item.name}</span><button onClick={() => adjustQuickQuantity(item.itemId, -1)} aria-label={`Decrease ${item.name} quantity`}>−</button><b>{item.quantity}</b><button disabled={item.quantity >= (inventory.find(stockItem => stockItem.id === item.itemId)?.stock || 0)} onClick={() => adjustQuickQuantity(item.itemId, 1)} aria-label={`Increase ${item.name} quantity`}>+</button><span>{formatCurrency(item.price * item.quantity)}</span><button className="prototype-quick-bill__remove" onClick={() => setQuickItems(prev => prev.filter(line => line.itemId !== item.itemId))} aria-label={`Remove ${item.name}`}>×</button></div>)}</div><div className="prototype-quick-bill__total"><b>Total</b><b>{formatCurrency(quickTotal)}</b></div><button onClick={finishQuickSale} disabled={!quickItems.length} className="prototype-button prototype-button--start">Checkout Cash</button></div>
            </div>
          </section>
        </main>

        <aside className="prototype-credits-panel">
          <input type="search" placeholder="Search player or phone" value={playerQuery} onChange={e => setPlayerQuery(e.target.value)} />
          <button className="prototype-add-player" onClick={() => setShowPlayerForm(true)}>Add New Player</button>
          <div className="prototype-credit-table-wrap"><table className="prototype-credit-table"><thead><tr><th>Player</th><th>Credit</th></tr></thead><tbody>{filteredPlayers.map(player => <tr key={player.id}><td>{player.name}</td><td className={(Number(player.pendingDues) || 0) > 0 ? 'has-credit' : ''}>{formatCurrency(Number(player.pendingDues) || 0)}</td></tr>)}{filteredPlayers.length === 0 && <tr><td colSpan="2" className="prototype-empty">No players found</td></tr>}</tbody></table></div>
          <div className="prototype-recent"><h3>Recent sessions</h3>{recentMatches.map(session => <div className="prototype-recent__row" key={session.id}><span>{session.playerName}</span><b>{formatCurrency(getSessionRevenue(session).total)}</b><time>{formatClockTime(session.endTime)}</time></div>)}</div>
        </aside>
      </div>
      {startTableId && <StartSessionModal tableId={startTableId} onClose={() => setStartTableId(null)} />}
      {billTableId && <BillModal tableId={billTableId} onClose={() => setBillTableId(null)} />}
      {addItemTableId && <AddItemModal tableId={addItemTableId} onClose={() => setAddItemTableId(null)} />}
      {showPlayerForm && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,23,.78)' }} onMouseDown={e => { if (e.target === e.currentTarget) setShowPlayerForm(false); }}>
        <form onSubmit={savePlayer} style={{ width: 'min(420px, 96vw)', boxSizing: 'border-box', padding: 24, borderRadius: 16, background: '#1e293b', border: '1px solid #475569', boxShadow: '0 24px 70px #0008' }}>
          <h2 style={{ margin: '0 0 18px' }}>Add New Player</h2>
          <label style={{ display: 'block', marginBottom: 14, color: '#cbd5e1', fontSize: 13 }}>Player name<input required value={playerForm.name} onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })} style={playerInput} /></label>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: 13 }}>Phone number<input required value={playerForm.phone} onChange={e => setPlayerForm({ ...playerForm, phone: e.target.value })} style={playerInput} /></label>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button type="button" onClick={() => setShowPlayerForm(false)} style={playerModalButton('#334155')}>Cancel</button><button type="submit" style={playerModalButton('#16a34a')}>Save Player</button></div>
        </form>
      </div>}
    </div>
  );
}

const playerInput = { display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 7, padding: 11, borderRadius: 8, border: '1px solid #475569', background: '#0f172a', color: 'white' };
const playerModalButton = background => ({ flex: 1, padding: 11, border: 0, borderRadius: 8, background, color: 'white', fontWeight: 800, cursor: 'pointer' });

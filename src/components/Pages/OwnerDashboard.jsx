import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PAGES } from '../../utils/constants';
import { formatCurrency, formatDate, getSessionRevenue } from '../../utils/helpers';

const panel = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 18 };

export default function OwnerDashboard({ onNavigate }) {
  const { tables, activeSessions, completedSessions, expenses, inventory, rateChangeNotifications, markRateChangeNotificationRead } = useApp();
  const month = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const sessions = completedSessions.filter(s => (s.endTime || 0) >= start && (s.endTime || 0) < end);
    const monthExpenses = expenses.filter(e => {
      const stamp = typeof e.date === 'number' ? e.date : new Date(e.date).getTime();
      return stamp >= start && stamp < end;
    });
    const revenue = sessions.reduce((sum, s) => sum + getSessionRevenue(s).total, 0);
    const expenseTotal = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, total: 0 }));
    sessions.forEach(s => {
      const day = new Date(s.endTime).getDate();
      daily[day - 1].total += getSessionRevenue(s).total;
    });
    const byType = { 'Snooker tables': 0, 'Pool tables': 0, 'Table Tennis': 0, PS5: 0, Canteen: 0 };
    sessions.forEach(s => {
      const table = tables.find(t => t.id === s.tableId);
      const net = getSessionRevenue(s);
      if (s.tableId === 'canteen') byType.Canteen += net.total;
      else {
        const category = table?.type === 'pool' ? 'Pool tables' : table?.type === 'table-tennis' ? 'Table Tennis' : table?.type === 'ps5' ? 'PS5' : 'Snooker tables';
        byType[category] += net.table;
        byType.Canteen += net.canteen;
      }
    });
    return { sessions, revenue, expenseTotal, profit: revenue - expenseTotal, daily, byType };
  }, [completedSessions, expenses, tables]);

  const maxDaily = Math.max(1, ...month.daily.map(day => day.total));
  const revenueTotal = Object.values(month.byType).reduce((sum, amount) => sum + amount, 0) || 1;
  const colors = ['#60a5fa', '#facc15', '#4ade80', '#c084fc', '#fb7185'];
  const actions = [
    { label: 'Table Management', page: PAGES.TABLE_MANAGEMENT, tone: '#2563eb' },
    { label: 'Canteen', page: PAGES.CANTEEN, tone: '#16a34a' },
    { label: 'Player Records', page: PAGES.PLAYER_RECORDS, tone: '#7c3aed' },
    { label: 'Financial Reports', page: PAGES.EXPENSES, tone: '#0891b2' },
    { label: 'Staff Management', page: PAGES.OWNER_PANEL, tone: '#d97706' },
    { label: 'Audit Log', page: PAGES.OWNER_AUDIT, tone: '#475569' },
    { label: 'System Settings', page: PAGES.OWNER_SETTINGS, tone: '#475569' }
  ];

  return <div style={{ padding: 24, minHeight: '100%', color: '#f1f5f9', background: '#0f172a' }}>
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '4px 0 18px', borderBottom: '1px solid #334155' }}>
      <div><div style={{ color: '#60a5fa', fontSize: 12, fontWeight: 800, letterSpacing: 1.4 }}>OWNER PORTAL</div><h1 style={{ margin: '6px 0 0', fontSize: 26 }}>786-SHENDER-1 — Owner Dashboard</h1><div style={{ color: '#94a3b8', marginTop: 6 }}>Financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div></div>
      <div style={{ textAlign: 'right', color: '#cbd5e1', fontSize: 13 }}>Live tables <b style={{ color: '#4ade80' }}>{Object.keys(activeSessions).length}/{tables.length}</b><div style={{ marginTop: 6 }}>Today · {new Date().toLocaleDateString()}</div></div>
    </header>

    {rateChangeNotifications.length > 0 && <section style={{ ...panel, marginTop: 16, borderColor: '#765d34' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 17 }}>Staff rate changes</h2><p style={{ color: '#94a3b8', fontSize: 12, margin: '5px 0 0' }}>Recent table rate updates for this lounge.</p></div>
        {rateChangeNotifications.some(item => !item.read) && <span style={{ padding: '4px 9px', borderRadius: 999, background: '#854d0e', color: '#fef3c7', fontSize: 12, fontWeight: 800 }}>{rateChangeNotifications.filter(item => !item.read).length} new</span>}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rateChangeNotifications.slice(0, 8).map(notification => <div key={notification.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 8, background: notification.read ? '#0f172a' : '#292719', border: `1px solid ${notification.read ? '#334155' : '#725a2e'}` }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontSize: 13, color: '#e2e8f0' }}><strong>{notification.staffName}</strong> changed <strong>{notification.tableName}</strong> rate</div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#cbd5e1' }}>{formatCurrency(notification.oldRate)}/{notification.oldRateUnit === 'hour' ? 'hr' : 'min'} → {formatCurrency(notification.newRate)}/{notification.newRateUnit === 'hour' ? 'hr' : 'min'} <span style={{ color: '#94a3b8' }}>· {formatDate(notification.createdAt)}</span></div>
          </div>
          {!notification.read && <button onClick={() => markRateChangeNotificationRead(notification.id)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #536174', background: '#1e293b', color: '#e2e8f0', cursor: 'pointer', fontSize: 12 }}>Mark read</button>}
        </div>)}
      </div>
    </section>}

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, margin: '18px 0' }}>
      <Metric title="Monthly revenue" value={formatCurrency(month.revenue)} accent="#4ade80" detail={`${month.sessions.length} completed sessions`} />
      <Metric title="Net profit" value={formatCurrency(month.profit)} accent="#38bdf8" detail={`Expenses: ${formatCurrency(month.expenseTotal)}`} />
      <Metric title="Active tables" value={`${Object.keys(activeSessions).length} / ${tables.length}`} accent="#facc15" detail="Currently in use" />
      <Metric title="Inventory items" value={inventory.length} accent="#c084fc" detail="Canteen products" />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, .9fr)', gap: 16, alignItems: 'stretch' }}>
      <section style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><div><h2 style={{ margin: 0, fontSize: 17 }}>Monthly revenue trend</h2><p style={{ color: '#94a3b8', fontSize: 12, margin: '5px 0 0' }}>Daily sales for this month</p></div><button onClick={() => onNavigate(PAGES.EXPENSES)} style={linkButton}>View report →</button></div>
        <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 210, marginTop: 20, paddingBottom: 24, overflowX: 'auto', borderBottom: '1px solid #475569' }}>
          {month.daily.map(day => <div key={day.day} title={`Day ${day.day}: ${formatCurrency(day.total)}`} style={{ flex: '1 0 8px', minWidth: 8, height: `${Math.max(4, day.total / maxDaily * 100)}%`, borderRadius: '4px 4px 0 0', background: day.total ? 'linear-gradient(180deg,#86efac,#16a34a)' : '#334155', position: 'relative' }}>{day.day === 1 || day.day % 5 === 0 ? <small style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', color: '#94a3b8', fontSize: 9 }}>{day.day}</small> : null}</div>)}
        </div>
      </section>
      <section style={panel}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Revenue by category</h2><p style={{ color: '#94a3b8', fontSize: 12, margin: '5px 0 12px' }}>This month</p>
        {Object.entries(month.byType).map(([label, amount], i) => <div key={label} style={{ margin: '15px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 6 }}><span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: colors[i], marginRight: 7 }} />{label}</span><b>{formatCurrency(amount)}</b></div><div style={{ background: '#0f172a', height: 7, borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${amount / revenueTotal * 100}%`, background: colors[i], borderRadius: 99 }} /></div></div>)}
        <button onClick={() => onNavigate(PAGES.EXPENSES)} style={{ ...linkButton, marginTop: 4 }}>Open financial reports →</button>
      </section>
    </div>

    <section style={{ ...panel, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}><div><h2 style={{ margin: 0, fontSize: 17 }}>Owner tools</h2><p style={{ color: '#94a3b8', fontSize: 12, margin: '5px 0 0' }}>Manage club operations and review records.</p></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>{actions.map(action => <button key={action.page} onClick={() => onNavigate(action.page)} style={{ textAlign: 'left', padding: '13px 14px', borderRadius: 9, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', cursor: 'pointer' }}><span style={{ display: 'block', width: 8, height: 8, borderRadius: 8, background: action.tone, marginBottom: 10 }} /><b style={{ fontSize: 13 }}>{action.label}</b></button>)}</div>
    </section>
  </div>;
}

function Metric({ title, value, accent, detail }) {
  return <section style={{ background: 'linear-gradient(145deg,#1e293b,#172338)', border: '1px solid #334155', borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: 17 }}><div style={{ color: '#cbd5e1', fontSize: 13 }}>{title}</div><div style={{ margin: '9px 0 4px', color: accent, fontSize: 24, fontWeight: 850 }}>{value}</div><small style={{ color: '#94a3b8' }}>{detail}</small></section>;
}
const linkButton = { padding: '7px 10px', borderRadius: 7, border: '1px solid #334155', color: '#93c5fd', background: '#0f172a', cursor: 'pointer', fontWeight: 700, fontSize: 12 };


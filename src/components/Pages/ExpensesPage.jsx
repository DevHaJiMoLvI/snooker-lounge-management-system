import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatHumanDuration, formatClockTime, getSessionRevenue } from '../../utils/helpers';

const card = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 16 };
const th = { textAlign: 'left', padding: '9px 10px', color: '#cbd5e1', borderBottom: '1px solid #334155', fontSize: 12 };
const td = { padding: '9px 10px', borderBottom: '1px solid #334155', fontSize: 13 };

export default function ExpensesPage() {
  const { completedSessions, expenses, tables, activeSessions } = useApp();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [selectedDate, setSelectedDate] = useState(null);
  const report = useMemo(() => {
    const [monthYear, monthNumber] = month.split('-').map(Number);
    const reportYear = period === 'year' ? Number(year) : monthYear;
    const start = period === 'year' ? new Date(reportYear, 0, 1).getTime() : new Date(reportYear, monthNumber - 1, 1).getTime();
    const end = period === 'year' ? new Date(reportYear + 1, 0, 1).getTime() : new Date(reportYear, monthNumber, 1).getTime();
    const sessions = completedSessions.filter(s => (s.endTime || s.createdAt || 0) >= start && (s.endTime || s.createdAt || 0) < end);
    const monthExpenses = expenses.filter(e => {
      const date = typeof e.date === 'number' ? e.date : new Date(e.date).getTime();
      return date >= start && date < end;
    });
    const revenue = sessions.reduce((sum, s) => sum + getSessionRevenue(s).total, 0);
    const tableRevenue = sessions.reduce((sum, s) => sum + getSessionRevenue(s).table, 0);
    const canteenRevenue = sessions.reduce((sum, s) => sum + getSessionRevenue(s).canteen, 0);
    const expensesTotal = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const daily = new Map();
    sessions.forEach(s => {
      const timestamp = s.endTime || s.createdAt;
      const key = new Date(timestamp).toLocaleDateString('en-CA');
      const row = daily.get(key) || { date: key, sessions: 0, revenue: 0, profit: 0, expenses: 0 };
      row.sessions += 1;
      row.revenue += getSessionRevenue(s).total;
      daily.set(key, row);
    });
    monthExpenses.forEach(e => {
      const timestamp = typeof e.date === 'number' ? e.date : new Date(e.date).getTime();
      const key = new Date(timestamp).toLocaleDateString('en-CA');
      const row = daily.get(key) || { date: key, sessions: 0, revenue: 0, profit: 0, expenses: 0 };
      row.expenses += Number(e.amount) || 0;
      daily.set(key, row);
    });
    const dailyRows = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).map(row => ({ ...row, profit: row.revenue - row.expenses }));
    const byCategory = new Map();
    sessions.forEach(s => {
      const table = tables.find(t => t.id === s.tableId);
      const key = table?.type === 'pool' ? 'Pool Tables' : table?.type === 'table-tennis' ? 'Table Tennis' : table?.type === 'ps5' ? 'PS5' : 'Snooker Tables';
      const net = getSessionRevenue(s);
      byCategory.set(key, (byCategory.get(key) || 0) + net.table);
      if (net.canteen) byCategory.set('Canteen', (byCategory.get('Canteen') || 0) + net.canteen);
    });
    return { sessions, revenue, tableRevenue, canteenRevenue, expensesTotal, profit: revenue - expensesTotal, dailyRows, byCategory: [...byCategory.entries()] };
  }, [completedSessions, expenses, tables, month, period, year]);
  const monthLabel = period === 'year' ? year : new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const average = report.sessions.length ? report.revenue / report.sessions.length : 0;
  const liveToday = Object.entries(activeSessions).reduce((sum, [id, session]) => {
    const table = tables.find(t => t.id === id);
    const segment = session.rateSegments?.[session.rateSegments.length - 1];
    if (!table) return sum;
    const unitRate = Number(segment?.ratePerHour ?? table.ratePerHour) || 0;
    const hourlyRate = (segment?.rateUnit ?? table.rateUnit) === 'hour' ? unitRate : unitRate * 60;
    const controllerHourly = (Number(segment?.controllerRatePerHour ?? table.controllerRatePerHour) || 0) * (Number(segment?.controllerCount) || 0);
    return sum + hourlyRate + controllerHourly;
  }, 0);
  const selectedDateSessions = selectedDate ? report.sessions.filter(session => new Date(session.endTime || session.createdAt).toLocaleDateString('en-CA') === selectedDate) : [];

  return (
    <div style={{ padding: 24, color: '#f1f5f9', minHeight: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div><h1 style={{ margin: 0, fontSize: 26 }}>Monthly Financial Report</h1><p style={{ color: '#94a3b8', margin: '6px 0 0' }}>Revenue, profit, sessions, and expenses for {monthLabel}.</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ color: '#cbd5e1' }}>View <select value={period} onChange={e => setPeriod(e.target.value)} style={{ marginLeft: 8, padding: 10, borderRadius: 8, color: 'white', background: '#1e293b', border: '1px solid #475569' }}><option value="month">Monthly</option><option value="year">Yearly</option></select></label>
          {period === 'month' ? <label style={{ color: '#cbd5e1' }}>Month <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ marginLeft: 8, padding: 10, borderRadius: 8, color: 'white', background: '#1e293b', border: '1px solid #475569' }} /></label> : <label style={{ color: '#cbd5e1' }}>Year <select value={year} onChange={e => setYear(e.target.value)} style={{ marginLeft: 8, padding: 10, borderRadius: 8, color: 'white', background: '#1e293b', border: '1px solid #475569' }}>{Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}</select></label>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#cbd5e1', marginBottom: 16 }}>
        <span>Active tables: <b style={{ color: '#4ade80' }}>{Object.keys(activeSessions).length}/{tables.length}</b></span><span>Current hourly rates: <b style={{ color: '#4ade80' }}>{formatCurrency(liveToday)}</b></span><span>Report: <b>{monthLabel}</b></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
        <Metric title="Total Revenue" value={formatCurrency(report.revenue)} tone="#4ade80" />
        <Metric title="Net Profit" value={formatCurrency(report.profit)} tone="#38bdf8" subtitle={`After ${formatCurrency(report.expensesTotal)} expenses`} />
        <Metric title="Total Sessions" value={report.sessions.length.toLocaleString()} tone="#facc15" />
        <Metric title="Average Session Revenue" value={formatCurrency(average)} tone="#c084fc" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, .8fr)', gap: 16, alignItems: 'start' }}>
        <section style={card}>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Detailed Daily Revenue &amp; Profit</h2>
          <div style={{ overflowX: 'auto', maxHeight: 430, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead style={{ position: 'sticky', top: 0, background: '#0f172a' }}><tr><th style={th}>Date</th><th style={th}>Sessions</th><th style={th}>Revenue</th><th style={th}>Expenses</th><th style={th}>Profit</th></tr></thead><tbody>
              {report.dailyRows.length ? report.dailyRows.map(row => <tr key={row.date} onClick={() => setSelectedDate(row.date)} title="Click to view sessions for this date" style={{ cursor: 'pointer', background: selectedDate === row.date ? '#26364d' : 'transparent' }}><td style={{ ...td, color: '#93c5fd', textDecoration: 'underline' }}>{new Date(row.date + 'T00:00:00').toLocaleDateString()}</td><td style={td}>{row.sessions}</td><td style={{ ...td, color: '#fde047' }}>{formatCurrency(row.revenue)}</td><td style={{ ...td, color: '#f87171' }}>{formatCurrency(row.expenses)}</td><td style={{ ...td, color: row.profit >= 0 ? '#4ade80' : '#f87171' }}>{formatCurrency(row.profit)}</td></tr>) : <tr><td colSpan="5" style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 30 }}>No completed sessions or expenses for this month yet.</td></tr>}
            </tbody></table>
          </div>
        </section>
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={card}><h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Revenue Breakdown by Category</h2>{[['Snooker Tables', report.byCategory.find(([k]) => k === 'Snooker Tables')?.[1] || 0], ['Pool Tables', report.byCategory.find(([k]) => k === 'Pool Tables')?.[1] || 0], ['Canteen', report.canteenRevenue]].map(([name, amount]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #334155' }}><span>{name}</span><strong style={{ color: '#4ade80' }}>{formatCurrency(amount)}</strong></div>)}<p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 0 }}>Table revenue: {formatCurrency(report.tableRevenue)}</p></section>
          <section style={card}><h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Monthly Summary</h2><Summary label="Canteen & services revenue" value={formatCurrency(report.canteenRevenue)} /><Summary label="Table revenue" value={formatCurrency(report.tableRevenue)} /><Summary label="Expenses" value={formatCurrency(report.expensesTotal)} /><Summary label="Net profit" value={formatCurrency(report.profit)} /></section>
          <section style={card}><h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Daily Revenue Trend</h2><div style={{ height: 130, display: 'flex', alignItems: 'end', gap: 4, overflowX: 'auto', padding: '8px 2px 24px' }}>{report.dailyRows.map(row => <div key={row.date} title={`${row.date}: ${formatCurrency(row.revenue)}`} style={{ minWidth: 12, flex: 1, height: `${Math.max(5, row.revenue / Math.max(1, ...report.dailyRows.map(d => d.revenue)) * 100)}px`, background: '#86efac', borderRadius: '4px 4px 0 0' }} />)}</div><small style={{ color: '#94a3b8' }}>{report.dailyRows.length} days with activity</small></section>
        </div>
      </div>
      {selectedDate && <div onMouseDown={e => { if (e.target === e.currentTarget) setSelectedDate(null); }} style={{ position: 'fixed', inset: 0, zIndex: 1100, padding: 18, background: 'rgba(2,6,23,.82)', display: 'grid', placeItems: 'center' }}>
        <section style={{ width: 'min(980px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: '#0f172a', border: '1px solid #475569', borderRadius: 16, color: '#f1f5f9', boxShadow: '0 24px 70px #0009' }}>
          <header style={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155' }}>
            <div><h2 style={{ margin: 0, fontSize: 19 }}>Sessions · {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</h2><div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{selectedDateSessions.length} completed session{selectedDateSessions.length === 1 ? '' : 's'}</div></div>
            <button onClick={() => setSelectedDate(null)} aria-label="Close sessions" style={{ border: 0, background: '#334155', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Close ✕</button>
          </header>
          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            {selectedDateSessions.length ? selectedDateSessions.map((session, index) => {
              const table = tables.find(t => t.id === session.tableId);
              const payment = session.paymentMethod === 'bank_transfer' ? 'Bank transfer' : session.paymentMethod === 'card' ? 'Card' : session.paymentMethod === 'credit' ? 'Credit' : 'Cash';
              const duration = Math.max(0, Math.floor(((session.endTime || 0) - (session.startTime || 0)) / 1000));
              return <article key={session.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', borderBottom: '1px solid #334155', paddingBottom: 12, marginBottom: 12 }}>
                  <div><div style={{ color: '#60a5fa', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>BILL #{index + 1}</div><h3 style={{ margin: '5px 0 3px', fontSize: 17 }}>{session.playerName || 'Walk-in customer'}</h3><div style={{ color: '#94a3b8', fontSize: 13 }}>{session.playerPhone || 'No phone recorded'} · {table?.name || (session.tableId === 'canteen' ? 'Canteen' : 'Table')}</div></div>
                  <strong style={{ color: '#4ade80', fontSize: 20 }}>{formatCurrency(session.totalAmount || 0)}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 8, marginBottom: 12 }}>
                  <BillInfo label="Staff on shift" value={session.staffName || session.staffUsername || 'Not recorded'} />
                  {(session.staffShiftStart || session.staffShiftEnd) && <BillInfo label="Assigned shift" value={`${session.staffShiftStart || '—'} – ${session.staffShiftEnd || '—'}`} />}
                  <BillInfo label="Payment handled by" value={session.checkedOutByName || session.staffName || 'Not recorded'} />
                  <BillInfo label="Payment method" value={payment} />
                  <BillInfo label="Duration" value={session.startTime ? formatHumanDuration(duration) : '—'} />
                  <BillInfo label="Started" value={formatClockTime(session.startTime)} />
                  <BillInfo label="Completed" value={formatClockTime(session.endTime)} />
                </div>
                {session.items?.length > 0 && <div style={{ marginBottom: 12, borderTop: '1px solid #334155', borderBottom: '1px solid #334155', padding: '8px 0' }}>{session.items.map((item, itemIndex) => <div key={item.itemId || itemIndex} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', color: '#cbd5e1', fontSize: 13 }}><span>{item.name} × {item.quantity}</span><span>{formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</span></div>)}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
                  <BillInfo label="Table charge" value={formatCurrency(session.tableCost || 0)} />
                  <BillInfo label="Canteen items" value={formatCurrency(session.itemsCost || 0)} />
                  <BillInfo label="Discount" value={formatCurrency(session.discount || 0)} />
                  <BillInfo label="Paid" value={formatCurrency(session.paidAmount || 0)} />
                  <BillInfo label="Credit" value={formatCurrency(session.creditAmount || 0)} />
                  <BillInfo label="Bill total" value={formatCurrency(session.totalAmount || 0)} highlight />
                </div>
              </article>;
            }) : <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', background: '#1e293b', borderRadius: 12 }}>No session bills were recorded for this date.</div>}
          </div>
        </section>
      </div>}
    </div>
  );
}

function Metric({ title, value, tone, subtitle }) {
  return <div style={{ ...card, borderColor: '#475569', minHeight: 100 }}><div style={{ color: '#cbd5e1', fontSize: 13 }}>{title}</div><strong style={{ display: 'block', color: tone, fontSize: 23, marginTop: 9 }}>{value}</strong>{subtitle && <small style={{ color: '#94a3b8' }}>{subtitle}</small>}</div>;
}
function Summary({ label, value }) { return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #334155', color: '#cbd5e1' }}><span>{label}</span><strong style={{ color: '#f1f5f9' }}>{value}</strong></div>; }

function BillInfo({ label, value, highlight }) {
  return <div style={{ padding: '9px 10px', borderRadius: 8, background: '#0f172a' }}>
    <div style={{ color: '#94a3b8', fontSize: 11 }}>{label}</div>
    <div style={{ color: highlight ? '#4ade80' : '#e2e8f0', fontSize: 13, fontWeight: 700, marginTop: 4 }}>{value}</div>
  </div>;
}


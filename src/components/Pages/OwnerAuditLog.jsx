import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getSessionRevenue } from '../../utils/helpers';

export default function OwnerAuditLog() {
  const { completedSessions, expenses } = useApp();
  const events = useMemo(() => [
    ...completedSessions.map(session => ({ id: session.id, time: session.endTime || session.createdAt, kind: 'Session billed', actor: session.playerName || 'Walk-in customer', details: session.tableId === 'canteen' ? 'Canteen sale' : `Table session · ${session.tableId}`, amount: getSessionRevenue(session).total })),
    ...expenses.map(expense => ({ id: expense.id, time: typeof expense.date === 'number' ? expense.date : new Date(expense.date).getTime(), kind: 'Expense recorded', actor: expense.category || 'Club expense', details: expense.description || expense.note || 'Expense entry', amount: Number(expense.amount) || 0 }))
  ].sort((a, b) => b.time - a.time).slice(0, 150), [completedSessions, expenses]);

  return <div style={{ padding: 28, color: '#f1f5f9', minHeight: '100%' }}>
    <h1 style={{ margin: 0 }}>Audit Log</h1>
    <p style={{ color: '#94a3b8', margin: '6px 0 20px' }}>Recent completed sessions and recorded expenses.</p>
    <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, textAlign: 'left' }}>
        <thead style={{ position: 'sticky', top: 0, background: '#0f172a' }}><tr>{['Date and time', 'Activity', 'Details', 'Amount'].map(label => <th key={label} style={{ padding: 13, color: '#cbd5e1', borderBottom: '1px solid #334155' }}>{label}</th>)}</tr></thead>
        <tbody>{events.length ? events.map(event => <tr key={event.id} style={{ borderBottom: '1px solid #334155' }}><td style={cell}>{formatDate(event.time)}</td><td style={{ ...cell, color: event.kind === 'Expense recorded' ? '#fbbf24' : '#4ade80', fontWeight: 700 }}>{event.kind}</td><td style={cell}>{event.details} · {event.actor}</td><td style={cell}>{event.kind === 'Expense recorded' ? '−' : ''}{formatCurrency(event.amount)}</td></tr>) : <tr><td colSpan="4" style={{ ...cell, textAlign: 'center', padding: 36, color: '#94a3b8' }}>No activity recorded yet.</td></tr>}</tbody>
      </table>
    </section>
  </div>;
}
const cell = { padding: 12, borderBottom: '1px solid #334155', color: '#dbe4f0', fontSize: 13 };


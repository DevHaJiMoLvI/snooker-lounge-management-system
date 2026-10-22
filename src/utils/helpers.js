export function generateId() {
  return crypto.randomUUID();
}

export function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatCurrency(amount) {
  return 'Rs. ' + amount.toLocaleString();
}

export function getSessionRevenue(session) {
  const gross = Math.max(0, Number(session?.totalAmount) || 0);
  const discount = Math.min(gross, Math.max(0, Number(session?.discount) || 0));
  const net = gross - discount;
  const tableGross = Math.max(0, Number(session?.tableCost) || 0);
  const canteenGross = Math.max(0, Number(session?.itemsCost) || (session?.items || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0));
  const componentGross = tableGross + canteenGross;
  if (!componentGross) return { total: net, table: net, canteen: 0 };
  const tableDiscount = Math.round(discount * tableGross / componentGross);
  const table = Math.max(0, tableGross - tableDiscount);
  return { total: net, table, canteen: Math.max(0, net - table) };
}

export function getElapsedSeconds(startTimeMs) {
  return Math.floor((Date.now() - startTimeMs) / 1000);
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getDayKey(timestamp) {
  return new Date(timestamp).toISOString().split('T')[0];
}

export function getMonthKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

export function formatPhone(phone) {
  return phone;
}

export function formatHumanDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  if (m > 0) return `${m} min`;
  return `${s} sec`;
}

export function formatClockTime(timestamp) {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatShortDate(timestamp) {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getLiveTableDurations(table, session, now = Date.now()) {
  const extra = Math.max(0, now - (table?.lastStatusAt || now));
  let activeMs = table?.totalActiveMs || 0;
  let idleMs = table?.totalIdleMs || 0;
  if (table?.enabled !== false) {
    if (session) activeMs += extra;
    else idleMs += extra;
  }
  return { activeMs, idleMs };
}

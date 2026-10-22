import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatClockTime, formatHumanDuration, formatShortDate } from '../../utils/helpers';
import ItemThumb from '../ItemThumb';

export default function BillModal({ tableId, onClose }) {
  const {
    getSessionBill,
    completeCheckout,
    addItemToSession,
    removeItemFromSession,
    inventory,
    players,
    tables
  } = useApp();

  const [, setTick] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [amountGiven, setAmountGiven] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [addToHistory, setAddToHistory] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const bill = getSessionBill(tableId);
  const table = tables.find(t => t.id === tableId);

  useEffect(() => {
    if (!bill) onClose();
  }, [bill, onClose]);

  const player = useMemo(
    () => players.find(p => p.phone === bill?.playerPhone),
    [players, bill?.playerPhone]
  );

  if (!bill) return null;

  const discountNum = Math.max(0, Number(discount) || 0);
  const totalAmount = Math.max(0, bill.totalAmount - discountNum);
  // Empty means the default cash/bank payment is the full bill. Entering 0
  // explicitly records a fully unpaid bill and adds it to player credit.
  const given = amountGiven === '' ? totalAmount : Math.max(0, Number(amountGiven) || 0);
  const remainingCredit = paymentMethod === 'credit'
    ? totalAmount
    : Math.max(0, totalAmount - given);
  const paidAmount = paymentMethod === 'credit' ? 0 : Math.min(given, totalAmount);
  const canteenCount = bill.items.reduce((sum, i) => sum + i.quantity, 0);
  const durationMin = Math.max(1, Math.round(bill.duration / 60));
  const paymentMethodLabel = { cash: 'Cash', bank_transfer: 'Bank Transfer', credit: 'Credit' }[paymentMethod] || 'Cash';

  const handleComplete = async () => {
    if (processing) return;
    setProcessing(true);
    setCheckoutError('');
    try {
      await completeCheckout(tableId, paidAmount, remainingCredit, {
        paymentMethod,
        discount: discountNum,
        amountGiven: paymentMethod === 'credit' ? 0 : given,
        addToHistory
      });
      onClose();
    } catch (error) {
      console.error('Could not complete session checkout', error);
      setCheckoutError('The bill could not be saved. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#f1f5f9',
    borderRadius: 8,
    textAlign: 'right'
  };

  const methodBtn = (id, icon, label) => {
    const active = paymentMethod === id;
    return (
      <button
        key={id}
        onClick={() => setPaymentMethod(id)}
        style={{
          flex: 1,
          minHeight: 64,
          borderRadius: 10,
          border: active ? '2px solid #22c55e' : '1px solid #334155',
          background: active ? 'rgba(34,197,94,0.15)' : '#0f172a',
          color: '#e2e8f0',
          cursor: 'pointer',
          fontWeight: 700
        }}
      >
        <div>{icon}</div>
        <div style={{ fontSize: 13 }}>{label}</div>
      </button>
    );
  };

  return (
    <div className="bill-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <article className="bill-print-receipt">
        <h1>786-SHENDER-1</h1>
        <div className="receipt-caption">PAYMENT RECEIPT</div>
        <hr />
        <div className="receipt-meta"><span>Table</span><strong>{bill.tableName}</strong></div>
        <div className="receipt-meta"><span>Player</span><strong>{bill.playerName}</strong></div>
        {bill.playerPhone && <div className="receipt-meta"><span>Phone</span><strong>{bill.playerPhone}</strong></div>}
        <div className="receipt-meta"><span>Date</span><strong>{formatShortDate(Date.now())}</strong></div>
        <div className="receipt-meta"><span>Duration</span><strong>{formatHumanDuration(bill.duration)} ({durationMin} min)</strong></div>
        <hr />
        <table>
          <thead><tr><th>Item</th><th>Amount</th></tr></thead>
          <tbody>
            <tr><td>Table charge</td><td>{formatCurrency(bill.baseTableCost)}</td></tr>
            {bill.controllerCount > 0 && <tr><td>PS5 controllers ({bill.controllerCount})</td><td>{formatCurrency(bill.controllerCost)}</td></tr>}
            {bill.items.map((item, idx) => <tr key={item.itemId || idx}><td>{item.name} × {item.quantity}</td><td>{formatCurrency(item.price * item.quantity)}</td></tr>)}
          </tbody>
        </table>
        <hr />
        <div className="receipt-meta"><span>Subtotal</span><strong>{formatCurrency(bill.totalAmount)}</strong></div>
        {discountNum > 0 && <div className="receipt-meta"><span>Discount</span><strong>- {formatCurrency(discountNum)}</strong></div>}
        <div className="receipt-meta receipt-total"><span>Total</span><strong>{formatCurrency(totalAmount)}</strong></div>
        <div className="receipt-meta"><span>Payment</span><strong>{paymentMethodLabel}</strong></div>
        <div className="receipt-meta"><span>Paid</span><strong>{formatCurrency(paidAmount)}</strong></div>
        {remainingCredit > 0 && <div className="receipt-meta"><span>Credit due</span><strong>{formatCurrency(remainingCredit)}</strong></div>}
        <hr />
        <div className="receipt-thanks">Thank you</div>
      </article>

      <div className="bill-modal-card" style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 16, width: 'min(1100px, 96vw)', maxHeight: '94vh', overflow: 'auto', color: '#e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 22px', borderBottom: '1px solid #1e293b' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{bill.tableName} - Stop & Bill</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Review session details, consumed items and complete the payment.</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        <div className="bill-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr', gap: 16, padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
              <div style={{ fontSize: 12, letterSpacing: 1, color: '#94a3b8', fontWeight: 700, marginBottom: 12 }}>SESSION DETAILS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  ['⏰ Start Time', formatClockTime(bill.startTime), formatShortDate(bill.startTime)],
                  ['⬤ End Time', formatClockTime(Date.now()), formatShortDate(Date.now())],
                  ['⏱ Total Duration', formatHumanDuration(bill.duration), `(${durationMin} minutes)`],
                  ['⬛ Table', bill.tableName, table?.type ? `${table.type} table` : '']
                ].map(([label, main, sub]) => (
                  <div key={label} style={{ background: '#0f172a', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
                    <div style={{ fontWeight: 800, marginTop: 6 }}>{main}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, letterSpacing: 1, color: '#94a3b8', fontWeight: 700 }}>ITEMS CONSUMED</div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowAddMenu(v => !v)}
                    style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Item ▾
                  </button>
                  {showAddMenu && (
                    <div style={{ position: 'absolute', right: 0, top: '110%', width: 280, background: '#0f172a', border: '1px solid #334155', borderRadius: 10, zIndex: 5, maxHeight: 280, overflowY: 'auto' }}>
                      {inventory.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { addItemToSession(tableId, item, 1); setShowAddMenu(false); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <ItemThumb item={item} size={32} />
                          <span style={{ flex: 1 }}>{item.name}</span>
                          <span style={{ color: '#4ade80' }}>{formatCurrency(item.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>#</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid #334155' }}>
                    <td style={{ padding: '10px 4px' }}>1</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div>Table Charge ({bill.tableName})</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{formatHumanDuration(bill.duration)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{durationMin} min</td>
                    <td>{formatCurrency(bill.ratePerHour)} / {bill.rateUnit === 'hour' ? 'hr' : 'min'}</td>
                    <td style={{ color: '#4ade80', fontWeight: 700 }}>{formatCurrency(bill.baseTableCost)}</td>
                    <td style={{ color: '#64748b' }}>-</td>
                  </tr>
                  {bill.controllerCount > 0 && (
                    <tr style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '10px 4px' }}>2</td>
                      <td>PS5 Controllers</td>
                      <td>{bill.controllerCount} × {durationMin} min</td>
                      <td>{formatCurrency(bill.controllerRatePerHour)} / controller / hr</td>
                      <td style={{ color: '#4ade80', fontWeight: 700 }}>{formatCurrency(bill.controllerCost)}</td>
                      <td style={{ color: '#64748b' }}>-</td>
                    </tr>
                  )}
                  {bill.items.map((item, idx) => (
                    <tr key={item.itemId || idx} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '10px 4px' }}>{idx + (bill.controllerCount > 0 ? 3 : 2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ItemThumb item={item} size={34} />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td style={{ color: '#4ade80', fontWeight: 700 }}>{formatCurrency(item.price * item.quantity)}</td>
                      <td>
                        <button
                          onClick={() => removeItemFromSession(tableId, item.itemId)}
                          style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: 1, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>PLAYER DETAILS</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{bill.playerName}</div>
                <div style={{ color: '#94a3b8' }}>{bill.playerPhone}</div>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 10, padding: '10px 14px', textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Current Credit Balance</div>
                <div style={{ color: '#facc15', fontWeight: 800, fontSize: 20 }}>{formatCurrency(player?.pendingDues || 0)}</div>
              </div>
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
              <div style={{ fontSize: 12, letterSpacing: 1, color: '#94a3b8', fontWeight: 700, marginBottom: 12 }}>PAYMENT SUMMARY</div>
              <Row label={`Table Charge (${durationMin} min)`} value={formatCurrency(bill.tableCost)} />
              <Row label={`Canteen Items (${canteenCount})`} value={formatCurrency(bill.itemsCost)} />
              <Row label="Subtotal" value={formatCurrency(bill.totalAmount)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                <span style={{ color: '#94a3b8' }}>Discount (Optional)</span>
                <input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} style={{ ...inputStyle, width: 110 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 800, marginTop: 12 }}>
                <span>Total Amount</span>
                <span style={{ color: '#4ade80' }}>{formatCurrency(totalAmount)}</span>
              </div>
            </section>

            <section style={{ background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
              <div style={{ fontSize: 12, letterSpacing: 1, color: '#94a3b8', fontWeight: 700, marginBottom: 12 }}>PAYMENT METHOD</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {methodBtn('cash', '💵', 'Cash')}
                {methodBtn('bank_transfer', '🏦', 'Bank Transfer')}
                {methodBtn('credit', '👤', 'Credit')}
              </div>
              {paymentMethod !== 'credit' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span>Amount Given</span>
                    <input type="number" min="0" value={amountGiven} placeholder={String(totalAmount)} aria-label={`Amount given; blank means full payment of Rs. ${totalAmount}`} onChange={e => setAmountGiven(e.target.value)} style={{ ...inputStyle, width: 120 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Remaining (To Add as Credit)</span>
                    <span style={{ color: remainingCredit > 0 ? '#f87171' : '#4ade80' }}>{formatCurrency(remainingCredit)}</span>
                  </div>
                </>
              )}
              {remainingCredit > 0 && (
                <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid #7f1d1d', borderRadius: 10, padding: 10, color: '#fecaca', fontSize: 13 }}>
                  {formatCurrency(remainingCredit)} will be added to player's credit balance.
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: '#cbd5e1' }}>
                <input type="checkbox" checked={addToHistory} onChange={e => setAddToHistory(e.target.checked)} />
                Add to player history
              </label>
            </section>

            <div className="bill-action-buttons" style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.print()} style={{ flex: 1, minHeight: 48, borderRadius: 10, border: '1px solid #64748b', background: 'transparent', color: '#e2e8f0', cursor: 'pointer' }}>Print Bill</button>
              <button onClick={onClose} style={{ flex: 1, minHeight: 48, borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}>Cancel</button>
              <button disabled={processing} onClick={handleComplete} style={{ flex: 2, minHeight: 48, borderRadius: 10, border: 'none', background: processing ? '#475569' : '#22c55e', color: 'white', fontWeight: 800, cursor: processing ? 'wait' : 'pointer' }}>
                {processing ? 'Saving bill…' : '✓ Complete Payment & Generate Bill'}
              </button>
            </div>
            {checkoutError && <p role="alert" style={{ color: '#fca5a5', margin: '8px 0 0', textAlign: 'center' }}>{checkoutError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#cbd5e1' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

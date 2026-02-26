'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../../lib/adminApi';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }

const PAYMENT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
    cash: { color: '#e67e22', bg: 'rgba(230,126,34,0.15)', border: 'rgba(230,126,34,0.4)' },
    easypaisa: { color: '#00a651', bg: 'rgba(0,166,81,0.15)', border: 'rgba(0,166,81,0.4)' },
    jazzcash: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)' },
};

interface Sale {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    payment_method: string;
    created_at: string;
}

export default function TuckShopPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [unitPrice, setUnitPrice] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await adminFetch<{ sales: Sale[]; total: number }>('/api/tuckshop/today');
            setSales(data.sales);
            setTotal(data.total);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const cashTotal = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total_price), 0);
    const onlineTotal = total - cashTotal;

    const handleAddSale = async () => {
        if (!itemName || !quantity || !unitPrice) { alert('Fill all fields'); return; }
        setSubmitting(true);
        try {
            await adminFetch('/api/tuckshop/sale', {
                method: 'POST',
                body: JSON.stringify({ itemName, quantity: Number(quantity), unitPrice: Number(unitPrice), paymentMethod }),
            });
            setModalOpen(false);
            setItemName(''); setQuantity('1'); setUnitPrice('');
            loadData();
        } catch { alert('Failed to add sale'); }
        finally { setSubmitting(false); }
    };

    const computedTotal = Number(quantity || 0) * Number(unitPrice || 0);

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: 0 }}>TUCK SHOP</h1>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: '#C9A84C' }}>PKR {fmt(total)}</span>
                </div>
                <button onClick={() => setModalOpen(true)} className="btn-futuristic" style={{ fontSize: 12, height: 44, padding: '0 24px' }}>
                    ADD SALE <span className="btn-arrow">→</span>
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { label: "TODAY'S TOTAL", value: `PKR ${fmt(total)}`, accent: '#C9A84C' },
                    { label: 'CASH SALES', value: `PKR ${fmt(cashTotal)}`, accent: '#e67e22' },
                    { label: 'ONLINE SALES', value: `PKR ${fmt(onlineTotal)}`, accent: '#00a651' },
                ].map(c => (
                    <div key={c.label} style={{
                        background: '#111218', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 4, padding: 20, position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{c.label}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 28, fontWeight: 800, color: '#fff' }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                        <thead>
                            <tr>
                                {['#', 'ITEM', 'QTY', 'UNIT PRICE', 'TOTAL', 'PAYMENT', 'TIME'].map(h => (
                                    <th key={h} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(139,26,43,0.3)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)' }}>No sales today</td></tr>}
                            {sales.map((s, i) => {
                                const ps = PAYMENT_STYLES[s.payment_method] || PAYMENT_STYLES.cash;
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{i + 1}</td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: '#fff' }}>{s.item_name}</td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{s.quantity}</td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>PKR {fmt(s.unit_price)}</td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: '#fff' }}>PKR {fmt(s.total_price)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ background: ps.bg, border: `1px solid ${ps.border}`, borderRadius: 12, padding: '2px 10px', fontSize: 10, fontWeight: 600, color: ps.color, textTransform: 'uppercase' }}>{s.payment_method}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{new Date(s.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══ ADD SALE MODAL ═══ */}
            {modalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={() => setModalOpen(false)}
                >
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#111218', border: '1px solid rgba(139,26,43,0.3)',
                        borderRadius: 4, padding: 40, maxWidth: 440, width: '100%',
                    }}>
                        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: '0 0 24px' }}>ADD SALE</h2>

                        {[
                            { label: 'ITEM NAME', value: itemName, set: setItemName, type: 'text' },
                            { label: 'QUANTITY', value: quantity, set: setQuantity, type: 'number' },
                            { label: 'UNIT PRICE (PKR)', value: unitPrice, set: setUnitPrice, type: 'number' },
                        ].map(f => (
                            <div key={f.label} style={{ marginBottom: 16 }}>
                                <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} style={{
                                    width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 2, padding: '12px 14px', color: '#fff', fontSize: 14,
                                    fontFamily: 'var(--font-ui)', outline: 'none',
                                }} />
                            </div>
                        ))}

                        {/* Total display */}
                        <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 2, padding: 16, marginBottom: 20, textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C', marginBottom: 6 }}>TOTAL</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#C9A84C' }}>PKR {fmt(computedTotal)}</div>
                        </div>

                        {/* Payment method */}
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>PAYMENT METHOD</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                            {[['cash', 'CASH'], ['easypaisa', 'EASYPAISA'], ['jazzcash', 'JAZZCASH']].map(([val, label]) => (
                                <button key={val} onClick={() => setPaymentMethod(val)} style={{
                                    flex: 1, height: 40, borderRadius: 2,
                                    background: paymentMethod === val ? '#8B1A2B' : 'transparent',
                                    border: `1px solid ${paymentMethod === val ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', letterSpacing: '0.05em',
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <button onClick={handleAddSale} disabled={submitting} className="btn-futuristic" style={{ flex: 1 }}>
                                {submitting ? 'SAVING...' : 'SAVE SALE'}
                                <span className="btn-arrow">→</span>
                            </button>
                            <button onClick={() => setModalOpen(false)} style={{
                                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                            }}>CANCEL</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

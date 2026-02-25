'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0);
const fmtT = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const PAY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    cash: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '#f59e0b' },
    easypaisa: { bg: 'rgba(0,136,255,0.12)', color: '#0088ff', border: '#0088ff' },
    jazzcash: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '#8b5cf6' },
};

// Toggle button extracted to avoid hooks in loops
function MethodToggle({ method, selected, onSelect }: { method: string; selected: boolean; onSelect: () => void }) {
    return (
        <button type="button" onClick={onSelect} style={{
            flex: 1, height: 44, borderRadius: 10, fontWeight: 700, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit',
            border: selected ? '1px solid #00ff88' : '1px solid rgba(255,255,255,0.1)',
            background: selected ? 'rgba(0,255,136,0.12)' : '#1a1a2e',
            color: selected ? '#00ff88' : '#6b7280',
            transition: 'all 0.15s ease',
        }}>{method}</button>
    );
}

export default function AdminTuckShop() {
    const [sales, setSales] = useState<any[]>([]);
    const [totals, setTotals] = useState({ total: 0, cash: 0, online: 0 });
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [itemName, setItemName] = useState('');
    const [qty, setQty] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [payMethod, setPayMethod] = useState('cash');
    const [submitting, setSubmitting] = useState(false);

    const fetchSales = async () => {
        setLoading(true);
        const s = localStorage.getItem('adminSecret') || '';
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tuckshop/today`, { headers: { 'x-admin-secret': s } });
            if (r.ok) {
                const d = await r.json();
                const list = d.sales || [];
                setSales(list);
                let cash = 0, online = 0, total = 0;
                list.forEach((x: any) => {
                    const a = Number(x.total_price);
                    total += a;
                    if (x.payment_method === 'cash') cash += a; else online += a;
                });
                setTotals({ total, cash, online });
            }
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchSales(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const s = localStorage.getItem('adminSecret') || '';
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tuckshop/sale`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': s },
                body: JSON.stringify({ itemName, quantity: qty, unitPrice, paymentMethod: payMethod }),
            });
            if (r.ok) {
                setModal(false);
                setItemName(''); setQty(1); setUnitPrice(0); setPayMethod('cash');
                fetchSales();
            } else {
                const err = await r.json();
                alert(err.error || 'Failed to add sale');
            }
        } finally { setSubmitting(false); }
    };

    const stats = [
        { label: "Today's Sales", value: fmt(totals.total), color: '#00ff88', borderColor: 'rgba(0,255,136,0.15)' },
        { label: 'Cash Sales', value: fmt(totals.cash), color: '#f59e0b', borderColor: 'rgba(245,158,11,0.15)' },
        { label: 'Online Sales', value: fmt(totals.online), color: '#0088ff', borderColor: 'rgba(0,136,255,0.15)' },
    ];

    const inp: React.CSSProperties = {
        width: '100%', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14,
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:#00ff88!important;box-shadow:0 0 0 3px rgba(0,255,136,0.1)!important}`}</style>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Tuck Shop</h1>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Point of sale & daily tracking</p>
                </div>
                <button onClick={() => setModal(true)} style={{
                    height: 44, padding: '0 24px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg,#00ff88,#00cc6a)', color: '#000',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 4px 15px rgba(0,255,136,0.3)',
                    transition: 'transform 0.15s',
                }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    ➕ Add Sale
                </button>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                {stats.map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        style={{
                            flex: 1, background: '#111827', borderRadius: 16, padding: 24,
                            border: `1px solid ${s.borderColor}`,
                            borderTopWidth: 3, borderTopColor: s.color, textAlign: 'center',
                        }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>{s.label}</p>
                        <p style={{ fontSize: 32, fontWeight: 800, color: s.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Table */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ background: '#111827', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '2px solid rgba(0,255,136,0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Today's Transactions</h2>
                    <span style={{ background: '#1a1a2e', color: '#9ca3af', borderRadius: 20, padding: '2px 12px', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)' }}>
                        {sales.length}
                    </span>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 160, gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', animation: 'spin 0.7s linear infinite' }} />
                    </div>
                ) : sales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                        <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>No sales recorded today</p>
                        <p style={{ fontSize: 13, color: '#4b5563', margin: '8px 0 0' }}>Click "+ Add Sale" to record a transaction</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: '#0d0d1a' }}>
                                    {['#', 'Item', 'Qty', 'Unit Price', 'Total', 'Payment', 'Time'].map(h => (
                                        <th key={h} style={{ padding: '0 16px', height: 44, textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((s, i) => {
                                    const rowBg = i % 2 === 0 ? '#111827' : '#0d0d1a';
                                    const pc = PAY_COLORS[s.payment_method] || PAY_COLORS.cash;
                                    return (
                                        <motion.tr key={s.id}
                                            initial={{ opacity: 0, x: -6 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            style={{ background: rowBg }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,136,0.03)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>
                                            <td style={{ padding: '0 16px', height: 52, fontSize: 12, color: '#4b5563', fontWeight: 600 }}>{i + 1}</td>
                                            <td style={{ padding: '0 16px', fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>{s.item_name}</td>
                                            <td style={{ padding: '0 16px', fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>{s.quantity}</td>
                                            <td style={{ padding: '0 16px', fontSize: 13, color: '#9ca3af' }}>{fmt(s.unit_price)}</td>
                                            <td style={{ padding: '0 16px', fontSize: 14, fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{fmt(s.total_price)}</td>
                                            <td style={{ padding: '0 16px' }}>
                                                <span style={{
                                                    background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
                                                    borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                                                    textTransform: 'uppercase', display: 'inline-block',
                                                }}>{s.payment_method}</span>
                                            </td>
                                            <td style={{ padding: '0 16px', fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{fmtT(s.created_at)}</td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary footer */}
                {sales.length > 0 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                            {sales.length} items sold · Cash: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmt(totals.cash)}</span> · Online: <span style={{ color: '#0088ff', fontWeight: 600 }}>{fmt(totals.online)}</span>
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#00ff88' }}>Total: {fmt(totals.total)}</span>
                    </div>
                )}
            </motion.div>

            {/* ADD SALE MODAL */}
            <AnimatePresence>
                {modal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: 16 }}
                        onClick={() => setModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={e => e.stopPropagation()}
                            style={{ width: 400, background: '#111827', borderRadius: 16, padding: 32, border: '1px solid rgba(0,255,136,0.15)', position: 'relative' }}>

                            {/* Close X */}
                            <button onClick={() => setModal(false)} style={{
                                position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                                color: '#6b7280', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1,
                            }}>✕</button>

                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Record Sale</h2>

                            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Item Name</label>
                                    <input required autoFocus placeholder="e.g. Water Bottle" value={itemName} onChange={e => setItemName(e.target.value)} style={inp} />
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Quantity</label>
                                        <input type="number" min={1} required value={qty} onChange={e => setQty(Number(e.target.value))} style={inp} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Unit Price (PKR)</label>
                                        <input type="number" min={1} required value={unitPrice || ''} onChange={e => setUnitPrice(Number(e.target.value))} style={inp} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Payment Method</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['cash', 'easypaisa', 'jazzcash'].map(m => (
                                            <MethodToggle key={m} method={m} selected={payMethod === m} onSelect={() => setPayMethod(m)} />
                                        ))}
                                    </div>
                                </div>
                                {/* Total */}
                                <div style={{ background: '#0d0d1a', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,255,136,0.12)' }}>
                                    <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>TOTAL</span>
                                    <span style={{ fontSize: 24, fontWeight: 800, color: '#00ff88', fontVariantNumeric: 'tabular-nums' }}>{fmt(qty * unitPrice)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                    <button type="button" onClick={() => setModal(false)} style={{
                                        flex: 1, height: 44, borderRadius: 10, border: 'none',
                                        background: '#1a1a2e', color: '#6b7280', fontSize: 14, fontWeight: 600,
                                        cursor: 'pointer', fontFamily: 'inherit',
                                    }}>Cancel</button>
                                    <button type="submit" disabled={submitting} style={{
                                        flex: 1, height: 44, borderRadius: 10, border: 'none',
                                        background: 'linear-gradient(135deg,#00ff88,#00cc6a)', color: '#000',
                                        fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                        opacity: submitting ? 0.6 : 1,
                                    }}>{submitting ? 'Saving...' : 'Save Sale'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtTime = (t: string) => {
    const [hStr, mStr] = t.substring(0, 5).split(':');
    const h = parseInt(hStr);
    return `${h % 12 || 12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`;
};

// ─── StatusPill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; border: string }> = {
        paid: { bg: '#022c22', color: '#00ff88', border: '#00ff88' },
        pending: { bg: '#2d1a00', color: '#f59e0b', border: '#f59e0b' },
        confirmed: { bg: '#001a2d', color: '#0088ff', border: '#0088ff' },
        cancelled: { bg: '#2d0000', color: '#ef4444', border: '#ef4444' },
    };
    const s = map[status] ?? { bg: '#1a1a2e', color: '#9ca3af', border: '#374151' };
    return (
        <span style={{
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block',
            boxShadow: `0 0 6px ${s.border}44`,
        }}>
            {status}
        </span>
    );
}

// ─── ActionButton ─────────────────────────────────────────────────────────────
function ActionButton({ label, color, onClick, disabled }: {
    label: string; color: string; onClick: () => void; disabled?: boolean;
}) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                background: hov ? color : 'transparent',
                border: `1px solid ${color}`,
                color: hov ? (color === '#ef4444' ? '#fff' : '#000') : color,
                borderRadius: 6, padding: '4px 10px', fontSize: 11,
                fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', height: 30,
                transition: 'background 0.15s ease, color 0.15s ease',
                opacity: disabled ? 0.4 : 1,
            }}
        >
            {label}
        </button>
    );
}

// ─── Input styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    background: '#111827', border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: 8, padding: '0 14px', color: '#fff',
    height: 44, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    width: '100%', boxSizing: 'border-box',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminBookings() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');

    // Filters
    const [page, setPage] = useState(1);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [groundId, setGroundId] = useState('');
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');

    const fetchBookings = useCallback(async () => {
        setIsLoading(true);
        const secret = localStorage.getItem('adminSecret') || '';
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (groundId) params.append('ground_id', groundId);
            if (status) params.append('status', status);
            if (search) params.append('search', search);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/all?${params}`,
                { headers: { 'x-admin-secret': secret } }
            );
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [page, dateFrom, dateTo, groundId, status, search]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);
    useEffect(() => { setPage(1); }, [dateFrom, dateTo, groundId, status, search]);

    const handleMarkPaid = async (ref: string) => {
        const secret = localStorage.getItem('adminSecret') || '';
        setActionLoading(ref + '-pay');
        try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/${ref}/confirm-payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
                body: JSON.stringify({ paymentMethod: 'cash', transactionId: 'CASH-' + Date.now() }),
            });
            fetchBookings();
        } finally { setActionLoading(''); }
    };

    const handleCancel = async (ref: string) => {
        const secret = localStorage.getItem('adminSecret') || '';
        if (!confirm(`Cancel booking ${ref}?`)) return;
        setActionLoading(ref + '-cancel');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/${ref}/cancel`, {
                method: 'PUT', headers: { 'x-admin-secret': secret },
            });
            if (!res.ok) alert((await res.json()).error || 'Failed to cancel');
            else fetchBookings();
        } finally { setActionLoading(''); }
    };

    const exportCSV = () => {
        if (!bookings.length) return;
        const headers = ['Ref', 'Ground', 'Customer', 'Phone', 'Date', 'Time', 'Duration', 'Total', 'Advance', 'Remaining', 'Booking Status', 'Payment Status'];
        const rows = bookings.map(b => [
            b.booking_ref, b.grounds?.name || b.ground_id, b.customer_name, b.customer_phone,
            b.date, `${b.start_time}-${b.end_time}`, b.duration_hours,
            b.base_price, b.advance_amount, b.remaining_amount, b.booking_status, b.payment_status,
        ]);
        const csv = 'data:text/csv;charset=utf-8,' + encodeURI([headers, ...rows].map(r => r.join(',')).join('\n'));
        const a = document.createElement('a');
        a.href = csv;
        a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredRevenue = bookings.reduce((s, b) => s + (b.payment_status === 'paid' ? Number(b.base_price) : 0), 0);

    const GROUNDS = [
        { label: 'All Grounds', value: '' },
        { label: 'Ground 1 (7v7)', value: 'f5d72f2e-ecb4-4e20-968e-0b13bed58d10' },
        { label: 'Ground 2 (7v7)', value: 'a1c9e83f-1d2b-4e8c-9e20-1b23ced58d11' },
        { label: 'Ground 3 (7v7)', value: 'b2d8f74a-2e3c-4f9d-8f31-2c34ded58d12' },
        { label: 'Ground 4 (9v9)', value: 'c3e9a85b-3f4d-4a0e-9042-3d45eed58d13' },
        { label: 'Ground 5 (11v11)', value: 'd4f0b96c-4a5e-4b1f-a153-4e56fed58d14' },
    ];

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: '#fff' }}>
            <style>{`
                @keyframes spin { to{transform:rotate(360deg)} }
                input:focus, select:focus { border-color: #00ff88 !important; box-shadow: 0 0 0 3px rgba(0,255,136,0.1) !important; outline: none; }
            `}</style>

            {/* PAGE HEADER */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>All Bookings</h1>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                        Manage and filter all booking records
                    </p>
                </div>
                <button onClick={exportCSV} style={{
                    background: 'transparent', border: '1px solid rgba(0,255,136,0.4)',
                    color: '#00ff88', borderRadius: 8, padding: '10px 20px',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background 0.15s',
                }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,136,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    📥 Export CSV
                </button>
            </motion.div>

            {/* FILTERS */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}
                style={{ background: '#111827', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 140px' }}>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Date From</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Date To</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Ground</label>
                    <select value={groundId} onChange={e => setGroundId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                        {GROUNDS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                        <option value="">All Statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div style={{ flex: '2 1 220px' }}>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Search</label>
                    <input type="text" placeholder="🔍  Search by phone or ref..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
                </div>
                <button onClick={() => { setDateFrom(''); setDateTo(''); setGroundId(''); setStatus(''); setSearch(''); }}
                    style={{ height: 44, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Clear
                </button>
            </motion.div>

            {/* RESULTS SUMMARY */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                    Showing <span style={{ color: '#fff', fontWeight: 600 }}>{bookings.length}</span> of <span style={{ color: '#fff', fontWeight: 600 }}>{total}</span> bookings
                </span>
                <span style={{ fontSize: 13, color: '#00ff88', fontWeight: 600 }}>
                    Paid total: {fmt(filteredRevenue)}
                </span>
            </div>

            {/* TABLE */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}
                style={{ background: '#111827', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', animation: 'spin 0.7s linear infinite' }} />
                        <span style={{ color: '#6b7280', fontSize: 14 }}>Loading bookings...</span>
                    </div>
                ) : bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
                        <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>No bookings found</p>
                        <p style={{ fontSize: 13, color: '#4b5563', margin: '8px 0 0' }}>Try adjusting your filters</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: '#0d0d1a' }}>
                                    {['#', 'Ref', 'Ground', 'Customer', 'Phone', 'Date', 'Time', 'Dur.', 'Total', 'Advance', 'Remaining', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '0 14px', height: 44, textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', borderBottom: '2px solid rgba(0,255,136,0.15)' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((b, ri) => {
                                    const isPaid = b.payment_status === 'paid';
                                    const isCancelled = b.booking_status === 'cancelled';
                                    const rowBg = ri % 2 === 0 ? '#111827' : '#0d0d1a';
                                    return (
                                        <motion.tr key={b.booking_ref}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: isCancelled ? 0.45 : 1, x: 0 }}
                                            transition={{ delay: ri * 0.03, duration: 0.2 }}
                                            style={{ background: rowBg }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,136,0.03)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                        >
                                            <td style={{ padding: '0 14px', height: 52, fontSize: 12, color: '#4b5563', fontWeight: 600 }}>{(page - 1) * 20 + ri + 1}</td>
                                            <td style={{ padding: '0 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#00ff88', whiteSpace: 'nowrap' }}>{b.booking_ref}</td>
                                            <td style={{ padding: '0 14px', fontSize: 13, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap' }}>{b.grounds?.name || b.ground_id}</td>
                                            <td style={{ padding: '0 14px', fontSize: 13, color: '#d1d5db', whiteSpace: 'nowrap' }}>{b.customer_name}</td>
                                            <td style={{ padding: '0 14px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{b.customer_phone}</td>
                                            <td style={{ padding: '0 14px', fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(b.date)}</td>
                                            <td style={{ padding: '0 14px', fontSize: 12, color: '#d1d5db', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtTime(b.start_time)} → {fmtTime(b.end_time)}</td>
                                            <td style={{ padding: '0 14px', fontSize: 13, color: '#9ca3af' }}>{b.duration_hours}h</td>
                                            <td style={{ padding: '0 14px', fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(b.base_price)}</td>
                                            <td style={{ padding: '0 14px', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmt(b.advance_amount)}</td>
                                            <td style={{ padding: '0 14px', fontSize: 13, fontWeight: 700, color: '#00ff88', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(b.remaining_amount)}</td>
                                            <td style={{ padding: '0 14px', whiteSpace: 'nowrap' }}>
                                                <StatusPill status={isCancelled ? 'cancelled' : isPaid ? 'paid' : 'pending'} />
                                            </td>
                                            <td style={{ padding: '0 14px', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {!isPaid && !isCancelled && (
                                                        <ActionButton label="✓ Pay" color="#00ff88" disabled={actionLoading === b.booking_ref + '-pay'} onClick={() => handleMarkPaid(b.booking_ref)} />
                                                    )}
                                                    {!isCancelled && (
                                                        <ActionButton label="✕ Cancel" color="#ef4444" disabled={actionLoading === b.booking_ref + '-cancel'} onClick={() => handleCancel(b.booking_ref)} />
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PAGINATION */}
                {totalPages > 1 && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Total: <b style={{ color: '#fff' }}>{total}</b> records</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', color: page === 1 ? '#4b5563' : '#fff', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                ← Prev
                            </button>
                            <span style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 700, color: '#00ff88', fontVariantNumeric: 'tabular-nums' }}>
                                {page} / {totalPages}
                            </span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', color: page === totalPages ? '#4b5563' : '#fff', fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

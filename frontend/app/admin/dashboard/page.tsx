'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../../lib/adminApi';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }
function fmtTime(t: string) {
    if (!t) return '';
    const h = parseInt(t.split(':')[0], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:00 ${ampm}`;
}

interface KPI { label: string; value: string; sub: string; accent: string; icon: string; }

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
    confirmed: { bg: 'rgba(0,166,81,0.15)', border: 'rgba(0,166,81,0.4)', color: '#00a651', label: '● CONFIRMED' },
    pending: { bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.4)', color: '#C9A84C', label: '● PENDING' },
    cancelled: { bg: 'rgba(139,26,43,0.15)', border: 'rgba(139,26,43,0.4)', color: '#8B1A2B', label: '● CANCELLED' },
};

export default function DashboardPage() {
    const [clock, setClock] = useState('');
    const [dateStr, setDateStr] = useState('');
    const [summary, setSummary] = useState<{ revenueToday: number; totalRevenueThisMonth: number; bookingsToday: number; totalBookingsThisMonth: number } | null>(null);
    const [bookings, setBookings] = useState<Array<Record<string, unknown>>>([]);
    const [sendingReport, setSendingReport] = useState(false);

    // Live clock
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setClock(now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
            setDateStr(now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const loadData = useCallback(async () => {
        try {
            const [s, t] = await Promise.all([
                adminFetch<{ revenueToday: number; totalRevenueThisMonth: number; bookingsToday: number; totalBookingsThisMonth: number }>('/api/reports/summary'),
                adminFetch<{ bookings: Array<Record<string, unknown>> }>('/api/bookings/today'),
            ]);
            setSummary(s);
            setBookings(t.bookings.slice(0, 10));
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSendDaily = async () => {
        setSendingReport(true);
        try { await adminFetch('/api/reports/send-daily', { method: 'POST' }); alert('Daily report sent to WhatsApp!'); }
        catch { alert('Failed to send report'); }
        finally { setSendingReport(false); }
    };

    const handleMarkPaid = async (ref: string) => {
        try {
            const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            await fetch(`${base}/api/bookings/${ref}/confirm-payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': localStorage.getItem('adminSecret') || '' },
                body: JSON.stringify({ paymentMethod: 'cash' }),
            });
            loadData();
        } catch { alert('Failed to mark as paid'); }
    };

    const kpis: KPI[] = [
        { label: "TODAY'S REVENUE", value: summary ? `PKR ${fmt(summary.revenueToday)}` : '...', sub: 'Today', accent: '#8B1A2B', icon: '₨' },
        { label: 'MONTH REVENUE', value: summary ? `PKR ${fmt(summary.totalRevenueThisMonth)}` : '...', sub: 'This month', accent: '#C9A84C', icon: '📈' },
        { label: "TODAY'S BOOKINGS", value: summary ? String(summary.bookingsToday) : '...', sub: 'Today', accent: '#0088ff', icon: '📋' },
        { label: 'MONTH BOOKINGS', value: summary ? String(summary.totalBookingsThisMonth) : '...', sub: 'This month', accent: '#8b5cf6', icon: '📅' },
        { label: 'ACTIVE NOW', value: String(bookings.filter((b) => b.booking_status === 'confirmed' && b.payment_status === 'paid').length), sub: 'Confirmed & paid', accent: '#00a651', icon: '⚡' },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: 0 }}>DASHBOARD</h1>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{dateStr} • {clock}</div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                {kpis.map((kpi) => (
                    <div key={kpi.label} style={{
                        background: '#111218', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 4, padding: 20, position: 'relative', overflow: 'hidden',
                        transition: 'border-color 0.2s ease, transform 0.2s ease', cursor: 'default',
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(139,26,43,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: kpi.accent }} />
                        <div style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: `${kpi.accent}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{kpi.icon}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>{kpi.label}</div>
                        <div className="kpi-value" style={{ fontFamily: 'var(--font-ui)', fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 4 }}>{kpi.value}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
                <button onClick={handleSendDaily} disabled={sendingReport} className="btn-futuristic" style={{ fontSize: 12, height: 44, padding: '0 24px' }}>
                    {sendingReport ? 'SENDING...' : 'SEND DAILY REPORT'}
                </button>
                <button onClick={() => window.location.href = '/admin/reports'} className="btn-futuristic" style={{ fontSize: 12, height: 44, padding: '0 24px' }}>
                    VIEW WEEKLY REPORT
                </button>
                <button onClick={() => window.location.href = '/admin/tuckshop'} className="btn-futuristic" style={{ fontSize: 12, height: 44, padding: '0 24px' }}>
                    TUCK SHOP
                </button>
            </div>

            {/* Recent Bookings Table */}
            <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(139,26,43,0.3)' }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>RECENT BOOKINGS</span>
                </div>
                <div style={{ overflowX: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['REF', 'GROUND', 'CUSTOMER', 'PHONE', 'TIME', 'AMOUNT', 'STATUS', 'ACTION'].map((h) => (
                                    <th key={h} className={['PHONE', 'AMOUNT'].includes(h) ? 'hide-mobile' : ''} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(139,26,43,0.3)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>No bookings today</td></tr>
                            )}
                            {bookings.map((b, i) => {
                                const st = STATUS_STYLES[(b.booking_status as string)] || STATUS_STYLES.pending;
                                const groundName = (b.grounds as Record<string, string>)?.name || '?';
                                return (
                                    <tr key={b.booking_ref as string} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,26,43,0.06)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'; }}
                                    >
                                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#C9A84C', fontVariantNumeric: 'tabular-nums', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.booking_ref as string}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ background: 'rgba(139,26,43,0.2)', border: '1px solid rgba(139,26,43,0.4)', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: '#8B1A2B' }}>{groundName}</span>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: '#fff', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.customer_name as string}</td>
                                        <td className="hide-mobile" style={{ padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{b.customer_phone as string}</td>
                                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{fmtTime(b.start_time as string)} → {fmtTime(b.end_time as string)}</td>
                                        <td className="hide-mobile" style={{ padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: '#fff' }}>PKR {fmt(Number(b.base_price))}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {b.payment_status === 'pending' && b.booking_status === 'confirmed' && (
                                                <button onClick={() => handleMarkPaid(b.booking_ref as string)} style={{
                                                    background: 'transparent', border: '1px solid rgba(0,166,81,0.4)', borderRadius: 2,
                                                    color: '#00a651', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                                                    padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                                                    transition: 'all 0.2s',
                                                }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#00a651'; e.currentTarget.style.color = '#fff'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#00a651'; }}
                                                >MARK PAID</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Mobile responsive styles */}
            <style>{`
                @media (max-width: 768px) {
                    .kpi-grid {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 12px !important;
                    }
                    .kpi-grid > div {
                        padding: 16px !important;
                    }
                    .kpi-value {
                        font-size: 28px !important;
                    }
                }
            `}</style>
        </div>
    );
}

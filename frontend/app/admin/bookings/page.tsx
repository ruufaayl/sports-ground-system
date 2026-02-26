'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminFetch } from '../../../lib/adminApi';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }
function fmtTime(t: string) { if (!t) return ''; const h = parseInt(t.split(':')[0], 10); return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function weekStart() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
    confirmed: { bg: 'rgba(0,166,81,0.15)', border: 'rgba(0,166,81,0.4)', color: '#00a651', label: '● CONFIRMED' },
    pending: { bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.4)', color: '#C9A84C', label: '● PENDING' },
    cancelled: { bg: 'rgba(139,26,43,0.15)', border: 'rgba(139,26,43,0.4)', color: '#8B1A2B', label: '● CANCELLED' },
};

const GROUNDS = ['G1', 'G2', 'G3', 'G4', 'G5'];

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Array<Record<string, unknown>>>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedGrounds, setSelectedGrounds] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [paymentFilter, setPaymentFilter] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadData = useCallback(async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        selectedGrounds.forEach(g => params.append('ground_id', g));
        selectedStatuses.forEach(s => params.append('status', s));
        if (paymentFilter) params.set('payment_status', paymentFilter);
        params.set('page', String(page));
        params.set('limit', '20');

        try {
            const data = await adminFetch<{ bookings: Array<Record<string, unknown>>; total: number; totalPages: number }>(`/api/bookings/all?${params}`);
            setBookings(data.bookings);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch { /* ignore */ }
    }, [search, dateFrom, dateTo, selectedGrounds, selectedStatuses, paymentFilter, page]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSearchInput = (val: string) => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => { setSearch(val); setPage(1); }, 300);
    };

    const toggleGround = (g: string) => {
        setSelectedGrounds(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
        setPage(1);
    };
    const toggleStatus = (s: string) => {
        setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
        setPage(1);
    };

    const setQuickDate = (from: string, to: string) => { setDateFrom(from); setDateTo(to); setPage(1); };

    const handleMarkPaid = async (ref: string) => {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        await fetch(`${base}/api/bookings/${ref}/confirm-payment`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-secret': localStorage.getItem('adminSecret') || '' }, body: JSON.stringify({ paymentMethod: 'cash' }) });
        loadData();
    };

    const handleCancel = async (ref: string) => {
        if (!confirm('Cancel this booking?')) return;
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        await fetch(`${base}/api/bookings/${ref}/cancel`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-secret': localStorage.getItem('adminSecret') || '' } });
        loadData();
    };

    const exportCSV = () => {
        const headers = ['Ref', 'Ground', 'Customer', 'Phone', 'Date', 'Time', 'Duration', 'Total', 'Advance', 'Remaining', 'Status', 'Payment'];
        const rows = bookings.map(b => [
            b.booking_ref, (b.grounds as Record<string, string>)?.name || '', b.customer_name, b.customer_phone,
            b.date, `${fmtTime(b.start_time as string)}-${fmtTime(b.end_time as string)}`, b.duration_hours,
            b.base_price, b.advance_amount, b.remaining_amount, b.booking_status, b.payment_status,
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `bookings-${todayStr()}.csv`; a.click();
    };

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.base_price || 0), 0);

    const pillStyle = (active: boolean) => ({
        background: active ? '#8B1A2B' : 'transparent',
        border: `1px solid ${active ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 2, color: '#fff', fontSize: 11, fontWeight: 600 as const,
        padding: '5px 12px', cursor: 'pointer' as const, fontFamily: 'var(--font-ui)',
        transition: 'all 0.15s',
    });

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: 0 }}>ALL BOOKINGS</h1>
                <span style={{ background: 'rgba(139,26,43,0.2)', border: '1px solid rgba(139,26,43,0.4)', borderRadius: 12, padding: '2px 12px', fontSize: 13, fontWeight: 600, color: '#8B1A2B', fontFamily: 'var(--font-ui)' }}>{total}</span>
            </div>

            {/* Filter Bar */}
            <div style={{ background: '#111218', borderRadius: 4, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    {/* Search */}
                    <input placeholder="Search name, phone, ref..." onChange={(e) => handleSearchInput(e.target.value)} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2,
                        color: '#fff', fontSize: 13, padding: '8px 14px', fontFamily: 'var(--font-ui)', outline: 'none', minWidth: 200,
                    }} />

                    {/* Date range */}
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, color: '#fff', fontSize: 12, padding: '8px 10px', fontFamily: 'var(--font-ui)', outline: 'none', colorScheme: 'dark' }} />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>→</span>
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, color: '#fff', fontSize: 12, padding: '8px 10px', fontFamily: 'var(--font-ui)', outline: 'none', colorScheme: 'dark' }} />

                    {/* Quick dates */}
                    <button onClick={() => setQuickDate(todayStr(), todayStr())} style={pillStyle(dateFrom === todayStr() && dateTo === todayStr())}>TODAY</button>
                    <button onClick={() => setQuickDate(weekStart(), todayStr())} style={pillStyle(dateFrom === weekStart())}>THIS WEEK</button>
                    <button onClick={() => setQuickDate(monthStart(), todayStr())} style={pillStyle(dateFrom === monthStart())}>THIS MONTH</button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>GROUND</span>
                    <button onClick={() => { setSelectedGrounds([]); setPage(1); }} style={pillStyle(selectedGrounds.length === 0)}>ALL</button>
                    {GROUNDS.map(g => <button key={g} onClick={() => toggleGround(g)} style={pillStyle(selectedGrounds.includes(g))}>{g}</button>)}

                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginLeft: 16, marginRight: 4 }}>STATUS</span>
                    <button onClick={() => { setSelectedStatuses([]); setPage(1); }} style={pillStyle(selectedStatuses.length === 0)}>ALL</button>
                    {['confirmed', 'pending', 'cancelled'].map(s => <button key={s} onClick={() => toggleStatus(s)} style={pillStyle(selectedStatuses.includes(s))}>{s.toUpperCase()}</button>)}

                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginLeft: 16, marginRight: 4 }}>PAYMENT</span>
                    <button onClick={() => { setPaymentFilter(''); setPage(1); }} style={pillStyle(!paymentFilter)}>ALL</button>
                    <button onClick={() => { setPaymentFilter('paid'); setPage(1); }} style={pillStyle(paymentFilter === 'paid')}>PAID</button>
                    <button onClick={() => { setPaymentFilter('pending'); setPage(1); }} style={pillStyle(paymentFilter === 'pending')}>UNPAID</button>
                </div>
            </div>

            {/* Results bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Showing {bookings.length} of {total} bookings</span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#C9A84C' }}>Page Revenue: PKR {fmt(totalRevenue)}</span>
                </div>
                <button onClick={exportCSV} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, padding: '6px 16px', cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.1em' }}>EXPORT CSV</button>
            </div>

            {/* Table */}
            <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                        <thead>
                            <tr>
                                {['#', 'REF', 'GROUND', 'CUSTOMER', 'PHONE', 'DATE', 'TIME', 'DUR', 'TOTAL', 'STATUS', 'PAYMENT', 'ACTIONS'].map(h => (
                                    <th key={h} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid rgba(139,26,43,0.3)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.length === 0 && <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)' }}>No bookings found</td></tr>}
                            {bookings.map((b, i) => {
                                const st = STATUS_STYLES[(b.booking_status as string)] || STATUS_STYLES.pending;
                                const gName = (b.grounds as Record<string, string>)?.name || '?';
                                const isExpanded = expandedRow === (b.booking_ref as string);
                                const rowNum = (page - 1) * 20 + i + 1;
                                return (
                                    <><tr key={b.booking_ref as string} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,26,43,0.06)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'; }}
                                    >
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{rowNum}</td>
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>{b.booking_ref as string}</td>
                                        <td style={{ padding: '12px 12px' }}>
                                            <span style={{ background: 'rgba(139,26,43,0.2)', border: '1px solid rgba(139,26,43,0.4)', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#8B1A2B' }}>{gName}</span>
                                        </td>
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: '#fff' }}>{b.customer_name as string}</td>
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{b.customer_phone as string}</td>
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{b.date as string}</td>
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{fmtTime(b.start_time as string)} → {fmtTime(b.end_time as string)}</td>
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{b.duration_hours as number}h</td>
                                        <td style={{ padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>PKR {fmt(Number(b.base_price))}</td>
                                        <td style={{ padding: '12px 12px' }}>
                                            <span style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
                                        </td>
                                        <td style={{ padding: '12px 12px' }}>
                                            <span style={{
                                                background: b.payment_status === 'paid' ? 'rgba(0,166,81,0.15)' : 'rgba(201,168,76,0.15)',
                                                border: `1px solid ${b.payment_status === 'paid' ? 'rgba(0,166,81,0.4)' : 'rgba(201,168,76,0.4)'}`,
                                                borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 600,
                                                color: b.payment_status === 'paid' ? '#00a651' : '#C9A84C',
                                            }}>{(b.payment_status as string).toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '12px 12px' }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => setExpandedRow(isExpanded ? null : b.booking_ref as string)} style={{
                                                    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2,
                                                    color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                                                }}>{isExpanded ? 'CLOSE' : 'VIEW'}</button>
                                                {b.payment_status === 'pending' && b.booking_status === 'confirmed' && (
                                                    <button onClick={() => handleMarkPaid(b.booking_ref as string)} style={{
                                                        background: 'transparent', border: '1px solid rgba(0,166,81,0.4)', borderRadius: 2,
                                                        color: '#00a651', fontSize: 10, fontWeight: 600, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                                                    }}>PAID</button>
                                                )}
                                                {b.booking_status !== 'cancelled' && (
                                                    <button onClick={() => handleCancel(b.booking_ref as string)} style={{
                                                        background: 'transparent', border: '1px solid rgba(139,26,43,0.4)', borderRadius: 2,
                                                        color: '#8B1A2B', fontSize: 10, fontWeight: 600, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                                                    }}>CANCEL</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                        {isExpanded && (
                                            <tr key={`${b.booking_ref}-expanded`}>
                                                <td colSpan={12} style={{ padding: '16px 24px', background: 'rgba(139,26,43,0.04)', borderBottom: '1px solid rgba(139,26,43,0.15)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                                                        <div>
                                                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C', marginBottom: 8 }}>CUSTOMER</div>
                                                            {[['Name', b.customer_name], ['Phone', b.customer_phone], ['Team', b.team_details || '—']].map(([l, v]) => (
                                                                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{l as string}</span>
                                                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff' }}>{v as string}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C', marginBottom: 8 }}>PAYMENT</div>
                                                            {[['Total', `PKR ${fmt(Number(b.base_price))}`], ['Advance', `PKR ${fmt(Number(b.advance_amount))}`], ['Remaining', `PKR ${fmt(Number(b.remaining_amount))}`], ['Method', (b.payment_method as string) || '—']].map(([l, v]) => (
                                                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{l}</span>
                                                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff' }}>{v}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C', marginBottom: 8 }}>TIMESTAMPS</div>
                                                            {[['Created', b.created_at], ['Updated', b.updated_at]].map(([l, v]) => (
                                                                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{l as string}</span>
                                                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff' }}>{v ? new Date(v as string).toLocaleString() : '—'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2,
                        color: page <= 1 ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 12, fontWeight: 600,
                        padding: '6px 14px', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
                    }}>← PREV</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, page - 2);
                        const pg = start + i;
                        if (pg > totalPages) return null;
                        return (
                            <button key={pg} onClick={() => setPage(pg)} style={{
                                width: 32, height: 32, borderRadius: 2,
                                background: pg === page ? '#8B1A2B' : 'transparent',
                                border: `1px solid ${pg === page ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                            }}>{pg}</button>
                        );
                    })}
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2,
                        color: page >= totalPages ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 12, fontWeight: 600,
                        padding: '6px 14px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
                    }}>NEXT →</button>
                </div>
            )}
        </div>
    );
}

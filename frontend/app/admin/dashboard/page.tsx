'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Summary {
    revenueToday: number;
    totalRevenueThisMonth: number;
    bookingsToday: number;
    totalBookingsThisMonth: number;
}

interface Booking {
    booking_ref: string;
    grounds?: { name: string };
    ground_id: string;
    customer_name: string;
    customer_phone: string;
    date: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    base_price: number;
    payment_status: string;
    booking_status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0);

const fmtTime = (t: string) => {
    const [hStr, mStr] = t.substring(0, 5).split(':');
    const h = parseInt(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mStr}${ampm}`;
};

const todayStr = () =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ─── GroundCard (standalone component — hooks at top level) ──────────────────
interface GroundCardProps {
    groundName: string;
    bookedSlots: Booking[];
}

function GroundCard({ groundName, bookedSlots }: GroundCardProps) {
    const [hovered, setHovered] = useState(false);

    const active = bookedSlots.filter(s => s.booking_status !== 'cancelled');
    const isFree = active.length === 0;

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                flex: 1,
                background: '#111827',
                borderRadius: 16,
                padding: 16,
                textAlign: 'center',
                border: `1px solid ${hovered ? 'rgba(0,255,136,0.4)' : 'rgba(0,255,136,0.1)'}`,
                transition: 'border-color 0.2s ease',
                cursor: 'default',
            }}
        >
            <div style={{ fontSize: 26, fontWeight: 800, color: '#00ff88', marginBottom: 10, letterSpacing: '-0.01em' }}>
                {groundName}
            </div>

            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: isFree ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)',
                color: isFree ? '#00ff88' : '#ef4444',
                borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
                border: `1px solid ${isFree ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
                boxShadow: isFree ? '0 0 8px rgba(0,255,136,0.15)' : '0 0 8px rgba(239,68,68,0.15)',
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 8 }}>●</span>
                {isFree ? 'FREE' : 'BOOKED'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {isFree ? (
                    <span style={{ fontSize: 11, color: '#4b5563' }}>No bookings</span>
                ) : (
                    active.map((b, bi) => (
                        <span key={bi} style={{
                            background: 'rgba(239,68,68,0.15)', color: '#f87171',
                            borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600,
                            fontFamily: 'monospace', opacity: 0.9,
                        }}>
                            {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}

// ─── KpiCard (standalone component — hooks at top level) ─────────────────────
interface KpiCardProps {
    label: string;
    value: string;
    subLabel: string;
    icon: string;
    color: string;
    sparkData?: { v: number }[];
    i: number;
}

function KpiCard({ label, value, subLabel, icon, color, sparkData, i }: KpiCardProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: '#111827',
                borderRadius: 16,
                padding: 24,
                border: `1px solid rgba(255,255,255,0.06)`,
                borderTopColor: hovered ? color : color + '99',
                borderTopWidth: 3,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default',
                flex: 1,
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hovered ? `0 12px 40px ${color}33` : '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            }}
        >
            {/* Background gradient tint */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `linear-gradient(135deg, ${color}0d 0%, transparent 60%)`,
            }} />

            <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', margin: 0 }}>
                        {label}
                    </p>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: color + '1a', fontSize: 20,
                    }}>
                        {icon}
                    </div>
                </div>

                <p style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {value}
                </p>

                {sparkData && sparkData.length > 0 && (
                    <div style={{ height: 40, marginTop: 12, marginBottom: 4 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                                <defs>
                                    <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${i})`} dot={false} />
                                <Tooltip
                                    content={({ active, payload }) =>
                                        active && payload?.length ? (
                                            <div style={{ background: '#1a1a2e', border: `1px solid ${color}44`, borderRadius: 8, padding: '4px 8px', fontSize: 11, color: '#fff' }}>
                                                PKR {payload[0].value?.toLocaleString()}
                                            </div>
                                        ) : null
                                    }
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, marginTop: sparkData ? 0 : 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#00ff88' }}>↑</span> {subLabel}
                </p>
            </div>
        </motion.div>
    );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
    const styles: Record<string, { bg: string; color: string; border: string }> = {
        paid: { bg: '#022c22', color: '#00ff88', border: '#00ff88' },
        pending: { bg: '#2d1a00', color: '#f59e0b', border: '#f59e0b' },
        cancelled: { bg: '#2d0000', color: '#ef4444', border: '#ef4444' },
    };
    const cfg = styles[status] ?? { bg: '#1a1a2e', color: '#6b7280', border: '#374151' };
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`,
            borderRadius: 20, padding: '3px 12px',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.05em', display: 'inline-block',
            boxShadow: `0 0 6px ${cfg.border}44`,
        }}>
            {status}
        </span>
    );
}

// ─── AdminDashboard (main page — all hooks at top level only) ─────────────────
const GROUNDS = ['Ground 1', 'Ground 2', 'Ground 3', 'Ground 4', 'Ground 5'];

export default function AdminDashboard() {
    // All hooks at the very top — never inside a loop, condition, or callback
    const [summary, setSummary] = useState<Summary | null>(null);
    const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
    const [weeklyData, setWeeklyData] = useState<{ v: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const secret = localStorage.getItem('adminSecret') || '';
        try {
            const [sumRes, bookRes, weekRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/summary`, { headers: { 'x-admin-secret': secret } }),
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/today`, { headers: { 'x-admin-secret': secret } }),
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/weekly`, { headers: { 'x-admin-secret': secret } }),
            ]);
            if (sumRes.ok) setSummary(await sumRes.json());
            if (bookRes.ok) setTodayBookings((await bookRes.json()).bookings || []);
            if (weekRes.ok) {
                const raw = (await weekRes.json()) as { bookingRevenue: number }[];
                setWeeklyData(raw.map(d => ({ v: d.bookingRevenue })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMarkPaid = async (ref: string) => {
        const secret = localStorage.getItem('adminSecret') || '';
        setActionLoading(ref);
        try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/${ref}/confirm-payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
                body: JSON.stringify({ paymentMethod: 'cash', transactionId: 'CASH-' + Date.now() }),
            });
            fetchData();
        } finally {
            setActionLoading('');
        }
    };

    const handleSendReport = async () => {
        const secret = localStorage.getItem('adminSecret') || '';
        if (!confirm('Send Daily Report to WhatsApp?')) return;
        setActionLoading('report');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/send-daily`, {
                method: 'POST',
                headers: { 'x-admin-secret': secret },
            });
            alert(res.ok ? '✅ Report sent successfully!' : '❌ Failed to send report.');
        } finally {
            setActionLoading('');
        }
    };

    // Build ground→slots map using plain variables (no hooks)
    const groundsMap: Record<string, Booking[]> = {};
    GROUNDS.forEach(g => { groundsMap[g] = []; });
    todayBookings.forEach(b => {
        const n = b.grounds?.name || 'Unknown';
        if (!groundsMap[n]) groundsMap[n] = [];
        groundsMap[n].push(b);
    });

    const kpis = [
        { label: "Today's Revenue", value: fmt(summary?.revenueToday ?? 0), subLabel: 'Live today', icon: '💰', color: '#00ff88', sparkData: undefined },
        { label: 'Month Revenue', value: fmt(summary?.totalRevenueThisMonth ?? 0), subLabel: 'Last 7 days chart', icon: '📈', color: '#0088ff', sparkData: weeklyData },
        { label: "Today's Bookings", value: String(summary?.bookingsToday ?? 0), subLabel: 'Scheduled today', icon: '📋', color: '#8b5cf6', sparkData: undefined },
        { label: 'Month Bookings', value: String(summary?.totalBookingsThisMonth ?? 0), subLabel: 'This month total', icon: '👥', color: '#f59e0b', sparkData: undefined },
    ];

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', color: '#fff' }}>

            <style>{`
                @keyframes pulseLive { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
                @keyframes spin { to{transform:rotate(360deg)} }
            `}</style>

            {/* TOP HEADER */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    height: 64, background: '#0d0d1a',
                    borderBottom: '1px solid rgba(0,255,136,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 32px',
                    margin: '-32px -32px 32px -32px',
                }}
            >
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>
                        Dashboard Overview
                    </h1>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>{todayStr()}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', animation: 'pulseLive 2s ease-in-out infinite' }} />
                        <span style={{ fontSize: 13, color: '#00ff88', fontWeight: 600 }}>Live</span>
                    </div>
                    <button
                        onClick={fetchData}
                        style={{
                            background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
                            borderRadius: 8, padding: '7px 16px', color: '#00ff88',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </motion.div>

            {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88',
                        animation: 'spin 0.7s linear infinite',
                    }} />
                    <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Loading dashboard data...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* KPI CARDS */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        {kpis.map((k, i) => (
                            <KpiCard key={k.label} {...k} i={i} />
                        ))}
                    </div>

                    {/* QUICK ACTIONS */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.35 }}
                        style={{ display: 'flex', gap: 16 }}
                    >
                        <button
                            onClick={handleSendReport}
                            disabled={actionLoading === 'report'}
                            style={{
                                flex: 1, height: 64, borderRadius: 12, border: 'none',
                                background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                                color: '#000', fontSize: 15, fontWeight: 700,
                                cursor: 'pointer', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                opacity: actionLoading === 'report' ? 0.7 : 1,
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget).style.transform = 'scale(1.02)'; }}
                            onMouseLeave={e => { (e.currentTarget).style.transform = 'scale(1)'; }}
                        >
                            <span style={{ fontSize: 20 }}>📊</span>
                            {actionLoading === 'report' ? 'Sending...' : 'Send Daily Report'}
                        </button>
                        <a
                            href="/admin/reports"
                            style={{
                                flex: 1, height: 64, borderRadius: 12,
                                background: 'linear-gradient(135deg, #0088ff, #0066cc)',
                                color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                transition: 'transform 0.15s ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget).style.transform = 'scale(1.02)'; }}
                            onMouseLeave={e => { (e.currentTarget).style.transform = 'scale(1)'; }}
                        >
                            <span style={{ fontSize: 20 }}>📈</span>
                            View Weekly Report
                        </a>
                        <a
                            href="/admin/tuckshop"
                            style={{
                                flex: 1, height: 64, borderRadius: 12,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                transition: 'transform 0.15s ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget).style.transform = 'scale(1.02)'; }}
                            onMouseLeave={e => { (e.currentTarget).style.transform = 'scale(1)'; }}
                        >
                            <span style={{ fontSize: 20 }}>➕</span>
                            Add Tuck Shop Sale
                        </a>
                    </motion.div>

                    {/* GROUND AVAILABILITY */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.35 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88', animation: 'pulseLive 2s ease-in-out infinite' }} />
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Ground Availability</h2>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }}>
                                Today
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {GROUNDS.map(g => (
                                <GroundCard
                                    key={g}
                                    groundName={g.replace('Ground ', 'G')}
                                    bookedSlots={groundsMap[g] || []}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* TODAY'S BOOKINGS TABLE */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.35 }}
                        style={{ background: '#111827', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}
                    >
                        <div style={{
                            padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
                            borderBottom: '2px solid rgba(0,255,136,0.15)',
                        }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Today's Bookings</h2>
                            <span style={{
                                background: '#1a1a2e', color: '#9ca3af', borderRadius: 20,
                                padding: '2px 12px', fontSize: 12, fontWeight: 600,
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                {todayBookings.length}
                            </span>
                        </div>

                        {todayBookings.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                                <div style={{ fontSize: 64, marginBottom: 16 }}>📅</div>
                                <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>No bookings today</p>
                                <p style={{ fontSize: 13, color: '#4b5563', margin: '8px 0 0' }}>New bookings will appear here in real-time.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr style={{ background: '#0d0d1a' }}>
                                            {['Ref', 'Ground', 'Customer', 'Phone', 'Time', 'Dur.', 'Amount', 'Status', 'Action'].map(h => (
                                                <th key={h} style={{
                                                    padding: '0 16px', height: 44, textAlign: 'left',
                                                    fontSize: 11, fontWeight: 700, color: '#4b5563',
                                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {todayBookings.map((b, ri) => {
                                                const isPaid = b.payment_status === 'paid';
                                                const isCancelled = b.booking_status === 'cancelled';
                                                const rowBg = ri % 2 === 0 ? '#111827' : '#0d0d1a';
                                                return (
                                                    <motion.tr
                                                        key={b.booking_ref}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: isCancelled ? 0.45 : 1, x: 0 }}
                                                        transition={{ delay: ri * 0.04, duration: 0.25 }}
                                                        style={{ background: rowBg }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,136,0.03)'; }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
                                                    >
                                                        <td style={{ padding: '0 16px', height: 56, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#00ff88', whiteSpace: 'nowrap' }}>
                                                            {b.booking_ref}
                                                        </td>
                                                        <td style={{ padding: '0 16px', fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                                                            {b.grounds?.name || b.ground_id}
                                                        </td>
                                                        <td style={{ padding: '0 16px', fontSize: 14, color: '#d1d5db', whiteSpace: 'nowrap' }}>
                                                            {b.customer_name}
                                                        </td>
                                                        <td style={{ padding: '0 16px', fontSize: 13, color: '#6b7280', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                            {b.customer_phone}
                                                        </td>
                                                        <td style={{ padding: '0 16px', fontSize: 13, color: '#d1d5db', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                            {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
                                                        </td>
                                                        <td style={{ padding: '0 16px', fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                                            {b.duration_hours}h
                                                        </td>
                                                        <td style={{ padding: '0 16px', fontSize: 14, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                            {fmt(b.base_price)}
                                                        </td>
                                                        <td style={{ padding: '0 16px', whiteSpace: 'nowrap' }}>
                                                            <StatusPill status={isCancelled ? 'cancelled' : isPaid ? 'paid' : 'pending'} />
                                                        </td>
                                                        <td style={{ padding: '0 16px', whiteSpace: 'nowrap' }}>
                                                            {!isPaid && !isCancelled && (
                                                                <button
                                                                    onClick={() => handleMarkPaid(b.booking_ref)}
                                                                    disabled={actionLoading === b.booking_ref}
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: '1px solid #f59e0b',
                                                                        color: '#f59e0b',
                                                                        borderRadius: 8, padding: '5px 12px',
                                                                        fontSize: 12, fontWeight: 700,
                                                                        cursor: 'pointer', fontFamily: 'inherit',
                                                                        transition: 'background 0.15s ease, color 0.15s ease',
                                                                        opacity: actionLoading === b.booking_ref ? 0.5 : 1,
                                                                    }}
                                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f59e0b'; (e.currentTarget as HTMLElement).style.color = '#000'; }}
                                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                                                                >
                                                                    {actionLoading === b.booking_ref ? '...' : 'Mark Paid'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>

                </div>
            )}
        </div>
    );
}

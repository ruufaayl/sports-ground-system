'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RT, ResponsiveContainer } from 'recharts';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const dayLabel = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
const pct = (p: number, t: number) => (t ? Math.round((p / t) * 100) : 0);

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ flex: 1, background: '#0d0d1a', borderRadius: 12, padding: '20px 24px', border: `1px solid ${color}22`, textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>{label}</p>
            <p style={{ fontSize: 32, fontWeight: 800, color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        </div>
    );
}

export default function AdminReports() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState<any>(null);
    const [weekly, setWeekly] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const load = useCallback(async (d: string) => {
        if (!d) return;
        setLoading(true);
        const s = localStorage.getItem('adminSecret') || '';
        try {
            const [dr, wr] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/daily/${d}`, { headers: { 'x-admin-secret': s } }),
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/weekly`, { headers: { 'x-admin-secret': s } }),
            ]);
            setReport(dr.ok ? await dr.json() : null);
            if (wr.ok) {
                const r = (await wr.json()) as any[];
                setWeekly(r.reverse().map(x => ({ day: dayLabel(x.date), bookings: x.bookingRevenue, tuck: x.tuckRevenue })));
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(date); }, [date, load]);

    const send = async () => {
        if (!confirm('Send daily report to WhatsApp?')) return;
        setSending(true);
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/send-daily`, {
                method: 'POST', headers: { 'x-admin-secret': localStorage.getItem('adminSecret') || '' },
            });
            alert(r.ok ? '✅ Report sent!' : '❌ Failed.');
        } finally { setSending(false); }
    };

    return (
        <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Financial Reports</h1>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Daily breakdowns and weekly trends</p>
            </motion.div>

            {/* Date selector */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ background: '#111827', borderRadius: 16, padding: 20, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: '#9ca3af' }}>Select Date:</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={{ background: '#0d0d1a', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 8, padding: '10px 14px', color: '#fff', height: 44, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                <button onClick={() => load(date)}
                    style={{ height: 44, padding: '0 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00ff88,#00cc6a)', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Generate Report
                </button>
                <button onClick={send} disabled={sending}
                    style={{ height: 44, padding: '0 24px', borderRadius: 8, border: '1px solid rgba(0,255,136,0.4)', background: 'transparent', color: '#00ff88', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1 }}>
                    {sending ? 'Sending...' : '📱 Send to WhatsApp'}
                </button>
            </motion.div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', animation: 'spin 0.7s linear infinite' }} />
                    <span style={{ color: '#6b7280' }}>Generating report...</span>
                </div>
            ) : !report ? (
                <div style={{ background: '#111827', borderRadius: 16, padding: 48, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                    <p style={{ color: '#6b7280', margin: 0 }}>Select a date to view report</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Top stats */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        style={{ background: '#111827', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Report for</p>
                            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{fmtDate(date)}</h2>
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <Stat label="Booking Revenue" value={fmt(report.bookings?.total ?? 0)} color="#00ff88" />
                            <Stat label="Tuck Shop Revenue" value={fmt(report.tuckShop?.total ?? 0)} color="#0088ff" />
                            <div style={{ flex: 1, background: 'linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,136,255,0.08))', borderRadius: 12, padding: '20px 24px', border: '1px solid rgba(0,255,136,0.15)', textAlign: 'center' }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Grand Total</p>
                                <p style={{ fontSize: 36, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#00ff88,#0088ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    {fmt(report.grandTotal ?? 0)}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Breakdown row */}
                    <div style={{ display: 'flex', gap: 20 }}>
                        {/* Payment method */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            style={{ flex: 1, background: '#111827', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payment Split</h3>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1, background: '#0d0d1a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase' }}>Cash</p>
                                    <p style={{ fontSize: 22, fontWeight: 800, color: '#00ff88', margin: 0 }}>{fmt(report.bookings?.cash ?? 0)}</p>
                                </div>
                                <div style={{ flex: 1, background: '#0d0d1a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase' }}>Online</p>
                                    <p style={{ fontSize: 22, fontWeight: 800, color: '#0088ff', margin: 0 }}>{fmt(report.bookings?.online ?? 0)}</p>
                                </div>
                            </div>
                            <div style={{ height: 8, borderRadius: 4, background: '#1a1a2e', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ width: `${pct(report.bookings?.cash ?? 0, report.bookings?.total ?? 1)}%`, background: '#00ff88' }} />
                                <div style={{ flex: 1, background: '#0088ff' }} />
                            </div>
                        </motion.div>

                        {/* Ground breakdown */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            style={{ flex: 1, background: '#111827', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Revenue by Ground</h3>
                            {Object.keys(report.bookings?.byGround ?? {}).length === 0 ? (
                                <p style={{ color: '#4b5563', fontSize: 13 }}>No paid bookings on this date.</p>
                            ) : (
                                Object.entries(report.bookings?.byGround ?? {}).map(([n, a]: any) => (
                                    <div key={n} style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, color: '#d1d5db' }}>{n}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#00ff88' }}>{fmt(a)}</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 4, background: '#1a1a2e' }}>
                                            <div style={{ width: `${pct(a, report.bookings?.total ?? 1)}%`, height: '100%', background: '#00ff88', borderRadius: 4 }} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    </div>

                    {/* Weekly chart */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        style={{ background: '#111827', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 24px' }}>Last 7 Days Revenue</h3>
                        {weekly.length === 0 ? (
                            <p style={{ color: '#4b5563', textAlign: 'center', padding: 40 }}>No weekly data.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={weekly} barGap={4}>
                                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                    <RT cursor={{ fill: 'rgba(0,255,136,0.05)' }} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [fmt(v), '']} />
                                    <Bar dataKey="bookings" name="Bookings" fill="#00ff88" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="tuck" name="Tuck Shop" fill="#0088ff" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}

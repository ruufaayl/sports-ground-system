'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../../lib/adminApi';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

type Tab = 'daily' | 'weekly' | 'monthly';

interface DailyReport {
    date: string;
    bookings: { total: number; cash: number; online: number; byGround: Record<string, number> };
    tuckShop: { total: number; cash: number; online: number };
    grandTotal: number;
}

interface WeeklyDay {
    date: string;
    bookingRevenue: number;
    tuckRevenue: number;
    total: number;
}

interface MonthlyReport {
    month: string;
    totalRevenue: number;
    totalBookings: number;
    byGround: Record<string, { bookings: number; revenue: number; hours: number }>;
    topGround: string;
    peakHours: Record<string, number>;
}

export default function ReportsPage() {
    const [tab, setTab] = useState<Tab>('daily');
    const [dailyDate, setDailyDate] = useState(todayStr());
    const [daily, setDaily] = useState<DailyReport | null>(null);
    const [weekly, setWeekly] = useState<WeeklyDay[]>([]);
    const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
    const [sending, setSending] = useState(false);

    const loadDaily = useCallback(async () => {
        try { const d = await adminFetch<DailyReport>(`/api/reports/daily/${dailyDate}`); setDaily(d); } catch { /* ignore */ }
    }, [dailyDate]);

    const loadWeekly = useCallback(async () => {
        try { const d = await adminFetch<WeeklyDay[]>('/api/reports/weekly'); setWeekly(d); } catch { /* ignore */ }
    }, []);

    const loadMonthly = useCallback(async () => {
        try { const d = await adminFetch<MonthlyReport>('/api/reports/monthly'); setMonthly(d); } catch { /* ignore */ }
    }, []);

    useEffect(() => { if (tab === 'daily') loadDaily(); }, [tab, loadDaily]);
    useEffect(() => { if (tab === 'weekly') loadWeekly(); }, [tab, loadWeekly]);
    useEffect(() => { if (tab === 'monthly') loadMonthly(); }, [tab, loadMonthly]);

    const handleSendWhatsApp = async () => {
        setSending(true);
        try { await adminFetch('/api/reports/send-daily', { method: 'POST' }); alert('Report sent to WhatsApp!'); }
        catch { alert('Failed to send'); }
        finally { setSending(false); }
    };

    const maxWeeklyValue = Math.max(...weekly.map(w => w.total), 1);
    const maxPeakHour = monthly ? Math.max(...Object.values(monthly.peakHours), 1) : 1;

    return (
        <div>
            <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: '0 0 24px' }}>REPORTS</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['daily', 'weekly', 'monthly'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        background: tab === t ? '#8B1A2B' : 'transparent',
                        border: `1px solid ${tab === t ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: 2, color: '#fff', fontSize: 13, fontWeight: 600,
                        padding: '10px 24px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>{t}</button>
                ))}
            </div>

            {/* ═══ DAILY TAB ═══ */}
            {tab === 'daily' && (
                <div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
                        <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{
                            background: '#111218', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 2, color: '#fff', fontSize: 13, padding: '8px 12px',
                            fontFamily: 'var(--font-ui)', outline: 'none', colorScheme: 'dark',
                        }} />
                        <button onClick={handleSendWhatsApp} disabled={sending} className="btn-futuristic" style={{ fontSize: 11, height: 40, padding: '0 20px' }}>
                            {sending ? 'SENDING...' : 'SEND TO WHATSAPP'}
                        </button>
                    </div>

                    {daily && (
                        <>
                            {/* Revenue Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                                {[
                                    { label: 'BOOKING REVENUE', value: daily.bookings.total, accent: '#8B1A2B' },
                                    { label: 'TUCK SHOP', value: daily.tuckShop.total, accent: '#C9A84C' },
                                    { label: 'GRAND TOTAL', value: daily.grandTotal, accent: '#00a651' },
                                ].map(c => (
                                    <div key={c.label} style={{
                                        background: '#111218', border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: 4, padding: 20, position: 'relative', overflow: 'hidden',
                                    }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
                                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{c.label}</div>
                                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: c.label === 'GRAND TOTAL' ? '#C9A84C' : '#fff' }}>PKR {fmt(c.value)}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Ground Performance */}
                            <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 20, marginBottom: 24 }}>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>GROUND PERFORMANCE</div>
                                {Object.entries(daily.bookings.byGround).map(([ground, revenue]) => {
                                    const pct = daily.bookings.total > 0 ? (revenue / daily.bookings.total) * 100 : 0;
                                    return (
                                        <div key={ground} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#8B1A2B', width: 40 }}>{ground}</span>
                                            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8B1A2B, #C9A84C)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#fff', width: 100, textAlign: 'right' }}>PKR {fmt(revenue)}</span>
                                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 40, textAlign: 'right' }}>{Math.round(pct)}%</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Cash vs Online */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                {[
                                    { label: 'CASH', value: daily.bookings.cash, color: '#8B1A2B', total: daily.bookings.total },
                                    { label: 'ONLINE', value: daily.bookings.online, color: '#C9A84C', total: daily.bookings.total },
                                ].map(c => {
                                    const pct = c.total > 0 ? (c.value / c.total) * 100 : 0;
                                    return (
                                        <div key={c.label} style={{
                                            background: '#111218', border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: 4, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        }}>
                                            <div style={{
                                                width: 120, height: 120, borderRadius: '50%', position: 'relative',
                                                background: `conic-gradient(${c.color} 0deg ${pct * 3.6}deg, rgba(255,255,255,0.06) ${pct * 3.6}deg 360deg)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                                            }}>
                                                <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#111218', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 800, color: c.color }}>{Math.round(pct)}%</div>
                                                </div>
                                            </div>
                                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{c.label}</div>
                                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 700, color: '#fff' }}>PKR {fmt(c.value)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══ WEEKLY TAB ═══ */}
            {tab === 'weekly' && (
                <div>
                    <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 24 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>WEEKLY REVENUE</div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
                            {weekly.map((day) => (
                                <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                                        {fmt(day.total)}
                                    </div>
                                    <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                                        <div style={{
                                            flex: 1,
                                            height: Math.max(4, (day.bookingRevenue / maxWeeklyValue) * 180),
                                            background: 'linear-gradient(to top, #8B1A2B, rgba(139,26,43,0.6))',
                                            borderRadius: '3px 3px 0 0',
                                            transition: 'height 0.5s ease',
                                        }} />
                                        <div style={{
                                            flex: 1,
                                            height: Math.max(4, (day.tuckRevenue / maxWeeklyValue) * 180),
                                            background: 'linear-gradient(to top, #C9A84C, rgba(201,168,76,0.6))',
                                            borderRadius: '3px 3px 0 0',
                                            transition: 'height 0.5s ease',
                                        }} />
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'short' })}
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                                        {day.date.split('-').slice(1).join('/')}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 20, marginTop: 16, justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#8B1A2B' }} />
                                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Bookings</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#C9A84C' }} />
                                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Tuck Shop</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MONTHLY TAB ═══ */}
            {tab === 'monthly' && monthly && (
                <div>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'TOTAL REVENUE', value: `PKR ${fmt(monthly.totalRevenue)}`, accent: '#C9A84C' },
                            { label: 'TOTAL BOOKINGS', value: String(monthly.totalBookings), accent: '#8B1A2B' },
                            { label: 'TOP GROUND', value: monthly.topGround || '—', accent: '#00a651' },
                        ].map(c => (
                            <div key={c.label} style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 20, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{c.label}</div>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 28, fontWeight: 800, color: '#fff' }}>{c.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Ground Breakdown Table */}
                    <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 20, marginBottom: 24 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>GROUND BREAKDOWN</div>
                        {Object.entries(monthly.byGround).map(([ground, data]) => {
                            const pct = monthly.totalRevenue > 0 ? (data.revenue / monthly.totalRevenue) * 100 : 0;
                            return (
                                <div key={ground} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#8B1A2B', width: 60 }}>{ground}</span>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 50, textAlign: 'center' }}>{data.bookings}</span>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 50, textAlign: 'center' }}>{data.hours}h</span>
                                    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8B1A2B, #C9A84C)', borderRadius: 4 }} />
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#fff', width: 100, textAlign: 'right' }}>PKR {fmt(data.revenue)}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Peak Hours Heatmap */}
                    <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 20 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>PEAK HOURS</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {Array.from({ length: 24 }, (_, h) => {
                                const count = monthly.peakHours[String(h)] || 0;
                                const intensity = count / maxPeakHour;
                                return (
                                    <div key={h} title={`${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}: ${count} bookings`} style={{
                                        width: 36, height: 36, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: count > 0 ? `rgba(139,26,43,${0.1 + intensity * 0.7})` : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${count > 0 ? `rgba(139,26,43,${0.2 + intensity * 0.5})` : 'rgba(255,255,255,0.05)'}`,
                                        fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600,
                                        color: count > 0 ? '#fff' : 'rgba(255,255,255,0.25)',
                                    }}>
                                        {h % 12 || 12}{h >= 12 ? 'P' : 'A'}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

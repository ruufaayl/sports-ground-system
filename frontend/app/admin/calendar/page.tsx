'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function pad2(n: number) { return String(n).padStart(2, '0'); }
function currentMonth() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function monthLabel(m: string) {
    const [y, mon] = m.split('-').map(Number);
    const d = new Date(y, mon - 1, 1);
    return d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }).toUpperCase();
}
function shiftMonth(m: string, delta: number) {
    const [y, mon] = m.split('-').map(Number);
    const d = new Date(y, mon - 1 + delta, 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

const GROUND_COLORS: Record<string, string> = {
    G1: '#8B1A2B', G2: '#C9A84C', G3: '#0088ff', G4: '#8b5cf6', G5: '#00a651',
};
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayData {
    count: number;
    bookings: Array<Record<string, unknown>>;
    revenue: number;
}

export default function CalendarPage() {
    const router = useRouter();
    const [month, setMonth] = useState(currentMonth());
    const [calendarData, setCalendarData] = useState<Record<string, DayData>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [tooltip, setTooltip] = useState<{ date: string; data: DayData; x: number; y: number } | null>(null);

    const adminSecret = typeof window !== 'undefined' ? localStorage.getItem('adminSecret') || '' : '';
    const todayDate = `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}-${pad2(new Date().getDate())}`;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${BASE}/api/bookings/calendar?month=${month}`, {
                headers: { 'x-admin-secret': adminSecret },
            });
            const data = await res.json();
            setCalendarData(data.days || {});
        } catch { /* ignore */ }
        setIsLoading(false);
    }, [month, adminSecret]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Build calendar grid
    const [year, mon] = month.split('-').map(Number);
    const firstDay = new Date(year, mon - 1, 1);
    const lastDay = new Date(year, mon, 0).getDate();
    let startDow = firstDay.getDay(); // 0=Sun, 1=Mon
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = Array(startDow).fill(null);

    for (let d = 1; d <= lastDay; d++) {
        currentWeek.push(d);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    // Month summary
    const allDays = Object.values(calendarData);
    const totalBookings = allDays.reduce((s, d) => s + d.count, 0);
    const totalRevenue = allDays.reduce((s, d) => s + d.revenue, 0);
    const bestDay = Object.entries(calendarData).reduce((best, [date, data]) =>
        data.revenue > (best.revenue || 0) ? { date, revenue: data.revenue } : best,
        { date: '', revenue: 0 }
    );
    // Most booked ground
    const groundCounts: Record<string, number> = {};
    for (const d of allDays) {
        for (const b of d.bookings) {
            const gName = (b.grounds as Record<string, string>)?.name || (b.ground_id as string) || '?';
            groundCounts[gName] = (groundCounts[gName] || 0) + 1;
        }
    }
    const topGround = Object.entries(groundCounts).sort((a, b) => b[1] - a[1])[0];

    const fmt = (n: number) => Math.round(n).toLocaleString('en-PK');

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: 0 }}>CALENDAR</h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setMonth(shiftMonth(month, -1))} style={{ background: 'transparent', border: '1px solid rgba(139,26,43,0.4)', borderRadius: 2, color: '#fff', fontSize: 18, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', minWidth: 260, textAlign: 'center' }}>
                        {monthLabel(month)}
                    </div>
                    <button onClick={() => setMonth(shiftMonth(month, 1))} style={{ background: 'transparent', border: '1px solid rgba(139,26,43,0.4)', borderRadius: 2, color: '#fff', fontSize: 18, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
                    <button onClick={() => setMonth(currentMonth())} style={{
                        background: month === currentMonth() ? '#8B1A2B' : 'transparent',
                        border: '1px solid rgba(139,26,43,0.4)', borderRadius: 2,
                        color: '#fff', fontSize: 11, fontWeight: 600, padding: '8px 14px', marginLeft: 8,
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.1em',
                    }}>THIS MONTH</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 24, opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(139,26,43,0.2)' }}>
                    {DAYS_OF_WEEK.map(d => (
                        <div key={d} style={{ padding: '12px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{d}</div>
                    ))}
                </div>

                {/* Weeks */}
                {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                        {week.map((day, di) => {
                            if (day === null) return <div key={di} style={{ minHeight: 110, background: 'rgba(0,0,0,0.1)' }} />;

                            const dateStr = `${month}-${pad2(day)}`;
                            const dayData = calendarData[dateStr] || { count: 0, bookings: [], revenue: 0 };
                            const isToday = dateStr === todayDate;
                            const isPast = dateStr < todayDate;

                            // Ground dots
                            const groundsInDay: Record<string, number> = {};
                            for (const b of dayData.bookings) {
                                const gName = (b.grounds as Record<string, string>)?.name || (b.ground_id as string) || '?';
                                groundsInDay[gName] = (groundsInDay[gName] || 0) + 1;
                            }

                            return (
                                <div
                                    key={di}
                                    onClick={() => router.push(`/admin/availability?date=${dateStr}`)}
                                    onMouseEnter={e => { if (dayData.count > 0) setTooltip({ date: dateStr, data: dayData, x: e.clientX, y: e.clientY }); }}
                                    onMouseLeave={() => setTooltip(null)}
                                    style={{
                                        minHeight: 110, padding: 12, cursor: 'pointer',
                                        borderRight: di < 6 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                        opacity: isPast && !isToday ? 0.6 : 1,
                                        transition: 'all 0.15s',
                                        position: 'relative',
                                    }}
                                    onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,26,43,0.06)'; }}
                                    onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                >
                                    {/* Date number */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{
                                            fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700,
                                            color: isToday ? '#fff' : 'rgba(255,255,255,0.7)',
                                            background: isToday ? '#8B1A2B' : 'transparent',
                                            borderRadius: '50%', width: isToday ? 30 : 'auto', height: isToday ? 30 : 'auto',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>{day}</span>
                                    </div>

                                    {/* Booking count */}
                                    {dayData.count > 0 && (
                                        <>
                                            <div style={{
                                                background: 'rgba(139,26,43,0.2)', border: '1px solid rgba(139,26,43,0.4)',
                                                borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                                                color: '#8B1A2B', fontFamily: 'var(--font-ui)', display: 'inline-block', marginBottom: 4,
                                            }}>{dayData.count} booking{dayData.count > 1 ? 's' : ''}</div>

                                            {/* Ground dots */}
                                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
                                                {Object.entries(groundsInDay).map(([g, count]) => (
                                                    Array.from({ length: Math.min(count, 4) }).map((_, ci) => (
                                                        <div key={`${g}-${ci}`} style={{
                                                            width: 6, height: 6, borderRadius: '50%',
                                                            background: GROUND_COLORS[g] || '#8B1A2B',
                                                        }} />
                                                    ))
                                                ))}
                                            </div>

                                            {/* Revenue */}
                                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#C9A84C', fontWeight: 500 }}>
                                                PKR {fmt(dayData.revenue)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Month Summary Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {[
                    { label: 'TOTAL BOOKINGS', value: String(totalBookings), accent: '#8B1A2B' },
                    { label: 'TOTAL REVENUE', value: `PKR ${fmt(totalRevenue)}`, accent: '#C9A84C' },
                    { label: 'BEST DAY', value: bestDay.date ? `${bestDay.date.split('-')[2]}th — PKR ${fmt(bestDay.revenue)}` : '—', accent: '#00a651' },
                    { label: 'TOP GROUND', value: topGround ? `${topGround[0]} (${topGround[1]})` : '—', accent: '#8b5cf6' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 16, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{c.label}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 700, color: '#fff' }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'fixed', left: Math.min(tooltip.x + 16, window.innerWidth - 280), top: tooltip.y - 10,
                    background: '#111218', border: '1px solid #C9A84C',
                    borderRadius: 4, padding: 16, zIndex: 100, minWidth: 240, maxWidth: 300,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none',
                }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: '#C9A84C', marginBottom: 8 }}>{tooltip.date}</div>
                    {tooltip.data.bookings.slice(0, 5).map((b, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{b.customer_name as string}</span>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{(b.grounds as Record<string, string>)?.name || b.ground_id as string}</span>
                        </div>
                    ))}
                    {tooltip.data.bookings.length > 5 && (
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>+{tooltip.data.bookings.length - 5} more</div>
                    )}
                </div>
            )}

            {/* Ground legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
                {Object.entries(GROUND_COLORS).map(([g, color]) => (
                    <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{g}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../../lib/adminApi';

function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtHour(h: number) { return `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`; }
function getMonday(d: Date) { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)); }
function dateStr(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function shortDay(d: Date) { return d.toLocaleDateString('en-PK', { weekday: 'short' }); }
function shortDate(d: Date) { return `${d.getDate()} ${d.toLocaleDateString('en-PK', { month: 'short' })}`; }

const GROUNDS = ['G1', 'G2', 'G3', 'G4', 'G5'];
const HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
const CELL_H = 60;

interface Booking {
    booking_ref: string;
    ground_id: string;
    date: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    customer_name: string;
    customer_phone: string;
    base_price: number;
    booking_status: string;
    grounds?: { name: string };
}

export default function CalendarPage() {
    const [weekStart, setWeekStart] = useState(() => dateStr(getMonday(new Date())));
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [tooltip, setTooltip] = useState<{ booking: Booking; x: number; y: number } | null>(null);

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart + 'T00:00:00');
        d.setDate(d.getDate() + i);
        return d;
    });

    const loadData = useCallback(async () => {
        try {
            const data = await adminFetch<{ bookings: Booking[] }>(`/api/bookings/calendar?week_start=${weekStart}`);
            setBookings(data.bookings);
        } catch { /* ignore */ }
    }, [weekStart]);

    useEffect(() => { loadData(); }, [loadData]);

    const prevWeek = () => {
        const d = new Date(weekStart + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        setWeekStart(dateStr(d));
    };
    const nextWeek = () => {
        const d = new Date(weekStart + 'T00:00:00');
        d.setDate(d.getDate() + 7);
        setWeekStart(dateStr(d));
    };
    const thisWeek = () => setWeekStart(dateStr(getMonday(new Date())));

    // Current time position
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayDate = dateStr(now);
    const isThisWeek = weekDates.some(d => dateStr(d) === todayDate);

    // Find position of current time in our HOURS array
    const hourIndex = HOURS.indexOf(currentHour);
    const timeLineTop = hourIndex >= 0 ? hourIndex * CELL_H + (currentMinute / 60) * CELL_H : -1;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: 0 }}>CALENDAR</h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={prevWeek} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: '#fff', fontSize: 16, padding: '6px 12px', cursor: 'pointer' }}>←</button>
                    <button onClick={thisWeek} style={{
                        background: isThisWeek ? '#8B1A2B' : 'transparent',
                        border: '1px solid rgba(139,26,43,0.4)', borderRadius: 2,
                        color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 16px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.1em',
                    }}>THIS WEEK</button>
                    <button onClick={nextWeek} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: '#fff', fontSize: 16, padding: '6px 12px', cursor: 'pointer' }}>→</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', borderBottom: '1px solid rgba(139,26,43,0.2)' }}>
                    <div style={{ padding: '12px 8px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textAlign: 'center' }}>TIME</div>
                    {GROUNDS.map(g => (
                        <div key={g} style={{ padding: '12px 8px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: '#8B1A2B', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>{g}</div>
                    ))}
                </div>

                {/* Time rows */}
                <div style={{ position: 'relative', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                    {/* Current time line */}
                    {isThisWeek && timeLineTop >= 0 && (
                        <div style={{ position: 'absolute', top: timeLineTop, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', marginLeft: 2, animation: 'pulse-dot 2s infinite' }} />
                            <div style={{ flex: 1, height: 2, background: '#ef4444', opacity: 0.6 }} />
                        </div>
                    )}

                    {HOURS.map((h) => (
                        <div key={h} style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', height: CELL_H, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{fmtHour(h)}</div>
                            {GROUNDS.map(g => {
                                // Find booking for this ground on today's selected week for this hour
                                // We show bookings for the first matching day in the week
                                const booking = bookings.find(b => {
                                    const bStart = parseInt(b.start_time.split(':')[0], 10);
                                    const bEnd = parseInt(b.end_time.split(':')[0], 10);
                                    return b.ground_id === g && h >= bStart && h < bEnd;
                                });
                                const isStart = booking && parseInt(booking.start_time.split(':')[0], 10) === h;

                                return (
                                    <div key={g} style={{
                                        borderLeft: '1px solid rgba(255,255,255,0.04)', position: 'relative',
                                        background: booking ? 'transparent' : 'rgba(0,166,81,0.02)',
                                        cursor: booking ? 'default' : 'pointer',
                                    }}
                                        onMouseEnter={(e) => { if (!booking) e.currentTarget.style.background = 'rgba(0,166,81,0.1)'; }}
                                        onMouseLeave={(e) => { if (!booking) e.currentTarget.style.background = 'rgba(0,166,81,0.02)'; }}
                                    >
                                        {isStart && booking && (
                                            <div
                                                onMouseEnter={(e) => setTooltip({ booking, x: e.clientX, y: e.clientY })}
                                                onMouseLeave={() => setTooltip(null)}
                                                style={{
                                                    position: 'absolute', top: 2, left: 2, right: 2,
                                                    height: booking.duration_hours * CELL_H - 4,
                                                    background: 'linear-gradient(135deg, rgba(139,26,43,0.4), rgba(107,20,34,0.3))',
                                                    border: '1px solid rgba(139,26,43,0.5)',
                                                    borderRadius: 3, padding: '4px 6px', overflow: 'hidden',
                                                    zIndex: 5, cursor: 'pointer',
                                                }}
                                            >
                                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.customer_name}</div>
                                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{fmtHour(parseInt(booking.start_time.split(':')[0]))} - {fmtHour(parseInt(booking.end_time.split(':')[0]))}</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'fixed', left: tooltip.x + 16, top: tooltip.y - 10,
                    background: '#111218', border: '1px solid #C9A84C',
                    borderRadius: 4, padding: 16, zIndex: 100, minWidth: 200,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{tooltip.booking.customer_name}</div>
                    {[
                        { l: 'Ref', v: tooltip.booking.booking_ref },
                        { l: 'Date', v: tooltip.booking.date },
                        { l: 'Phone', v: tooltip.booking.customer_phone },
                        { l: 'Duration', v: `${tooltip.booking.duration_hours}hrs` },
                        { l: 'Amount', v: `PKR ${Math.round(tooltip.booking.base_price).toLocaleString()}` },
                    ].map(r => (
                        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#C9A84C' }}>{r.l}</span>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff' }}>{r.v}</span>
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        </div>
    );
}

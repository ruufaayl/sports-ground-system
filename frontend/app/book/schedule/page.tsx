'use client';

import { Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { checkAvailability } from '../../../lib/api';
import { StepIndicator } from '../page';

const DURATIONS = [1, 1.5, 2, 2.5, 3, 4, 5];

function addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function genDays(count = 14) {
    const days: { label: string; day: string; num: string; month: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MON_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < count; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push({
            label: d.toISOString().split('T')[0],
            day: DAY_NAMES[d.getDay()],
            num: String(d.getDate()).padStart(2, '0'),
            month: MON_NAMES[d.getMonth()],
        });
    }
    return days;
}

function timeOptions() {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++)
        for (const m of [0, 30])
            opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    return opts;
}

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }

type PriceResult = {
    duration: number;
    pricePerHour: number;
    basePrice: number;
    advanceAmount: number;
    remainingAmount: number;
    dayType: string;
    slotType: string;
};

// ─── Inner component ────────────────────────────────────────────────────
function ScheduleInner() {
    const router = useRouter();

    // Read selected ground from localStorage; redirect if missing
    const [groundId, setGroundId] = useState('');
    const [groundName, setGroundName] = useState('');
    useEffect(() => {
        const raw = localStorage.getItem('selectedGround');
        if (!raw) { router.push('/book'); return; }
        const g = JSON.parse(raw);
        setGroundId(g.id);
        setGroundName(g.name);
    }, [router]);

    const days = genDays(14);
    const times = timeOptions();

    const [selectedDate, setSelectedDate] = useState(days[0].label);
    const [startTime, setStartTime] = useState('18:00');
    const [duration, setDuration] = useState(1);

    // Display‑only — derived from state, not stored as state itself
    const endTime = addMinutes(startTime, Math.round(duration * 60));

    const [checking, setChecking] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const [price, setPrice] = useState<PriceResult | null>(null);
    const [checkError, setCheckError] = useState('');

    // ─── Auto-check: fires 500 ms after any input changes ──────────────
    useEffect(() => {
        // Don't check until we have a real UUID from localStorage
        if (!groundId || !selectedDate) return;

        setAvailable(null);
        setPrice(null);
        setCheckError('');

        // Compute inside the effect — no stale closure issues
        const et = addMinutes(startTime, Math.round(duration * 60));

        const timer = setTimeout(async () => {
            setChecking(true);
            try {
                const res = await checkAvailability(groundId, selectedDate, startTime, et);
                setAvailable(res.available);
                setPrice(res.available ? res.price : null);

                if (res.available && res.price) {
                    localStorage.setItem('bookingPrice', JSON.stringify(res.price));
                }
            } catch (err: unknown) {
                setAvailable(null);
                setPrice(null);
                setCheckError(err instanceof Error ? err.message : 'Could not reach the server');
            } finally {
                setChecking(false);
            }
        }, 500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, startTime, duration, groundId]);

    const canContinue = available === true && !checking;

    const handleContinue = () => {
        if (!canContinue || !price) return;
        const data = {
            groundId, groundName, date: selectedDate,
            startTime, endTime, duration,
            pricePerHour: price.pricePerHour,
            basePrice: price.basePrice,
            advanceAmount: price.advanceAmount,
            remainingAmount: price.remainingAmount,
            dayType: price.dayType,
            slotType: price.slotType,
        };
        localStorage.setItem('bookingProgress', JSON.stringify(data));
        router.push('/book/details');
    };

    // ─── Status badge helpers ──────────────────────────────────────────
    const statusColor = checking
        ? '#888'
        : available === true ? '#00ff88'
            : available === false ? '#ff5050'
                : '#888';

    const statusText = checking
        ? 'Checking availability...'
        : available === true ? '✓ Available'
            : available === false ? '✗ This slot is already booked'
                : checkError || 'Waiting for selection…';

    const cardBorder = available === true
        ? 'rgba(0,255,136,0.4)'
        : available === false
            ? 'rgba(255,80,80,0.35)'
            : 'rgba(0,255,136,0.15)';

    return (
        <main style={{ background: '#0a0a0f', minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <StepIndicator current={2} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ textAlign: 'center', marginBottom: 36 }}>
                        <div style={{ display: 'inline-block', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 999, padding: '6px 20px', marginBottom: 12 }}>
                            <span style={{ color: '#00ff88', fontWeight: 700 }}>{groundName || '…'}</span>
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>Select Date &amp; Time</h1>
                    </div>

                    {/* ── Date picker ──────────────────────────────── */}
                    <div style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
                        <div style={{ fontSize: 13, color: '#666', letterSpacing: '1px', marginBottom: 16 }}>SELECT DATE</div>
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                            {days.map((d) => {
                                const isSelected = d.label === selectedDate;
                                return (
                                    <button
                                        key={d.label}
                                        onClick={() => setSelectedDate(d.label)}
                                        style={{
                                            minWidth: 64, padding: '12px 8px', borderRadius: 10, border: 'none',
                                            background: isSelected ? '#00ff88' : 'rgba(255,255,255,0.04)',
                                            color: isSelected ? '#000' : '#fff',
                                            cursor: 'pointer', textAlign: 'center',
                                            fontWeight: isSelected ? 700 : 400,
                                            boxShadow: isSelected ? '0 0 16px rgba(0,255,136,0.4)' : 'none',
                                            transition: 'all 0.2s', flexShrink: 0,
                                        }}
                                    >
                                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{d.day}</div>
                                        <div style={{ fontSize: 20, fontWeight: 700 }}>{d.num}</div>
                                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{d.month}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Time & Duration ───────────────────────────── */}
                    <div style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                            <div>
                                <div style={{ fontSize: 13, color: '#666', letterSpacing: '1px', marginBottom: 10 }}>START TIME</div>
                                <select
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="neon-input"
                                    style={{ cursor: 'pointer' }}
                                >
                                    {times.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: '#666', letterSpacing: '1px', marginBottom: 10 }}>END TIME (auto)</div>
                                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 8, padding: '12px 16px', color: '#00ff88', fontWeight: 700, fontSize: 18 }}>
                                    {endTime}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: 13, color: '#666', letterSpacing: '1px', marginBottom: 12 }}>DURATION</div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {DURATIONS.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDuration(d)}
                                        style={{
                                            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                            background: duration === d ? '#00ff88' : 'rgba(255,255,255,0.06)',
                                            color: duration === d ? '#000' : '#aaa',
                                            fontWeight: duration === d ? 700 : 400,
                                            fontSize: 14, transition: 'all 0.2s',
                                            boxShadow: duration === d ? '0 0 12px rgba(0,255,136,0.3)' : 'none',
                                        }}
                                    >
                                        {d}hr
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Availability & price panel ────────────────── */}
                    <div style={{
                        background: '#1a1a2e',
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 12, padding: '20px', marginBottom: 28,
                        transition: 'border-color 0.3s ease',
                    }}>
                        {/* Status badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ fontSize: 13, color: '#666', letterSpacing: '1px' }}>AVAILABILITY &amp; PRICE</div>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: available === true ? 'rgba(0,255,136,0.1)'
                                    : available === false ? 'rgba(255,80,80,0.1)'
                                        : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${cardBorder}`,
                                borderRadius: 999, padding: '5px 14px',
                                fontSize: 13, fontWeight: 600, color: statusColor,
                                transition: 'all 0.3s ease',
                            }}>
                                {checking && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                        <circle cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                                    </svg>
                                )}
                                {statusText}
                            </div>
                        </div>

                        {/* Loading shimmer */}
                        {checking && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} style={{ height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
                                ))}
                            </div>
                        )}

                        {/* Price breakdown */}
                        {!checking && available === true && price && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                    {[
                                        { label: 'Duration', value: `${price.duration} hours`, highlight: false },
                                        { label: 'Price/hr', value: `PKR ${fmt(price.pricePerHour)}`, highlight: false },
                                        { label: 'Total', value: `PKR ${fmt(price.basePrice)}`, highlight: false },
                                        { label: 'Advance (30%)', value: `PKR ${fmt(price.advanceAmount)}`, highlight: true },
                                    ].map(({ label, value, highlight }) => (
                                        <div key={label} style={{ padding: '12px', borderBottom: '1px solid rgba(0,255,136,0.06)' }}>
                                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
                                            <div style={{ fontSize: 17, fontWeight: 700, color: highlight ? '#00ff88' : '#fff' }}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
                                    <span style={{ color: '#888', fontSize: 13 }}>At ground (70%)</span>
                                    <span style={{ color: '#aaa', fontWeight: 600, fontSize: 14 }}>PKR {fmt(price.remainingAmount)}</span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(0,255,136,0.08)', paddingTop: 10, paddingLeft: 12, color: '#555', fontSize: 12 }}>
                                    {price.dayType} · {price.slotType} pricing
                                </div>
                            </motion.div>
                        )}

                        {/* Slot taken */}
                        {!checking && available === false && (
                            <div style={{ color: '#ff6680', fontSize: 14 }}>
                                This slot is taken. Please choose a different date or time.
                            </div>
                        )}

                        {/* Error */}
                        {!checking && checkError && available === null && (
                            <div style={{ color: '#ff8844', fontSize: 14 }}>{checkError}</div>
                        )}

                        {/* Idle */}
                        {!checking && available === null && !checkError && (
                            <div style={{ color: '#444', fontSize: 14 }}>
                                Select a date, time, and duration above — pricing will appear here automatically.
                            </div>
                        )}
                    </div>

                    <button
                        className="neon-btn"
                        disabled={!canContinue}
                        onClick={handleContinue}
                        style={{ width: '100%', fontSize: 16 }}
                    >
                        CONTINUE →
                    </button>
                </motion.div>
            </div>
        </main>
    );
}

// ─── Exported page ──────────────────────────────────────────────────────
export default function SchedulePage() {
    return (
        <Suspense fallback={
            <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ff88', fontSize: 18 }}>
                Loading...
            </div>
        }>
            <ScheduleInner />
        </Suspense>
    );
}

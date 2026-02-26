'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../../lib/adminApi';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }
function pad2(n: number) { return String(n).padStart(2, '0'); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtHour(h: number) { const ampm = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:00 ${ampm}`; }
function fmtHourShort(h: number) { const ampm = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12} ${ampm}`; }

const GROUNDS = ['G1', 'G2', 'G3', 'G4', 'G5'];
const SLOT_HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

interface SlotData {
    hour: number;
    status: 'free' | 'booked';
    booking: Record<string, unknown> | null;
}

interface ModalState {
    open: boolean;
    ground: string;
    date: string;
    hour: number;
}

export default function AvailabilityPage() {
    const [date, setDate] = useState(todayStr());
    const [activeGround, setActiveGround] = useState('G1');
    const [slots, setSlots] = useState<SlotData[]>([]);
    const [groundCounts, setGroundCounts] = useState<Record<string, number>>({});
    const [modal, setModal] = useState<ModalState>({ open: false, ground: 'G1', date: todayStr(), hour: 18 });
    const [tooltip, setTooltip] = useState<{ slot: SlotData; x: number; y: number } | null>(null);

    // Modal form state
    const [duration, setDuration] = useState(1);
    const [custName, setCustName] = useState('');
    const [custPhone, setCustPhone] = useState('');
    const [teamName, setTeamName] = useState('');
    const [numPlayers, setNumPlayers] = useState('');
    const [paymentType, setPaymentType] = useState<'advance' | 'full' | 'pending'>('advance');
    const [submitting, setSubmitting] = useState(false);
    const [priceInfo, setPriceInfo] = useState<{ basePrice: number; advanceAmount: number; remainingAmount: number } | null>(null);
    const [availCheck, setAvailCheck] = useState<{ available: boolean; maxHours?: number } | null>(null);

    const loadSlots = useCallback(async () => {
        try {
            const data = await adminFetch<{ slots: SlotData[] }>(`/api/bookings/slot-status?ground_id=${activeGround}&date=${date}`);
            setSlots(data.slots);
        } catch { /* ignore */ }
    }, [activeGround, date]);

    const loadCounts = useCallback(async () => {
        try {
            const counts: Record<string, number> = {};
            await Promise.all(GROUNDS.map(async (g) => {
                const data = await adminFetch<{ slots: SlotData[] }>(`/api/bookings/slot-status?ground_id=${g}&date=${date}`);
                counts[g] = data.slots.filter((s) => s.status === 'booked').length;
            }));
            setGroundCounts(counts);
        } catch { /* ignore */ }
    }, [date]);

    useEffect(() => { loadSlots(); }, [loadSlots]);
    useEffect(() => { loadCounts(); }, [loadCounts]);

    // Auto-refresh
    useEffect(() => {
        const id = setInterval(() => { loadSlots(); loadCounts(); }, 60000);
        return () => clearInterval(id);
    }, [loadSlots, loadCounts]);

    // Check availability when modal opens / duration changes
    useEffect(() => {
        if (!modal.open) return;
        const endHour = (modal.hour + duration) % 24;
        const startTime = `${pad2(modal.hour)}:00:00`;
        const endTime = `${pad2(endHour)}:00:00`;
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        fetch(`${base}/api/availability/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groundId: modal.ground, date: modal.date, startTime, endTime }),
        }).then(r => r.json()).then(d => {
            setAvailCheck({ available: d.available });
            if (d.price) setPriceInfo({ basePrice: d.price.basePrice, advanceAmount: d.price.advanceAmount, remainingAmount: d.price.remainingAmount });
        }).catch(() => { });
    }, [modal.open, modal.ground, modal.date, modal.hour, duration]);

    const openModal = (hour: number) => {
        setModal({ open: true, ground: activeGround, date, hour });
        setDuration(1);
        setCustName('');
        setCustPhone('');
        setTeamName('');
        setNumPlayers('');
        setPaymentType('advance');
        setPriceInfo(null);
        setAvailCheck(null);
    };

    const handleBooking = async () => {
        if (!custName || !custPhone) { alert('Name and phone are required'); return; }
        setSubmitting(true);
        try {
            const endHour = (modal.hour + duration) % 24;
            const startTime = `${pad2(modal.hour)}:00:00`;
            const endTime = `${pad2(endHour)}:00:00`;
            const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

            // Create booking
            const bookRes = await fetch(`${base}/api/bookings/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groundId: modal.ground, date: modal.date, startTime, endTime, customerName: custName, customerPhone: custPhone, teamDetails: teamName || undefined }),
            });
            const bookData = await bookRes.json();
            if (!bookRes.ok) { alert(bookData.error || 'Booking failed'); return; }

            // If full payment, mark as paid
            if (paymentType === 'full') {
                await fetch(`${base}/api/bookings/${bookData.booking.booking_ref}/confirm-payment`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-admin-secret': localStorage.getItem('adminSecret') || '' },
                    body: JSON.stringify({ paymentMethod: 'cash' }),
                });
            } else if (paymentType === 'advance') {
                await fetch(`${base}/api/bookings/${bookData.booking.booking_ref}/confirm-payment`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-admin-secret': localStorage.getItem('adminSecret') || '' },
                    body: JSON.stringify({ paymentMethod: 'online' }),
                });
            }

            setModal({ ...modal, open: false });
            loadSlots();
            loadCounts();
            alert(`Booking confirmed for ${custName}`);
        } catch { alert('Booking failed'); }
        finally { setSubmitting(false); }
    };

    const bookedSlots = slots.filter(s => SLOT_HOURS.includes(s.hour) && s.status === 'booked').length;
    const freeSlots = SLOT_HOURS.length - bookedSlots;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: 0 }}>LIVE AVAILABILITY</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => setDate(todayStr())} style={{
                        background: date === todayStr() ? '#8B1A2B' : 'transparent',
                        border: '1px solid rgba(139,26,43,0.4)', borderRadius: 2,
                        color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 16px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.1em',
                    }}>TODAY</button>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{
                        background: '#111218', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2, color: '#fff', fontSize: 13, padding: '8px 12px',
                        fontFamily: 'var(--font-ui)', outline: 'none', colorScheme: 'dark',
                    }} />
                    <button onClick={() => { loadSlots(); loadCounts(); }} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 2, color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600,
                        padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    }}>⟳ REFRESH</button>
                </div>
            </div>

            {/* Ground Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {GROUNDS.map((g) => (
                    <button key={g} onClick={() => setActiveGround(g)} style={{
                        background: activeGround === g ? '#8B1A2B' : 'transparent',
                        border: `1px solid ${activeGround === g ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                        borderBottom: activeGround === g ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 2, color: activeGround === g ? '#fff' : 'rgba(255,255,255,0.6)',
                        fontSize: 14, fontWeight: 600, padding: '10px 20px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)',
                        transition: 'all 0.2s', position: 'relative',
                    }}>
                        {g}
                        <span style={{
                            marginLeft: 8, fontSize: 10, fontWeight: 500,
                            background: 'rgba(139,26,43,0.3)', borderRadius: 8,
                            padding: '2px 6px', color: 'rgba(255,255,255,0.7)',
                        }}>{groundCounts[g] || 0} booked</span>
                    </button>
                ))}
            </div>

            {/* Timeline Bar */}
            <div style={{ background: '#111218', borderRadius: 4, padding: 12, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em' }}>TIMELINE</span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{freeSlots} free  •  {bookedSlots} booked</span>
                </div>
                <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                    {SLOT_HOURS.map((h) => {
                        const slot = slots.find(s => s.hour === h);
                        const booked = slot?.status === 'booked';
                        return <div key={h} style={{ flex: 1, background: booked ? '#8B1A2B' : 'rgba(0,166,81,0.3)', borderRadius: 1 }} title={fmtHour(h)} />;
                    })}
                </div>
            </div>

            {/* Slot Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {SLOT_HOURS.map((h) => {
                    const slot = slots.find(s => s.hour === h);
                    const booked = slot?.status === 'booked';
                    const nextH = (h + 1) % 24;
                    return (
                        <div
                            key={h}
                            onClick={() => !booked && openModal(h)}
                            onMouseEnter={(e) => {
                                if (booked && slot?.booking) setTooltip({ slot, x: e.clientX, y: e.clientY });
                                if (!booked) e.currentTarget.style.borderColor = '#00a651';
                            }}
                            onMouseLeave={(e) => {
                                setTooltip(null);
                                if (!booked) e.currentTarget.style.borderColor = 'rgba(0,166,81,0.25)';
                                else e.currentTarget.style.borderColor = 'rgba(139,26,43,0.35)';
                            }}
                            style={{
                                background: booked ? 'rgba(139,26,43,0.15)' : 'rgba(0,166,81,0.08)',
                                border: `1px solid ${booked ? 'rgba(139,26,43,0.35)' : 'rgba(0,166,81,0.25)'}`,
                                borderRadius: 4, padding: '12px 14px', minHeight: 80,
                                cursor: booked ? 'default' : 'pointer',
                                transition: 'all 0.2s', position: 'relative',
                            }}
                        >
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 700, color: booked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)', marginBottom: 2 }}>{fmtHour(h)}</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>→ {fmtHour(nextH)}</div>
                            {booked && slot?.booking && (
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                                    {slot.booking.customer_name as string}
                                </div>
                            )}
                            <div style={{
                                fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em',
                                color: booked ? '#8B1A2B' : '#00a651', textTransform: 'uppercase',
                            }}>
                                {booked ? 'BOOKED' : 'AVAILABLE'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tooltip */}
            {tooltip && tooltip.slot.booking && (
                <div style={{
                    position: 'fixed', left: tooltip.x + 16, top: tooltip.y - 10,
                    background: '#111218', border: '1px solid #C9A84C',
                    borderRadius: 4, padding: 16, zIndex: 100, minWidth: 220,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }} onMouseEnter={() => setTooltip(null)}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{tooltip.slot.booking.customer_name as string}</div>
                    {[
                        { l: 'Phone', v: tooltip.slot.booking.customer_phone },
                        { l: 'Duration', v: `${tooltip.slot.booking.duration_hours}hrs` },
                        { l: 'Amount', v: `PKR ${fmt(Number(tooltip.slot.booking.base_price))}` },
                        { l: 'Status', v: tooltip.slot.booking.payment_status },
                    ].map((r) => (
                        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#C9A84C' }}>{r.l}</span>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff' }}>{r.v as string}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ MANUAL BOOKING MODAL ═══ */}
            {modal.open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={() => setModal({ ...modal, open: false })}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{
                        background: '#111218', border: '1px solid rgba(139,26,43,0.3)',
                        borderRadius: 4, padding: 40, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto',
                    }}>
                        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: '0 0 8px' }}>NEW BOOKING</h2>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#C9A84C', marginBottom: 24 }}>
                            {modal.ground} • {modal.date} • {fmtHour(modal.hour)} → {fmtHour((modal.hour + duration) % 24)}
                        </p>

                        {/* Duration */}
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>DURATION</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {[1, 2, 3, 4].map((d) => (
                                <button key={d} onClick={() => setDuration(d)} style={{
                                    flex: 1, height: 44, borderRadius: 2,
                                    background: duration === d ? '#8B1A2B' : 'transparent',
                                    border: `1px solid ${duration === d ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700,
                                    cursor: 'pointer',
                                }}>
                                    {d}HR{d > 1 ? 'S' : ''}
                                </button>
                            ))}
                        </div>

                        {availCheck && !availCheck.available && (
                            <div style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 2, padding: '10px 14px', color: '#C9A84C', fontSize: 12, fontFamily: 'var(--font-ui)', marginBottom: 16 }}>
                                ⚠ Slot not available for this duration
                            </div>
                        )}

                        {/* Customer fields */}
                        {[
                            { label: 'CUSTOMER NAME *', value: custName, set: setCustName, type: 'text' },
                            { label: 'WHATSAPP NUMBER *', value: custPhone, set: setCustPhone, type: 'tel' },
                            { label: 'TEAM NAME', value: teamName, set: setTeamName, type: 'text' },
                            { label: 'NUMBER OF PLAYERS', value: numPlayers, set: setNumPlayers, type: 'number' },
                        ].map((f) => (
                            <div key={f.label} style={{ marginBottom: 16 }}>
                                <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                                <input type={f.type} value={f.value} onChange={(e) => f.set(e.target.value)} style={{
                                    width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 2, padding: '12px 14px', color: '#fff', fontSize: 14,
                                    fontFamily: 'var(--font-ui)', outline: 'none',
                                }} />
                            </div>
                        ))}

                        {/* Payment */}
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>PAYMENT</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {([['advance', 'ADVANCE PAID'], ['full', 'FULL CASH'], ['pending', 'PENDING']] as const).map(([val, label]) => (
                                <button key={val} onClick={() => setPaymentType(val)} style={{
                                    flex: 1, height: 40, borderRadius: 2,
                                    background: paymentType === val ? '#8B1A2B' : 'transparent',
                                    border: `1px solid ${paymentType === val ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', letterSpacing: '0.05em',
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Price summary */}
                        {priceInfo && (
                            <div style={{ background: 'rgba(139,26,43,0.08)', border: '1px solid rgba(139,26,43,0.2)', borderRadius: 2, padding: 16, marginBottom: 24 }}>
                                {[
                                    { l: 'Total', v: `PKR ${fmt(priceInfo.basePrice)}` },
                                    { l: 'Advance (30%)', v: `PKR ${fmt(priceInfo.advanceAmount)}` },
                                    { l: 'Remaining', v: `PKR ${fmt(priceInfo.remainingAmount)}` },
                                ].map((r) => (
                                    <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#C9A84C' }}>{r.l}</span>
                                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.v}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 16 }}>
                            <button onClick={handleBooking} disabled={submitting || (availCheck !== null && !availCheck.available)} className="btn-futuristic" style={{ flex: 1 }}>
                                {submitting ? 'CREATING...' : 'CONFIRM BOOKING'}
                                <span className="btn-arrow">→</span>
                            </button>
                            <button onClick={() => setModal({ ...modal, open: false })} style={{
                                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                            }}>CANCEL</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const GROUNDS = [
    { id: 'G1', name: 'G1' },
    { id: 'G2', name: 'G2' },
    { id: 'G3', name: 'G3' },
    { id: 'G4', name: 'G4' },
    { id: 'G5', name: 'G5' },
];

function pad2(n: number) { return String(n).padStart(2, '0'); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtHour(h: number) { const ampm = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:00 ${ampm}`; }
function fmtDateLong(ds: string) {
    const d = new Date(ds + 'T12:00:00');
    return d.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function shiftDate(ds: string, delta: number) {
    const d = new Date(ds + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Slot order: 6 AM through 5 AM next day
const SLOT_ORDER = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

interface SlotData {
    hour: number;
    startTime: string;
    endTime: string;
    status: string;
    booking: Record<string, unknown> | null;
    bookingContinues: boolean;
}

interface ModalState {
    open: boolean;
    ground: string;
    groundId: string;
    date: string;
    hour: number;
}

export default function AvailabilityPage() {
    const searchParams = useSearchParams();
    const initialDate = searchParams.get('date') || todayStr();

    const [selectedGround, setSelectedGround] = useState('G1');
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [slots, setSlots] = useState<SlotData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [groundCounts, setGroundCounts] = useState<Record<string, number>>({});
    const [tooltip, setTooltip] = useState<{ booking: Record<string, unknown>; x: number; y: number } | null>(null);

    // Modal state
    const [modal, setModal] = useState<ModalState>({ open: false, ground: 'G1', groundId: 'G1', date: todayStr(), hour: 18 });
    const [duration, setDuration] = useState(1);
    const [custName, setCustName] = useState('');
    const [custPhone, setCustPhone] = useState('');
    const [teamName, setTeamName] = useState('');
    const [numPlayers, setNumPlayers] = useState('');
    const [paymentType, setPaymentType] = useState<'advance' | 'full' | 'pending'>('advance');
    const [submitting, setSubmitting] = useState(false);
    const [priceInfo, setPriceInfo] = useState<{ basePrice: number; advanceAmount: number; remainingAmount: number } | null>(null);
    const [availCheck, setAvailCheck] = useState<{ available: boolean } | null>(null);

    const adminSecret = typeof window !== 'undefined' ? localStorage.getItem('adminSecret') || '' : '';

    const fetchSlots = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(
                `${BASE}/api/bookings/slot-status?ground_id=${selectedGround}&date=${selectedDate}`,
                { headers: { 'x-admin-secret': adminSecret } }
            );
            const data = await res.json();
            setSlots(data.slots || []);
        } catch { /* ignore */ }
        setIsLoading(false);
    }, [selectedGround, selectedDate, adminSecret]);

    // Fetch slot counts for all grounds (for tab badges)
    const fetchCounts = useCallback(async () => {
        const counts: Record<string, number> = {};
        try {
            await Promise.all(GROUNDS.map(async (g) => {
                const res = await fetch(
                    `${BASE}/api/bookings/slot-status?ground_id=${g.id}&date=${selectedDate}`,
                    { headers: { 'x-admin-secret': adminSecret } }
                );
                const data = await res.json();
                counts[g.id] = (data.slots || []).filter((s: SlotData) => s.status === 'booked').length;
            }));
        } catch { /* ignore */ }
        setGroundCounts(counts);
    }, [selectedDate, adminSecret]);

    useEffect(() => { fetchSlots(); }, [fetchSlots]);
    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    // Check price when modal opens or duration changes
    useEffect(() => {
        if (!modal.open) return;
        const endHour = (modal.hour + duration) % 24;
        const startTime = `${pad2(modal.hour)}:00:00`;
        const endTime = `${pad2(endHour)}:00:00`;
        fetch(`${BASE}/api/availability/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groundId: modal.groundId, date: modal.date, startTime, endTime }),
        }).then(r => r.json()).then(d => {
            setAvailCheck({ available: d.available });
            if (d.price) setPriceInfo({ basePrice: d.price.basePrice, advanceAmount: d.price.advanceAmount, remainingAmount: d.price.remainingAmount });
        }).catch(() => { });
    }, [modal.open, modal.groundId, modal.date, modal.hour, duration]);

    const openModal = (hour: number) => {
        setModal({ open: true, ground: selectedGround, groundId: selectedGround, date: selectedDate, hour });
        setDuration(1); setCustName(''); setCustPhone(''); setTeamName(''); setNumPlayers('');
        setPaymentType('advance'); setPriceInfo(null); setAvailCheck(null);
    };

    const handleBooking = async () => {
        if (!custName.trim() || !custPhone.trim()) { alert('Name and phone are required'); return; }
        setSubmitting(true);
        try {
            const endHour = (modal.hour + duration) % 24;
            const startTime = `${pad2(modal.hour)}:00:00`;
            const endTime = `${pad2(endHour)}:00:00`;

            const bookRes = await fetch(`${BASE}/api/bookings/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groundId: modal.groundId, date: modal.date, startTime, endTime, customerName: custName, customerPhone: custPhone, teamDetails: teamName || undefined }),
            });
            const bookData = await bookRes.json();
            if (!bookRes.ok) { alert(bookData.error || 'Booking failed'); setSubmitting(false); return; }

            if (paymentType === 'full' || paymentType === 'advance') {
                await fetch(`${BASE}/api/bookings/${bookData.booking.booking_ref}/confirm-payment`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
                    body: JSON.stringify({ paymentMethod: paymentType === 'full' ? 'cash' : 'online' }),
                });
            }

            setModal({ ...modal, open: false });
            fetchSlots();
            fetchCounts();
            alert(`Booking confirmed for ${custName}`);
        } catch { alert('Booking failed'); }
        finally { setSubmitting(false); }
    };

    const fmt = (n: number) => Math.round(n).toLocaleString('en-PK');

    // Skeleton for loading
    const SkeletonCard = () => (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, minHeight: 80, animation: 'skeleton-pulse 1.5s infinite' }} />
    );

    return (
        <div>
            <style>{`
                @keyframes skeleton-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
            `}</style>

            {/* Header */}
            <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: '0 0 24px' }}>LIVE AVAILABILITY</h1>

            {/* Date Navigation */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#111218', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 4, padding: '16px 20px', marginBottom: 20,
            }}>
                <button onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2,
                    color: '#fff', fontSize: 18, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>←</button>

                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                        {fmtDateLong(selectedDate)}
                    </div>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{
                        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                        fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none', textAlign: 'center', colorScheme: 'dark',
                    }} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSelectedDate(todayStr())} style={{
                        background: selectedDate === todayStr() ? '#8B1A2B' : 'transparent',
                        border: '1px solid rgba(139,26,43,0.4)', borderRadius: 2,
                        color: '#fff', fontSize: 11, fontWeight: 600, padding: '8px 14px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.1em',
                    }}>TODAY</button>
                    <button onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2,
                        color: '#fff', fontSize: 18, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>→</button>
                </div>
            </div>

            {/* Ground Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {GROUNDS.map((g) => (
                    <button key={g.id} onClick={() => setSelectedGround(g.id)} style={{
                        background: selectedGround === g.id ? '#8B1A2B' : 'transparent',
                        border: `1px solid ${selectedGround === g.id ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                        borderBottom: selectedGround === g.id ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 2, color: selectedGround === g.id ? '#fff' : 'rgba(255,255,255,0.6)',
                        fontSize: 14, fontWeight: 600, padding: '10px 20px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.2s',
                    }}>
                        {g.name}
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, background: 'rgba(139,26,43,0.3)', borderRadius: 8, padding: '2px 6px' }}>
                            {groundCounts[g.id] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Slot Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {isLoading ? (
                    Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                    SLOT_ORDER.map((h) => {
                        const slot = slots.find(s => s.hour === h);
                        if (!slot) return null;
                        const booked = slot.status === 'booked';
                        const isContinuation = slot.bookingContinues;
                        const nextH = (h + 1) % 24;
                        const bookingDuration = booked && slot.booking && !isContinuation ? Number(slot.booking.duration_hours || 1) : 0;
                        const customerName = booked && slot.booking ? (slot.booking.customer_name as string || '') : '';
                        const truncName = customerName.length > 12 ? customerName.slice(0, 12) + '…' : customerName;

                        return (
                            <div
                                key={h}
                                onClick={() => !booked && openModal(h)}
                                onMouseEnter={(e) => {
                                    if (booked && slot.booking) setTooltip({ booking: slot.booking, x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setTooltip(null)}
                                style={{
                                    background: booked
                                        ? (isContinuation ? 'rgba(139,26,43,0.1)' : 'rgba(139,26,43,0.15)')
                                        : 'rgba(0,166,81,0.08)',
                                    border: `1px solid ${booked ? 'rgba(139,26,43,0.35)' : 'rgba(0,166,81,0.25)'}`,
                                    borderRadius: 4, padding: '12px 14px', minHeight: 80,
                                    cursor: booked ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s', position: 'relative',
                                    opacity: isContinuation ? 0.85 : 1,
                                }}
                            >
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
                                    {fmtHour(h)}
                                </div>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                                    → {fmtHour(nextH)}
                                </div>

                                {booked && !isContinuation && (
                                    <>
                                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                                            {truncName}
                                        </div>
                                        {bookingDuration > 1 && (
                                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, color: '#C9A84C', background: 'rgba(201,168,76,0.15)', padding: '2px 6px', borderRadius: 2, marginBottom: 4, display: 'inline-block' }}>
                                                {bookingDuration}HR BOOKING
                                            </span>
                                        )}
                                    </>
                                )}
                                {booked && isContinuation && (
                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>cont.</div>
                                )}

                                <div style={{
                                    fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em',
                                    color: booked ? '#8B1A2B' : '#00a651', textTransform: 'uppercase', marginTop: 'auto',
                                }}>
                                    {booked ? 'BOOKED' : 'AVAILABLE'}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'fixed', left: Math.min(tooltip.x + 16, window.innerWidth - 260), top: tooltip.y - 10,
                    background: '#111218', border: '1px solid #C9A84C',
                    borderRadius: 4, padding: 16, zIndex: 100, minWidth: 220,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none',
                }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{tooltip.booking.customer_name as string}</div>
                    {[
                        { l: 'Phone', v: tooltip.booking.customer_phone },
                        { l: 'Ref', v: tooltip.booking.booking_ref },
                        { l: 'Duration', v: `${tooltip.booking.duration_hours}hrs` },
                        { l: 'Amount', v: `PKR ${Math.round(Number(tooltip.booking.base_price)).toLocaleString()}` },
                        { l: 'Status', v: tooltip.booking.payment_status },
                    ].map((r) => (
                        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#C9A84C' }}>{r.l}</span>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff' }}>{String(r.v || '—')}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ MANUAL BOOKING MODAL ═══ */}
            {modal.open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={() => setModal({ ...modal, open: false })}
                >
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#111218', border: '1px solid rgba(139,26,43,0.3)',
                        borderRadius: 4, padding: 40, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto',
                    }}>
                        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: '0 0 8px' }}>NEW BOOKING</h2>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#C9A84C', marginBottom: 24 }}>
                            {modal.ground} • {fmtDateLong(modal.date)} • {fmtHour(modal.hour)} → {fmtHour((modal.hour + duration) % 24)}
                        </p>

                        {/* Duration */}
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>DURATION</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {[1, 2, 3, 4].map(d => (
                                <button key={d} onClick={() => setDuration(d)} style={{
                                    flex: 1, height: 44, borderRadius: 2,
                                    background: duration === d ? '#8B1A2B' : 'transparent',
                                    border: `1px solid ${duration === d ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                }}>{d}HR{d > 1 ? 'S' : ''}</button>
                            ))}
                        </div>

                        {availCheck && !availCheck.available && (
                            <div style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 2, padding: '10px 14px', color: '#C9A84C', fontSize: 12, fontFamily: 'var(--font-ui)', marginBottom: 16 }}>
                                ⚠ Slot not available for this duration
                            </div>
                        )}

                        {/* Customer fields */}
                        {[
                            { label: 'CUSTOMER NAME *', value: custName, set: setCustName, type: 'text' as const },
                            { label: 'WHATSAPP NUMBER *', value: custPhone, set: setCustPhone, type: 'tel' as const },
                            { label: 'TEAM NAME', value: teamName, set: setTeamName, type: 'text' as const },
                            { label: 'NUMBER OF PLAYERS', value: numPlayers, set: setNumPlayers, type: 'number' as const },
                        ].map(f => (
                            <div key={f.label} style={{ marginBottom: 16 }}>
                                <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} style={{
                                    width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 2, padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: 'var(--font-ui)', outline: 'none',
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
                                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
                                }}>{label}</button>
                            ))}
                        </div>

                        {/* Price summary */}
                        {priceInfo && (
                            <div style={{ background: 'rgba(139,26,43,0.08)', border: '1px solid rgba(139,26,43,0.2)', borderRadius: 2, padding: 16, marginBottom: 24 }}>
                                {[
                                    { l: 'Total', v: `PKR ${fmt(priceInfo.basePrice)}` },
                                    { l: 'Advance (30%)', v: `PKR ${fmt(priceInfo.advanceAmount)}` },
                                    { l: 'Remaining', v: `PKR ${fmt(priceInfo.remainingAmount)}` },
                                ].map(r => (
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
                                {!submitting && <span className="btn-arrow"> →</span>}
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

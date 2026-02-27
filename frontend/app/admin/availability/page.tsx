'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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

function generateEmptySlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
        slots.push({
            hour,
            startTime: `${pad2(hour)}:00`,
            endTime: `${pad2((hour + 1) % 24)}:00`,
            status: 'available',
            booking: null,
            bookingContinues: false,
            isContinuation: false,
        });
    }
    return slots;
}

function sortSlots(slots: SlotData[]) {
    return [...slots].sort((a, b) => {
        const aH = a.hour < 6 ? a.hour + 24 : a.hour;
        const bH = b.hour < 6 ? b.hour + 24 : b.hour;
        return aH - bH;
    });
}

interface GroundInfo { id: string; name: string; }

interface SlotData {
    hour: number;
    startTime: string;
    endTime: string;
    status: string;
    booking: Record<string, unknown> | null;
    bookingContinues?: boolean;
    isContinuation?: boolean;
}

interface ModalState {
    open: boolean;
    groundId: string;
    groundName: string;
    date: string;
    hour: number;
}

export default function AvailabilityPage() {
    const searchParams = useSearchParams();
    const initialDate = searchParams.get('date') || todayStr();

    // Grounds from API (with real UUIDs)
    const [grounds, setGrounds] = useState<GroundInfo[]>([]);
    const [selectedGround, setSelectedGround] = useState(''); // ground name like "G1"
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [slots, setSlots] = useState<SlotData[]>(generateEmptySlots());
    const [isLoading, setIsLoading] = useState(true);
    const [groundCounts, setGroundCounts] = useState<Record<string, number>>({});
    const [tooltip, setTooltip] = useState<{ booking: Record<string, unknown>; x: number; y: number } | null>(null);

    // Modal state
    const [modal, setModal] = useState<ModalState>({ open: false, groundId: '', groundName: '', date: todayStr(), hour: 18 });
    const [duration, setDuration] = useState(1);
    const [custName, setCustName] = useState('');
    const [custPhone, setCustPhone] = useState('');
    const [teamName, setTeamName] = useState('');
    const [paymentType, setPaymentType] = useState<'advance' | 'full' | 'pending'>('advance');
    const [submitting, setSubmitting] = useState(false);
    const [priceInfo, setPriceInfo] = useState<{ basePrice: number; advanceAmount: number; remainingAmount: number } | null>(null);

    const adminSecret = typeof window !== 'undefined' ? localStorage.getItem('adminSecret') || '' : '';

    // 1. Fetch grounds on mount
    useEffect(() => {
        const loadGrounds = async () => {
            try {
                const res = await fetch(`${BASE}/api/grounds`);
                const data = await res.json();
                const list: GroundInfo[] = (data.grounds || []).map((g: Record<string, unknown>) => ({ id: g.id as string, name: g.name as string }));
                setGrounds(list);
                if (list.length > 0 && !selectedGround) {
                    setSelectedGround(list[0].name);
                }
            } catch (err) {
                console.error('Failed to load grounds:', err);
            }
        };
        loadGrounds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Fetch slots when ground/date/grounds change
    const fetchSlots = useCallback(async () => {
        if (grounds.length === 0 || !selectedGround) return;
        const ground = grounds.find(g => g.name === selectedGround);
        if (!ground) {
            console.log('Ground not found:', selectedGround, grounds);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(
                `${BASE}/api/bookings/slot-status?ground_id=${ground.id}&date=${selectedDate}`,
                { headers: { 'x-admin-secret': adminSecret } }
            );
            const data = await res.json();
            console.log('Slot data:', data);
            setSlots(data.slots?.length > 0 ? data.slots : generateEmptySlots());
        } catch (err) {
            console.error('Fetch slots error:', err);
            setSlots(generateEmptySlots());
        }
        setIsLoading(false);
    }, [grounds, selectedGround, selectedDate, adminSecret]);

    useEffect(() => {
        if (grounds.length > 0) {
            fetchSlots();
        }
    }, [grounds, fetchSlots]);

    // 3. Fetch booked counts for all ground tabs
    const fetchCounts = useCallback(async () => {
        if (grounds.length === 0) return;
        const counts: Record<string, number> = {};
        try {
            await Promise.all(grounds.map(async (g) => {
                const res = await fetch(
                    `${BASE}/api/bookings/slot-status?ground_id=${g.id}&date=${selectedDate}`,
                    { headers: { 'x-admin-secret': adminSecret } }
                );
                const data = await res.json();
                counts[g.name] = (data.slots || []).filter((s: SlotData) => s.status === 'booked').length;
            }));
        } catch { /* ignore */ }
        setGroundCounts(counts);
    }, [grounds, selectedDate, adminSecret]);

    useEffect(() => {
        if (grounds.length > 0) { fetchCounts(); }
    }, [grounds, fetchCounts]);

    // Check price when modal opens or duration changes
    useEffect(() => {
        if (!modal.open || !modal.groundId) return;
        const endHour = (modal.hour + duration) % 24;
        const startTime = `${pad2(modal.hour)}:00:00`;
        const endTime = `${pad2(endHour)}:00:00`;
        fetch(`${BASE}/api/availability/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groundId: modal.groundId, date: modal.date, startTime, endTime }),
        }).then(r => r.json()).then(d => {
            if (d.price) setPriceInfo({ basePrice: d.price.basePrice, advanceAmount: d.price.advanceAmount, remainingAmount: d.price.remainingAmount });
        }).catch(() => { });
    }, [modal.open, modal.groundId, modal.date, modal.hour, duration]);

    const openModal = (hour: number) => {
        const ground = grounds.find(g => g.name === selectedGround);
        if (!ground) return;
        setModal({ open: true, groundId: ground.id, groundName: ground.name, date: selectedDate, hour });
        setDuration(1); setCustName(''); setCustPhone(''); setTeamName('');
        setPaymentType('advance'); setPriceInfo(null);
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
    const sortedSlots = sortSlots(slots);

    return (
        <div>
            <style>{`@keyframes skeleton-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>

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
            <div className="avail-ground-tabs" style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {grounds.map((g) => (
                    <button key={g.id} onClick={() => setSelectedGround(g.name)} style={{
                        background: selectedGround === g.name ? '#8B1A2B' : 'transparent',
                        border: `1px solid ${selectedGround === g.name ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                        borderBottom: selectedGround === g.name ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 2, color: selectedGround === g.name ? '#fff' : 'rgba(255,255,255,0.6)',
                        fontSize: 14, fontWeight: 600, padding: '10px 20px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.2s',
                        flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                        {g.name}
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, background: 'rgba(139,26,43,0.3)', borderRadius: 8, padding: '2px 6px' }}>
                            {groundCounts[g.name] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Slot Grid — always 24 cards */}
            <div className="avail-slot-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {isLoading ? (
                    Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, minHeight: 80, animation: 'skeleton-pulse 1.5s infinite' }} />
                    ))
                ) : (
                    sortedSlots.map((slot) => {
                        const booked = slot.status === 'booked';
                        const isCont = slot.bookingContinues || slot.isContinuation;
                        const nextH = (slot.hour + 1) % 24;
                        const bookingDuration = booked && slot.booking && !isCont ? Number(slot.booking.duration_hours || 1) : 0;
                        const customerName = booked && slot.booking ? (slot.booking.customer_name as string || '') : '';
                        const truncName = customerName.length > 12 ? customerName.slice(0, 12) + '…' : customerName;

                        return (
                            <div
                                key={slot.hour}
                                onClick={() => !booked && openModal(slot.hour)}
                                onMouseEnter={(e) => { if (booked && slot.booking) setTooltip({ booking: slot.booking, x: e.clientX, y: e.clientY }); }}
                                onMouseLeave={() => setTooltip(null)}
                                style={{
                                    background: booked ? (isCont ? 'rgba(139,26,43,0.1)' : 'rgba(139,26,43,0.15)') : 'rgba(0,166,81,0.08)',
                                    border: `1px solid ${booked ? 'rgba(139,26,43,0.35)' : 'rgba(0,166,81,0.25)'}`,
                                    borderRadius: 4, padding: '12px 14px', minHeight: 80,
                                    cursor: booked ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s', position: 'relative',
                                    opacity: isCont ? 0.85 : 1,
                                }}
                            >
                                <div className="avail-slot-time" style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
                                    {fmtHour(slot.hour)}
                                </div>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                                    → {fmtHour(nextH)}
                                </div>

                                {booked && !isCont && (
                                    <>
                                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                                            {truncName}
                                        </div>
                                        {bookingDuration > 1 && (
                                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, color: '#C9A84C', background: 'rgba(201,168,76,0.15)', padding: '2px 6px', borderRadius: 2, display: 'inline-block' }}>
                                                {bookingDuration}HR BOOKING
                                            </span>
                                        )}
                                    </>
                                )}
                                {booked && isCont && (
                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>cont.</div>
                                )}

                                <div style={{
                                    fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em',
                                    color: booked ? '#8B1A2B' : '#00a651', textTransform: 'uppercase', marginTop: 4,
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
                    position: 'fixed', left: Math.min(tooltip.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 260), top: tooltip.y - 10,
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
                    <div onClick={e => e.stopPropagation()} className="admin-modal-content" style={{
                        background: '#111218', border: '1px solid rgba(139,26,43,0.3)',
                        borderRadius: 4, padding: 40, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto',
                    }}>
                        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: '0 0 8px' }}>NEW BOOKING</h2>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#C9A84C', marginBottom: 24 }}>
                            {modal.groundName} • {fmtDateLong(modal.date)} • {fmtHour(modal.hour)} → {fmtHour((modal.hour + duration) % 24)}
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

                        {/* Customer fields */}
                        {[
                            { label: 'CUSTOMER NAME *', value: custName, set: setCustName, type: 'text' as const },
                            { label: 'WHATSAPP NUMBER *', value: custPhone, set: setCustPhone, type: 'tel' as const },
                            { label: 'TEAM NAME', value: teamName, set: setTeamName, type: 'text' as const },
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
                            <button onClick={handleBooking} disabled={submitting} className="btn-futuristic" style={{ flex: 1 }}>
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
            {/* Mobile responsive styles */}
            <style>{`
                @media (max-width: 768px) {
                    .avail-slot-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 8px !important;
                    }
                    .avail-slot-grid > div {
                        padding: 10px !important;
                    }
                    .avail-slot-time {
                        font-size: 14px !important;
                    }
                    .avail-ground-tabs {
                        flex-wrap: nowrap !important;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                    }
                    .avail-ground-tabs::-webkit-scrollbar {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}

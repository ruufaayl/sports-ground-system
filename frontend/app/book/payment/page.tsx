'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { confirmPayment } from '../../../lib/api';
import StepIndicator from '../../components/StepIndicator';
import LogoBadge from '../../components/LogoBadge';
import { playSelect, playConfirm } from '../../lib/sounds';
import type { Booking } from '../../../lib/types';

function fmt(n: number) { return Math.round(Number(n)).toLocaleString('en-PK'); }

function formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function TicketRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(139,26,43,0.12)' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>{label}</span>
            <span style={{ color: gold ? '#C9A84C' : '#fff', fontWeight: 500, fontSize: 14, fontFamily: "'Inter', sans-serif" }}>{value}</span>
        </div>
    );
}

type PaymentMethod = 'easypaisa' | 'jazzcash' | null;

export default function PaymentPage() {
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [groundName, setGroundName] = useState('');
    const [pricePerHour, setPricePerHour] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);

    useEffect(() => {
        const raw = localStorage.getItem('bookingData');
        if (!raw) { router.push('/book'); return; }
        const b: Booking = JSON.parse(raw);
        setBooking(b);
        const groundRaw = localStorage.getItem('selectedGround');
        if (groundRaw) {
            const g = JSON.parse(groundRaw);
            setGroundName(g.name || b.ground_id);
        } else {
            setGroundName(b.ground_id);
        }
        const priceRaw = localStorage.getItem('bookingPrice');
        if (priceRaw) {
            const p = JSON.parse(priceRaw);
            setPricePerHour(Number(p.pricePerHour) || 0);
        } else if (b.advance_amount && b.duration_hours) {
            setPricePerHour(Math.round(Number(b.advance_amount) / 0.3 / Number(b.duration_hours)));
        }
    }, [router]);

    const handlePaid = async () => {
        if (!booking) return;
        setLoading(true);
        setError('');
        playSelect();
        try {
            await confirmPayment(booking.booking_ref, '', 'manual');
            const updated = { ...booking, payment_status: 'paid' };
            localStorage.setItem('bookingData', JSON.stringify(updated));
            playConfirm();
            router.push('/book/confirmation');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Payment confirmation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!booking) return null;

    const timeDisplay = `${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}`;

    return (
        <main style={{ background: '#0D0608', minHeight: '100vh', padding: '40px 20px 60px' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
                <StepIndicator current={4} />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}
                >
                    {/* LEFT: Ticket card */}
                    <div style={{
                        background: 'linear-gradient(160deg, #1a0a0d, #150508)',
                        border: '1px solid rgba(139,26,43,0.35)',
                        borderRadius: '16px 0 0 16px',
                        padding: 28,
                        position: 'relative',
                    }}>
                        {/* Perforated right edge */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            right: -1,
                            width: 1,
                            borderRight: '2px dashed rgba(201,168,76,0.25)',
                        }} />

                        {/* Punch holes */}
                        {[-1, 1].map((sign, i) => (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    right: -10,
                                    top: `calc(50% + ${sign * 60}px)`,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: '#0D0608',
                                    border: '1px solid rgba(201,168,76,0.2)',
                                }}
                            />
                        ))}

                        {/* Logo + ref */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <LogoBadge size={44} />
                            <div>
                                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em' }}>BOOKING REF</div>
                                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#C9A84C', letterSpacing: '0.15em' }}>
                                    {booking.booking_ref}
                                </div>
                            </div>
                        </div>

                        {/* QR placeholder */}
                        <div style={{
                            width: '100%',
                            height: 80,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20,
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: 12,
                            fontFamily: "'Bebas Neue', sans-serif",
                            letterSpacing: '0.1em',
                        }}>
                            QR CODE
                        </div>

                        <TicketRow label="Ground" value={groundName} />
                        <TicketRow label="Date" value={booking.date} />
                        <TicketRow label="Time" value={timeDisplay} />
                        <TicketRow label="Duration" value={`${booking.duration_hours} hours`} />
                        {pricePerHour > 0 && <TicketRow label="Rate" value={`PKR ${fmt(pricePerHour)}/hr`} />}
                        <TicketRow label="Customer" value={booking.customer_name} />
                        <TicketRow label="Phone" value={booking.customer_phone} />

                        <div style={{ borderTop: '1px solid rgba(139,26,43,0.25)', marginTop: 16, paddingTop: 16 }}>
                            <TicketRow label="Total" value={`PKR ${fmt(booking.base_price)}`} />
                            <TicketRow label="30% Advance" value={`PKR ${fmt(booking.advance_amount)}`} gold />
                            <TicketRow label="70% At Ground" value={`PKR ${fmt(booking.remaining_amount)}`} />
                        </div>
                    </div>

                    {/* RIGHT: Payment */}
                    <div style={{ padding: '0 4px' }}>
                        <h1 style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 'clamp(32px, 5vw, 52px)',
                            color: '#C9A84C',
                            letterSpacing: '0.05em',
                            lineHeight: 1,
                            marginBottom: 4,
                        }}>
                            PAY PKR {fmt(booking.advance_amount)}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: "'Inter', sans-serif", marginBottom: 28 }}>
                            TO CONFIRM YOUR BOOKING
                        </p>

                        {/* Payment method cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                            {[
                                {
                                    id: 'easypaisa' as PaymentMethod,
                                    label: 'EasyPaisa',
                                    emoji: '📱',
                                    number: '0330-3691303',
                                    bg: 'linear-gradient(135deg, #0d2010, #0a1a0a)',
                                    border: 'rgba(34,139,34,0.4)',
                                    accent: '#5cb85c',
                                },
                                {
                                    id: 'jazzcash' as PaymentMethod,
                                    label: 'JazzCash',
                                    emoji: '💜',
                                    number: '0330-3691303',
                                    bg: 'linear-gradient(135deg, #1a0d2a, #130820)',
                                    border: 'rgba(148,0,211,0.4)',
                                    accent: '#b27fd6',
                                },
                            ].map((method) => {
                                const isSelected = selectedMethod === method.id;
                                return (
                                    <motion.button
                                        key={method.id}
                                        onClick={() => setSelectedMethod(method.id)}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            background: method.bg,
                                            border: `1px solid ${isSelected ? method.accent : method.border}`,
                                            borderRadius: 12,
                                            padding: '20px 24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'none',
                                            textAlign: 'left',
                                            boxShadow: isSelected ? `0 0 20px ${method.border}` : 'none',
                                            transition: 'border-color 0.2s, box-shadow 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <span style={{ fontSize: 28 }}>{method.emoji}</span>
                                            <div>
                                                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#fff', letterSpacing: '0.1em' }}>
                                                    {method.label}
                                                </div>
                                                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: method.accent, letterSpacing: '0.1em' }}>
                                                    {method.number}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: method.accent,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, color: '#fff', fontWeight: 700,
                                            }}>✓</div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(231,76,60,0.1)',
                                border: '1px solid rgba(231,76,60,0.4)',
                                borderRadius: 8,
                                padding: '12px 16px',
                                color: '#e74c3c',
                                fontSize: 14,
                                fontFamily: "'Inter', sans-serif",
                                marginBottom: 16,
                            }}>
                                {error}
                            </div>
                        )}

                        <motion.button
                            onClick={handlePaid}
                            disabled={loading}
                            whileHover={loading ? {} : { scale: 1.02 }}
                            whileTap={loading ? {} : { scale: 0.98 }}
                            className="btn-crimson"
                            style={{ width: '100%', fontSize: 18, padding: '18px', marginBottom: 16 }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                                    </svg>
                                    CONFIRMING...
                                </span>
                            ) : '✓ I HAVE PAID'}
                        </motion.button>

                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
                            Safepay integration coming soon
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { confirmPayment } from '../../../lib/api';
import { formatDisplayDate, formatTime as fmtTime } from '../../../lib/dateUtils';
import StepIndicator from '../../components/StepIndicator';
import { playSelect, playConfirm } from '../../lib/sounds';
import type { Booking } from '../../../lib/types';

function fmt(n: number) { return Math.round(Number(n)).toLocaleString('en-PK'); }

function formatTime(time: string): string {
    return fmtTime(time);
}

function formatDateLong(dateStr: string): string {
    return formatDisplayDate(dateStr);
}

export default function PaymentPage() {
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [groundName, setGroundName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
    }, [router]);

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text.replace(/-/g, ''));
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // fallback
        }
    };

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
    const now = new Date();
    const issuedDate = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()]} ${now.getFullYear()}`;
    const issuedTime = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

    return (
        <main style={{ background: '#0D0608', minHeight: '100vh', padding: '40px 20px 60px' }}>
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <StepIndicator current={4} />

                {/* ═══ Logo + Booking Ref ═══ */}
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{ marginBottom: 20 }}>
                        <Image
                            src="/logo.png"
                            alt="ECF Logo"
                            width={100}
                            height={100}
                            style={{
                                animation: 'spin-slow 30s linear infinite',
                                filter: 'drop-shadow(0 0 20px rgba(139,26,43,0.3))',
                            }}
                        />
                    </div>

                    {/* Gold line */}
                    <div style={{ width: 120, height: 1, background: '#C9A84C', margin: '0 auto 24px' }} />

                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.4em', color: '#C9A84C', marginBottom: 8 }}>
                        BOOKING REFERENCE
                    </div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 56, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '0.02em' }}>
                        {booking.booking_ref}
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                        Issued {issuedDate} • {issuedTime}
                    </div>
                </div>

                {/* ═══ Booking Details Card ═══ */}
                <div style={{
                    background: 'rgba(139,26,43,0.08)',
                    border: '1px solid rgba(139,26,43,0.3)',
                    borderRadius: 2,
                    padding: 32,
                    marginBottom: 40,
                }}>
                    {/* Detail rows */}
                    {[
                        { label: 'GROUND', value: groundName },
                        { label: 'DATE', value: formatDateLong(booking.date) },
                        { label: 'TIME', value: timeDisplay },
                        { label: 'DURATION', value: `${booking.duration_hours} Hours` },
                    ].map(({ label, value }) => (
                        <div key={label} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 0', borderBottom: '1px solid rgba(139,26,43,0.12)',
                        }}>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C', textTransform: 'uppercase' }}>{label}</span>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, color: '#fff' }}>{value}</span>
                        </div>
                    ))}

                    {/* Gold divider */}
                    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '16px 0' }} />

                    {/* Payment rows */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(139,26,43,0.12)' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C' }}>TOTAL AMOUNT</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: '#C9A84C' }}>PKR {fmt(booking.base_price)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(139,26,43,0.12)' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C' }}>ADVANCE DUE</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: '#8B1A2B' }}>PKR {fmt(booking.advance_amount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C' }}>AT GROUND</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 500, color: '#fff' }}>PKR {fmt(booking.remaining_amount)}</span>
                    </div>
                </div>

                {/* ═══ Payment Section ═══ */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                        PAY PKR {fmt(booking.advance_amount)} NOW
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                        Transfer to secure your booking
                    </div>
                </div>

                {/* Payment method cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                    {[
                        { id: 'easypaisa', logo: 'EP', logoColor: '#00A651', name: 'EasyPaisa', number: '0330-3691303' },
                        { id: 'jazzcash', logo: 'JC', logoColor: '#E4002B', name: 'JazzCash', number: '0330-3691303' },
                    ].map((method) => (
                        <button
                            key={method.id}
                            onClick={() => handleCopy(method.number, method.id)}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 4,
                                padding: '20px 16px',
                                cursor: 'none',
                                textAlign: 'center',
                                transition: 'border-color 0.3s ease, background 0.3s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: method.logoColor, marginBottom: 6 }}>
                                {method.logo}
                            </div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: '#fff', marginBottom: 8 }}>
                                {method.name}
                            </div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, color: '#C9A84C', marginBottom: 6 }}>
                                {method.number}
                            </div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                                {copiedId === method.id ? 'COPIED ✓' : 'TAP TO COPY'}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'rgba(231,76,60,0.1)',
                        border: '1px solid rgba(231,76,60,0.4)',
                        borderRadius: 2,
                        padding: '12px 16px',
                        color: '#e74c3c',
                        fontSize: 14,
                        fontFamily: 'var(--font-body)',
                        marginBottom: 16,
                    }}>
                        {error}
                    </div>
                )}

                {/* I HAVE PAID button — gold variant */}
                <button
                    onClick={handlePaid}
                    disabled={loading}
                    className="btn-futuristic btn-futuristic-gold"
                    style={{ width: '100%', marginBottom: 16 }}
                >
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                            </svg>
                            CONFIRMING...
                        </span>
                    ) : (
                        <>
                            I HAVE PAID
                            <span className="btn-arrow">→</span>
                        </>
                    )}
                </button>

                {/* Disclaimer */}
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'var(--font-ui)' }}>
                    Your slot will be confirmed once payment is verified
                </p>
            </div>
        </main>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { confirmPayment } from '../../../lib/api';
import { StepIndicator } from '../page';
import type { Booking } from '../../../lib/types';

function fmt(n: number) { return Math.round(Number(n)).toLocaleString('en-PK'); }

/** Converts "18:00:00" or "18:00" → "6:00 PM" */
function formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,255,136,0.08)' }}>
            <span style={{ color: '#888', fontSize: big ? 15 : 13 }}>{label}</span>
            <span style={{ color: '#fff', fontWeight: big ? 700 : 500, fontSize: big ? 16 : 14 }}>{value}</span>
        </div>
    );
}

export default function PaymentPage() {
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [groundName, setGroundName] = useState('');
    const [pricePerHour, setPricePerHour] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const raw = localStorage.getItem('bookingData');
        if (!raw) { router.push('/book'); return; }
        const b: Booking = JSON.parse(raw);
        setBooking(b);

        // Fix 1: get ground name from localStorage instead of displaying UUID
        const groundRaw = localStorage.getItem('selectedGround');
        if (groundRaw) {
            const g = JSON.parse(groundRaw);
            setGroundName(g.name || b.ground_id);
        } else {
            setGroundName(b.ground_id);
        }

        // Fix 2: get pricePerHour — prefer bookingPrice in localStorage,
        // fall back to calculating from advance_amount and duration_hours
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
        try {
            await confirmPayment(booking.booking_ref, '', 'manual');
            const updated = { ...booking, payment_status: 'paid' };
            localStorage.setItem('bookingData', JSON.stringify(updated));
            router.push('/book/confirmation');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Payment confirmation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!booking) return null;

    // Fix 3: format times as "6:00 PM → 11:00 PM"
    const timeDisplay = `${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}`;

    return (
        <main style={{ background: '#0a0a0f', minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: 620, margin: '0 auto' }}>
                <StepIndicator current={4} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Booking Ref */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Complete Payment</h1>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Booking Reference</div>
                        <div style={{
                            display: 'inline-block', background: 'rgba(0,255,136,0.1)',
                            border: '1px solid rgba(0,255,136,0.4)', borderRadius: 10,
                            padding: '12px 28px', fontSize: 26, fontWeight: 900, color: '#00ff88',
                            letterSpacing: '3px', boxShadow: '0 0 30px rgba(0,255,136,0.2)',
                        }}>
                            {booking.booking_ref}
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                        <div style={{ fontSize: 13, color: '#00ff88', letterSpacing: '1px', fontWeight: 600, marginBottom: 16 }}>BOOKING DETAILS</div>
                        {/* Fix 1: show name, not UUID */}
                        <Row label="Ground" value={groundName} />
                        <Row label="Date" value={booking.date} />
                        {/* Fix 3: formatted time */}
                        <Row label="Time" value={timeDisplay} />
                        <Row label="Duration" value={`${booking.duration_hours} hours`} />
                        {/* Fix 2: pricePerHour from localStorage */}
                        <Row label="Rate" value={pricePerHour ? `PKR ${fmt(pricePerHour)}/hr` : '—'} />
                        <Row label="Customer" value={booking.customer_name} />
                        <Row label="Phone" value={booking.customer_phone} />
                        <div style={{ marginTop: 16, padding: '14px 0 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: '#888' }}>Total Amount</span>
                                <span style={{ color: '#fff', fontWeight: 700 }}>PKR {fmt(booking.base_price)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: '#888' }}>70% Remaining at Ground</span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>PKR {fmt(booking.remaining_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment card */}
                    <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 12, padding: 28, marginBottom: 24, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#00ff88', marginBottom: 8 }}>
                            Pay PKR {fmt(booking.advance_amount)}
                        </div>
                        <div style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
                            30% advance to confirm your booking
                        </div>

                        <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 20, marginBottom: 20, textAlign: 'left' }}>
                            <div style={{ color: '#888', fontSize: 12, letterSpacing: '1px', marginBottom: 12 }}>TRANSFER TO</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ color: '#aaa' }}>📱 EasyPaisa</span>
                                <span style={{ color: '#00ff88', fontWeight: 700, letterSpacing: '1px' }}>0330-3691303</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>💜 JazzCash</span>
                                <span style={{ color: '#00ff88', fontWeight: 700, letterSpacing: '1px' }}>0330-3691303</span>
                            </div>
                        </div>

                        <div style={{ color: '#666', fontSize: 12, marginBottom: 24 }}>
                            Safepay online payment integration coming soon.
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: 8, padding: '10px 14px', color: '#ff5050', fontSize: 14, marginBottom: 16 }}>
                                {error}
                            </div>
                        )}

                        <button
                            className="neon-btn"
                            disabled={loading}
                            onClick={handlePaid}
                            style={{ width: '100%', fontSize: 16 }}
                        >
                            {loading ? 'CONFIRMING...' : '✓ I HAVE PAID'}
                        </button>
                    </div>

                    <p style={{ textAlign: 'center', color: '#555', fontSize: 13 }}>
                        You will receive a WhatsApp confirmation after clicking the button.
                    </p>
                </motion.div>
            </div>
        </main>
    );
}

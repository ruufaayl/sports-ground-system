'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createBooking } from '../../../lib/api';
import { StepIndicator } from '../page';
import type { BookingFormData } from '../../../lib/types';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,255,136,0.08)' }}>
            <span style={{ color: '#888', fontSize: 14 }}>{label}</span>
            <span style={{ color: highlight ? '#00ff88' : '#fff', fontWeight: highlight ? 700 : 500, fontSize: 14 }}>{value}</span>
        </div>
    );
}

export default function DetailsPage() {
    const router = useRouter();
    const [progress, setProgress] = useState<Partial<BookingFormData> | null>(null);
    const [form, setForm] = useState({ name: '', phone: '', teamName: '', players: '', notes: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const raw = localStorage.getItem('bookingProgress');
        if (!raw) { router.push('/book'); return; }
        setProgress(JSON.parse(raw));
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!progress) return;

        // Basic phone validation (Pakistan 03xxxxxxxxx)
        if (!/^03[0-9]{9}$/.test(form.phone)) {
            setError('Enter a valid Pakistani phone number (03xxxxxxxxx)');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const teamDetails = [
                form.teamName && `Team: ${form.teamName}`,
                form.players && `Players: ${form.players}`,
                form.notes && `Notes: ${form.notes}`,
            ].filter(Boolean).join(' | ');

            const bookingData = {
                groundId: progress.groundId!,
                date: progress.date!,
                startTime: progress.startTime!,
                endTime: progress.endTime!,
                customerName: form.name,
                customerPhone: form.phone,
                teamDetails: teamDetails || undefined,
            };

            console.log('Sending booking data:', JSON.stringify(bookingData));

            const { booking } = await createBooking(bookingData);

            // Store booking ref and full booking data
            localStorage.setItem('bookingRef', booking.booking_ref);
            localStorage.setItem('bookingData', JSON.stringify(booking));

            router.push('/book/payment');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!progress) return null;

    return (
        <main style={{ background: '#0a0a0f', minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <StepIndicator current={3} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 32 }}>
                        Your Details
                    </h1>

                    {/* Booking Summary */}
                    <div style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
                        <div style={{ fontSize: 13, color: '#00ff88', letterSpacing: '1px', fontWeight: 600, marginBottom: 16 }}>BOOKING SUMMARY</div>
                        <SummaryRow label="Ground" value={progress.groundName || progress.groundId || ''} />
                        <SummaryRow label="Date" value={progress.date || ''} />
                        <SummaryRow label="Time" value={`${progress.startTime} → ${progress.endTime}`} />
                        <SummaryRow label="Duration" value={`${progress.duration} hours`} />
                        <SummaryRow label="Rate" value={`PKR ${fmt(progress.pricePerHour ?? 0)}/hr`} />
                        <SummaryRow label="Total Amount" value={`PKR ${fmt(progress.basePrice ?? 0)}`} />
                        <SummaryRow label="30% Advance (Online)" value={`PKR ${fmt(progress.advanceAmount ?? 0)}`} highlight />
                        <SummaryRow label="70% Remaining (At Ground)" value={`PKR ${fmt(progress.remainingAmount ?? 0)}`} />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label style={{ display: 'block', color: '#888', fontSize: 13, letterSpacing: '1px', marginBottom: 8 }}>FULL NAME *</label>
                            <input name="name" required value={form.name} onChange={handleChange}
                                placeholder="Enter your full name" className="neon-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#888', fontSize: 13, letterSpacing: '1px', marginBottom: 8 }}>WHATSAPP NUMBER *</label>
                            <input name="phone" required value={form.phone} onChange={handleChange}
                                placeholder="03xxxxxxxxx" className="neon-input" type="tel" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: 13, letterSpacing: '1px', marginBottom: 8 }}>TEAM NAME</label>
                                <input name="teamName" value={form.teamName} onChange={handleChange}
                                    placeholder="Optional" className="neon-input" />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: 13, letterSpacing: '1px', marginBottom: 8 }}>NO. OF PLAYERS</label>
                                <input name="players" value={form.players} onChange={handleChange}
                                    placeholder="Optional" className="neon-input" type="number" min={1} max={30} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#888', fontSize: 13, letterSpacing: '1px', marginBottom: 8 }}>SPECIAL REQUESTS</label>
                            <textarea name="notes" value={form.notes} onChange={handleChange}
                                placeholder="Any special requirements..." rows={3}
                                className="neon-input" style={{ resize: 'vertical' }} />
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: 8, padding: '12px 16px', color: '#ff5050', fontSize: 14 }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="neon-btn" disabled={loading} style={{ width: '100%', fontSize: 16, marginTop: 8 }}>
                            {loading ? 'CREATING BOOKING...' : 'PROCEED TO PAYMENT →'}
                        </button>
                    </form>
                </motion.div>
            </div>
        </main>
    );
}

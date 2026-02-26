'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createBooking } from '../../../lib/api';
import StepIndicator from '../../components/StepIndicator';
import { playSelect, playConfirm } from '../../lib/sounds';
import type { BookingFormData } from '../../../lib/types';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }

function FloatField({
    label,
    name,
    value,
    onChange,
    type = 'text',
    required = false,
    placeholder = ' ',
    min,
    max,
    prefix,
    multiline = false,
    rows = 3,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    type?: string;
    required?: boolean;
    placeholder?: string;
    min?: number;
    max?: number;
    prefix?: React.ReactNode;
    multiline?: boolean;
    rows?: number;
}) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {prefix && <div style={{ paddingBottom: 10, fontSize: 18 }}>{prefix}</div>}
                <div className="float-field" style={{ flex: 1 }}>
                    {multiline ? (
                        <textarea
                            name={name}
                            value={value}
                            onChange={onChange}
                            rows={rows}
                            placeholder={placeholder}
                        />
                    ) : (
                        <input
                            name={name}
                            value={value}
                            onChange={onChange}
                            type={type}
                            required={required}
                            placeholder={placeholder}
                            min={min}
                            max={max}
                        />
                    )}
                    <label>
                        {label} {required ? '*' : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>OPTIONAL</span>}
                    </label>
                </div>
            </div>
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
        if (!/^03[0-9]{9}$/.test(form.phone)) {
            setError('Enter a valid Pakistani number (03xxxxxxxxx)');
            return;
        }
        setError('');
        setLoading(true);
        playSelect();
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

            const { booking } = await createBooking(bookingData);
            localStorage.setItem('bookingRef', booking.booking_ref);
            localStorage.setItem('bookingData', JSON.stringify(booking));
            playConfirm();
            router.push('/book/payment');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!progress) return null;

    return (
        <main style={{ background: '#0D0608', minHeight: '100vh', paddingBottom: 48 }}>

            {/* Booking summary bar */}
            <div style={{
                background: 'linear-gradient(90deg, #1a0a0d, #120508)',
                borderBottom: '1px solid rgba(139,26,43,0.4)',
                padding: '0 24px',
                height: 64,
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                overflowX: 'auto',
                backdropFilter: 'blur(8px)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
            }}>
                {[
                    { label: progress.groundName || progress.groundId || '' },
                    { label: progress.date || '' },
                    { label: `${progress.startTime} → ${progress.endTime}` },
                    { label: `${progress.duration}h` },
                    { label: `PKR ${fmt(progress.advanceAmount ?? 0)}`, gold: true },
                ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center', padding: '0 18px' }}>
                            <div style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 16,
                                color: item.gold ? '#C9A84C' : '#fff',
                                letterSpacing: '0.05em',
                            }}>
                                {item.label}
                            </div>
                        </div>
                        {i < 4 && (
                            <div style={{ width: 1, height: 24, background: 'rgba(139,26,43,0.4)' }} />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
                <StepIndicator current={3} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 'clamp(32px, 6vw, 48px)',
                        color: '#fff',
                        letterSpacing: '0.08em',
                        textAlign: 'center',
                        marginBottom: 40,
                    }}>
                        YOUR DETAILS
                    </h1>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                        <FloatField
                            label="Full Name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />

                        <FloatField
                            label="WhatsApp Number"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            type="tel"
                            required
                            prefix="🇵🇰"
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <FloatField
                                label="Team Name"
                                name="teamName"
                                value={form.teamName}
                                onChange={handleChange}
                            />
                            <FloatField
                                label="No. of Players"
                                name="players"
                                value={form.players}
                                onChange={handleChange}
                                type="number"
                                min={1}
                                max={30}
                            />
                        </div>

                        <FloatField
                            label="Special Requests"
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            multiline
                            rows={3}
                        />

                        {error && (
                            <div style={{
                                background: 'rgba(231,76,60,0.1)',
                                border: '1px solid rgba(231,76,60,0.4)',
                                borderRadius: 8,
                                padding: '12px 16px',
                                color: '#e74c3c',
                                fontSize: 14,
                                fontFamily: "'Inter', sans-serif",
                            }}>
                                {error}
                            </div>
                        )}

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={loading ? {} : { scale: 1.02 }}
                            whileTap={loading ? {} : { scale: 0.98 }}
                            className="btn-crimson"
                            style={{
                                width: '100%',
                                fontSize: 18,
                                padding: '18px',
                                marginTop: 8,
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                                    </svg>
                                    CREATING BOOKING...
                                </span>
                            ) : 'CONFIRM BOOKING →'}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </main>
    );
}

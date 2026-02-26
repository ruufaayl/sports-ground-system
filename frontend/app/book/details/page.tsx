'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createBooking } from '../../../lib/api';
import StepIndicator from '../../components/StepIndicator';
import { playSelect, playConfirm } from '../../lib/sounds';
import type { BookingFormData } from '../../../lib/types';

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }

function fmt24to12(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function formatDatePretty(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// ── Floating Field v2 ─────────────────────────────────────────────────────────
function FloatFieldV2({
    label, name, value, onChange,
    type = 'text', required = false,
    multiline = false, rows = 3,
    prefix, min, max,
}: {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    type?: string; required?: boolean;
    multiline?: boolean; rows?: number;
    prefix?: React.ReactNode;
    min?: number; max?: number;
}) {
    const hasValue = value.length > 0;
    const [focused, setFocused] = useState(false);
    const isUp = focused || hasValue;

    return (
        <div className="float-field-v2" style={{ position: 'relative', marginBottom: 32 }}>
            {prefix && (
                <div style={{ position: 'absolute', left: 0, bottom: 8, fontSize: 18, zIndex: 2 }}>{prefix}</div>
            )}
            {multiline ? (
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    rows={rows}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${focused ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                        padding: `12px 0 8px ${prefix ? '28px' : '0'}`,
                        fontFamily: 'var(--font-body)',
                        fontSize: 18,
                        fontWeight: 400,
                        color: '#fff',
                        outline: 'none',
                        resize: 'none',
                        transition: 'border-color 0.3s ease',
                    }}
                />
            ) : (
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    type={type}
                    required={required}
                    min={min}
                    max={max}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${focused ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                        padding: `12px 0 8px ${prefix ? '28px' : '0'}`,
                        fontFamily: 'var(--font-body)',
                        fontSize: 18,
                        fontWeight: 400,
                        color: '#fff',
                        outline: 'none',
                        transition: 'border-color 0.3s ease',
                    }}
                />
            )}
            <div className="ff-underline" />
            <label style={{
                position: 'absolute',
                top: isUp ? -14 : 12,
                left: prefix ? 28 : 0,
                fontFamily: 'var(--font-ui)',
                fontSize: isUp ? 10 : 12,
                fontWeight: 500,
                letterSpacing: isUp ? '0.2em' : '0.15em',
                textTransform: 'uppercase',
                color: isUp ? '#C9A84C' : 'rgba(255,255,255,0.35)',
                pointerEvents: 'none',
                transition: 'all 0.3s ease',
            }}>
                {label} {!required && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>(optional)</span>}
            </label>
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

    const startDisplay = fmt24to12(progress.startTime || '');
    const endDisplay = fmt24to12(progress.endTime || '');

    return (
        <main style={{ background: '#0D0608', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
                <StepIndicator current={3} />

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 3fr',
                    gap: 0,
                    minHeight: 'calc(100vh - 180px)',
                }}>
                    {/* ═══ LEFT: Booking Summary Card ═══ */}
                    <div style={{
                        background: 'linear-gradient(160deg, #1a0408 0%, #0d0608 60%, #0a0305 100%)',
                        borderRight: '1px solid rgba(139,26,43,0.2)',
                        padding: '48px 36px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '4px 0 0 4px',
                    }}>
                        {/* Logo */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Image
                                src="/logo.png"
                                alt="ECF Logo"
                                width={80}
                                height={80}
                                style={{ filter: 'drop-shadow(0 0 20px rgba(139,26,43,0.4))' }}
                            />
                        </div>

                        {/* Gold line */}
                        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', marginBottom: 36 }} />

                        {/* Ground */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>GROUND</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 48, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{progress.groundName || progress.groundId}</div>
                        </div>

                        {/* Date */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>DATE</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, color: '#fff' }}>{formatDatePretty(progress.date || '')}</div>
                        </div>

                        {/* Time */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>TIME</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 600, color: '#fff' }}>{startDisplay} → {endDisplay}</div>
                        </div>

                        {/* Duration */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>DURATION</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: '#8B1A2B' }}>{progress.duration} HOURS</div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '8px 0 28px' }} />

                        {/* Total */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>TOTAL</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 40, fontWeight: 800, color: '#fff' }}>PKR {fmt(progress.basePrice ?? 0)}</div>
                        </div>

                        {/* Advance */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>ADVANCE (30%)</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 600, color: '#C9A84C' }}>PKR {fmt(progress.advanceAmount ?? 0)}</div>
                        </div>

                        {/* At Ground */}
                        <div style={{ marginBottom: 36 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>AT GROUND</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>PKR {fmt(progress.remainingAmount ?? 0)}</div>
                        </div>

                        {/* Bottom tag */}
                        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                                🔒 Secure booking • Instant confirmation
                            </div>
                        </div>
                    </div>

                    {/* ═══ RIGHT: The Form ═══ */}
                    <div style={{ background: '#0d0608', padding: 48 }}>
                        <div style={{
                            fontFamily: 'var(--font-ui)',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.4em',
                            color: '#C9A84C',
                            marginBottom: 40,
                        }}>
                            YOUR DETAILS
                        </div>

                        <form onSubmit={handleSubmit}>
                            <FloatFieldV2
                                label="Full Name"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />

                            <FloatFieldV2
                                label="WhatsApp"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                type="tel"
                                required
                                prefix="🇵🇰"
                            />

                            <FloatFieldV2
                                label="Team Name"
                                name="teamName"
                                value={form.teamName}
                                onChange={handleChange}
                            />

                            <FloatFieldV2
                                label="Players"
                                name="players"
                                value={form.players}
                                onChange={handleChange}
                                type="number"
                                min={1}
                                max={30}
                            />

                            <FloatFieldV2
                                label="Note"
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
                                    borderRadius: 2,
                                    padding: '12px 16px',
                                    color: '#e74c3c',
                                    fontSize: 14,
                                    fontFamily: 'var(--font-body)',
                                    marginBottom: 20,
                                }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-futuristic"
                                style={{ width: '100%' }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                                        </svg>
                                        CREATING BOOKING...
                                    </span>
                                ) : (
                                    <>
                                        CONFIRM BOOKING
                                        <span className="btn-arrow">→</span>
                                    </>
                                )}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                    You&apos;ll receive WhatsApp confirmation
                                </span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Mobile responsive */}
            <style>{`
                @media (max-width: 768px) {
                    main > div > div:last-of-type {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </main>
    );
}

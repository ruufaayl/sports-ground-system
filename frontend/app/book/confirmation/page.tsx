'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { playConfirm } from '../../lib/sounds';
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

function formatDateLong(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Celebration Particles (CSS keyframes, not canvas) ─────────────────────────
function CelebrationParticles() {
    const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => {
        const angle = (i / 30) * 360 + (Math.random() * 20 - 10);
        const speed = 120 + Math.random() * 200;
        const size = 4 + Math.random() * 6;
        const isCrimson = Math.random() > 0.5;
        const delay = Math.random() * 0.3;
        const dx = Math.cos((angle * Math.PI) / 180) * speed;
        const dy = Math.sin((angle * Math.PI) / 180) * speed;
        return { id: i, dx, dy, size, delay, color: isCrimson ? '#8B1A2B' : '#C9A84C' };
    }), []);

    return (
        <div style={{ position: 'fixed', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 50 }}>
            {particles.map((p) => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: p.color,
                        animation: `celebration-particle-${p.id} 2s ease-out ${p.delay}s forwards`,
                        opacity: 0,
                    }}
                />
            ))}
            <style>{particles.map(p => `
                @keyframes celebration-particle-${p.id} {
                    0% { opacity: 1; transform: translate(0, 0); }
                    60% { opacity: 0.8; }
                    100% { opacity: 0; transform: translate(${p.dx}px, ${p.dy + 100}px); }
                }
            `).join('')}</style>
        </div>
    );
}

// ── Animated Checkmark SVG ────────────────────────────────────────────────────
function AnimatedCheckmark() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle
                    cx="40" cy="40" r="36"
                    stroke="#8B1A2B"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="226"
                    strokeDashoffset="226"
                    style={{ animation: 'check-circle 0.6s ease-out 0.8s forwards' }}
                />
                <path
                    d="M24 40 L35 52 L56 28"
                    stroke="#C9A84C"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="50"
                    strokeDashoffset="50"
                    style={{ animation: 'check-mark 0.4s ease-out 1.3s forwards' }}
                />
            </svg>
            <style>{`
                @keyframes check-circle {
                    to { stroke-dashoffset: 0; }
                }
                @keyframes check-mark {
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </div>
    );
}

// ── Letter stagger heading ────────────────────────────────────────────────────
const HEADING_LINE1 = 'BOOKING'.split('');
const HEADING_LINE2 = 'CONFIRMED'.split('');

export default function ConfirmationPage() {
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [groundName, setGroundName] = useState('');
    const [showShimmer, setShowShimmer] = useState(false);

    useEffect(() => {
        const raw = localStorage.getItem('bookingData');
        if (raw) {
            const b = JSON.parse(raw);
            setBooking(b);
            const groundRaw = localStorage.getItem('selectedGround');
            if (groundRaw) {
                const g = JSON.parse(groundRaw);
                setGroundName(g.name || b.ground_id);
            } else {
                setGroundName(b.ground_id);
            }
            playConfirm();
        }
        // Gold shimmer sweep after heading animation completes
        const timer = setTimeout(() => setShowShimmer(true), 2500);
        return () => clearTimeout(timer);
    }, []);

    const handleShare = async () => {
        if (!booking) return;
        const text = `⚽ Booking Confirmed!\n\nGround: ${groundName}\nDate: ${booking.date}\nTime: ${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}\nRef: ${booking.booking_ref}\n\nThe Executive Champions Field • Karachi`;

        if (navigator.share) {
            try {
                await navigator.share({ title: 'ECF Booking', text });
            } catch {
                // user cancelled
            }
        } else {
            try {
                await navigator.clipboard.writeText(text);
                alert('Booking details copied to clipboard!');
            } catch {
                // fallback
            }
        }
    };

    return (
        <main style={{
            background: '#0D0608',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Celebration particles */}
            <CelebrationParticles />

            {/* Center glow */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,26,43,0.12) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 1,
            }} />

            <div style={{ position: 'relative', zIndex: 10, maxWidth: 480, width: '100%' }}>

                {/* ═══ Logo — drops from above with spring ═══ */}
                <motion.div
                    initial={{ y: -120, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
                    style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}
                >
                    <Image
                        src="/logo.png"
                        alt="ECF Logo"
                        width={100}
                        height={100}
                        style={{
                            filter: 'drop-shadow(0 0 20px rgba(139,26,43,0.4))',
                            animation: 'logo-glow-pulse 3s ease-in-out 1s infinite',
                        }}
                    />
                </motion.div>

                {/* ═══ Animated checkmark ═══ */}
                <AnimatedCheckmark />

                {/* ═══ BOOKING CONFIRMED — letter stagger + shimmer ═══ */}
                <div style={{ textAlign: 'center', marginBottom: 12, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.02em' }}>
                        {HEADING_LINE1.map((char, i) => (
                            <motion.span
                                key={i}
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{
                                    duration: 0.5,
                                    delay: 1.6 + i * 0.04,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                style={{
                                    fontFamily: 'var(--font-heading)',
                                    fontSize: 'clamp(36px, 8vw, 56px)',
                                    fontWeight: 800,
                                    color: '#fff',
                                    display: 'inline-block',
                                    lineHeight: 1,
                                }}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.02em' }}>
                        {HEADING_LINE2.map((char, i) => (
                            <motion.span
                                key={i}
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{
                                    duration: 0.5,
                                    delay: 1.6 + (HEADING_LINE1.length + 1) * 0.04 + i * 0.04,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                style={{
                                    fontFamily: 'var(--font-heading)',
                                    fontSize: 'clamp(36px, 8vw, 56px)',
                                    fontWeight: 800,
                                    color: '#fff',
                                    display: 'inline-block',
                                    lineHeight: 1,
                                }}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </div>
                    {/* Gold shimmer sweep */}
                    {showShimmer && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.4) 50%, transparent 100%)',
                            animation: 'shimmer-sweep 1s ease-in-out forwards',
                            pointerEvents: 'none',
                        }} />
                    )}
                </div>

                {/* Booking ref */}
                {booking && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2.4, type: 'spring', stiffness: 200 }}
                        style={{ textAlign: 'center', marginBottom: 36 }}
                    >
                        <div style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: 32,
                            fontWeight: 700,
                            color: '#C9A84C',
                            textShadow: '0 0 20px rgba(201,168,76,0.5)',
                            letterSpacing: '0.05em',
                        }}>
                            {booking.booking_ref}
                        </div>
                    </motion.div>
                )}

                {/* ═══ Booking Details Ticket ═══ */}
                {booking && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.6 }}
                    >
                        <div style={{
                            background: 'rgba(139,26,43,0.06)',
                            border: '1px solid rgba(139,26,43,0.25)',
                            borderRadius: 2,
                            padding: 32,
                            marginBottom: 28,
                        }}>
                            {/* Title */}
                            <div style={{
                                fontFamily: 'var(--font-ui)',
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: '0.35em',
                                color: '#C9A84C',
                                textAlign: 'center',
                                marginBottom: 16,
                            }}>
                                THE EXECUTIVE CHAMPIONS FIELD
                            </div>

                            {/* Gold line */}
                            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', marginBottom: 16 }} />

                            {/* Detail rows */}
                            {[
                                { label: 'GROUND', value: groundName },
                                { label: 'DATE', value: formatDateLong(booking.date) },
                                { label: 'TIME', value: `${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}` },
                                { label: 'DURATION', value: `${booking.duration_hours} Hours` },
                                { label: 'TOTAL', value: `PKR ${fmt(booking.base_price)}` },
                                { label: 'ADVANCE PAID', value: `PKR ${fmt(booking.advance_amount)}`, gold: true },
                                { label: 'REMAINING', value: `PKR ${fmt(booking.remaining_amount)}` },
                            ].map(({ label, value, gold }) => (
                                <div key={label} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 0', borderBottom: '1px solid rgba(139,26,43,0.1)',
                                }}>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#C9A84C', textTransform: 'uppercase' }}>{label}</span>
                                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, color: gold ? '#C9A84C' : '#fff' }}>{value}</span>
                                </div>
                            ))}

                            {/* Gold line */}
                            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '16px 0' }} />

                            {/* Reminders */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                                    📱 WhatsApp confirmation on its way
                                </div>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#C9A84C' }}>
                                    💰 Bring PKR {fmt(booking.remaining_amount)} on arrival
                                </div>
                            </div>
                        </div>

                        {/* ═══ Bottom Action Buttons ═══ */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <button
                                onClick={() => router.push('/book')}
                                className="btn-futuristic"
                                style={{ width: '100%', padding: '0 16px', fontSize: 12 }}
                            >
                                BOOK ANOTHER
                                <span className="btn-arrow">→</span>
                            </button>

                            <button
                                onClick={handleShare}
                                className="btn-futuristic"
                                style={{ width: '100%', padding: '0 16px', fontSize: 12 }}
                            >
                                SHARE
                                <span className="btn-arrow">→</span>
                            </button>
                        </div>

                        {/* Bottom tag */}
                        <div style={{
                            textAlign: 'center',
                            fontFamily: 'var(--font-ui)',
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.3)',
                        }}>
                            The Executive Champions Field • Karachi
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Animations */}
            <style>{`
                @keyframes logo-glow-pulse {
                    0%, 100% { filter: drop-shadow(0 0 20px rgba(201,168,76,0.2)); }
                    50% { filter: drop-shadow(0 0 35px rgba(201,168,76,0.6)) drop-shadow(0 0 15px rgba(139,26,43,0.4)); }
                }
                @keyframes shimmer-sweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </main>
    );
}

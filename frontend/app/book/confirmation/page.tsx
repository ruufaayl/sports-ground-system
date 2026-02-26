'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LogoBadge from '../../components/LogoBadge';
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

// ─── Crimson burst particle canvas ───────────────────────────────────────────
function CelebrationBurst() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const colors = ['#8B1A2B', '#C9A84C', '#FFFFFF', '#6B1422', '#E8C96A'];
        const particles = Array.from({ length: 150 }, (_, i) => {
            const angle = (i / 150) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 2 + Math.random() * 8;
            return {
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 8,
                alpha: 1,
                gravity: 0.12,
            };
        });

        let rafId: number;
        let frame = 0;
        const draw = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                if (p.alpha <= 0) continue;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
                ctx.restore();

                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= 0.99;
                p.rotation += p.rotSpeed;

                if (frame > 60) {
                    p.alpha -= 0.012;
                }

                // Reset for continuous effect
                if (p.alpha <= 0 && frame < 180) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 5;
                    p.x = cx;
                    p.y = cy;
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed - 2;
                    p.alpha = 0.8;
                }
            }

            frame++;
            if (frame < 240) {
                rafId = requestAnimationFrame(draw);
            }
        };
        draw();

        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2 }}
        />
    );
}

export default function ConfirmationPage() {
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [groundName, setGroundName] = useState('');

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
    }, []);

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
            <CelebrationBurst />

            {/* Crimson center glow */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,26,43,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 1,
            }} />

            <div style={{ position: 'relative', zIndex: 10, maxWidth: 580, width: '100%' }}>

                {/* Trophy + heading */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <motion.div
                        initial={{ scale: 0, opacity: 0, y: -60 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                        style={{ fontSize: 72, marginBottom: 16, display: 'block', lineHeight: 1 }}
                    >
                        🏆
                    </motion.div>

                    <div style={{ overflow: 'hidden' }}>
                        <motion.h1
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 'clamp(48px, 10vw, 80px)',
                                letterSpacing: '0.08em',
                                lineHeight: 1,
                                marginBottom: 8,
                                background: 'linear-gradient(90deg, #FFFFFF 0%, #C9A84C 60%, #E8C96A 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            BOOKING CONFIRMED!
                        </motion.h1>
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: "'Inter', sans-serif" }}
                    >
                        Your ground is reserved. See you on the field! ⚽
                    </motion.p>
                </div>

                {booking && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        {/* Booking ref */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', fontFamily: "'Bebas Neue', sans-serif", marginBottom: 8 }}>
                                BOOKING REFERENCE
                            </div>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                                style={{
                                    display: 'inline-block',
                                    background: 'rgba(139,26,43,0.2)',
                                    border: '1px solid rgba(139,26,43,0.6)',
                                    borderRadius: 12,
                                    padding: '14px 36px',
                                    fontFamily: "'Bebas Neue', sans-serif",
                                    fontSize: 32,
                                    color: '#8B1A2B',
                                    letterSpacing: '0.2em',
                                    boxShadow: '0 0 40px rgba(139,26,43,0.35)',
                                }}
                            >
                                {booking.booking_ref}
                            </motion.div>
                        </div>

                        {/* Ticket card */}
                        <div style={{
                            background: 'linear-gradient(150deg, #1a0a0d, #120508)',
                            border: '1px solid rgba(139,26,43,0.35)',
                            borderRadius: 16,
                            padding: 24,
                            marginBottom: 20,
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            {/* Top decorative stripe */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                background: 'linear-gradient(90deg, #8B1A2B, #C9A84C, #8B1A2B)',
                            }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <LogoBadge size={40} />
                                <div>
                                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: '#C9A84C', letterSpacing: '0.1em' }}>
                                        THE EXECUTIVE CHAMPIONS FIELD
                                    </div>
                                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                                        Karachi, Pakistan
                                    </div>
                                </div>
                            </div>

                            {[
                                { label: 'Ground', value: groundName },
                                { label: 'Date', value: booking.date },
                                { label: 'Time', value: `${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}` },
                                { label: 'Duration', value: `${booking.duration_hours} hours` },
                                { label: 'Customer', value: booking.customer_name },
                                { label: 'Phone', value: booking.customer_phone },
                            ].map(({ label, value }) => (
                                <div key={label} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '9px 0',
                                    borderBottom: '1px solid rgba(139,26,43,0.1)',
                                }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>{label}</span>
                                    <span style={{ color: '#fff', fontWeight: 500, fontSize: 14, fontFamily: "'Inter', sans-serif" }}>{value}</span>
                                </div>
                            ))}

                            <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
                                📸 SAVE SCREENSHOT TO KEEP YOUR TICKET
                            </div>
                        </div>

                        {/* Reminders */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                            <div style={{
                                background: 'rgba(139,26,43,0.1)',
                                border: '1px solid rgba(139,26,43,0.25)',
                                borderRadius: 10,
                                padding: '12px 16px',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 14,
                                fontFamily: "'Inter', sans-serif",
                            }}>
                                📱 Your WhatsApp confirmation is on its way
                            </div>
                            <div style={{
                                background: 'rgba(201,168,76,0.08)',
                                border: '1px solid rgba(201,168,76,0.25)',
                                borderRadius: 10,
                                padding: '12px 16px',
                                color: '#C9A84C',
                                fontSize: 14,
                                fontFamily: "'Inter', sans-serif",
                            }}>
                                💰 Remaining PKR {fmt(booking.remaining_amount)} to be paid at the ground
                            </div>
                        </div>

                        <motion.button
                            onClick={() => router.push('/book')}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="btn-crimson"
                            style={{ width: '100%', fontSize: 18, padding: '18px' }}
                        >
                            BOOK ANOTHER GROUND →
                        </motion.button>
                    </motion.div>
                )}
            </div>
        </main>
    );
}

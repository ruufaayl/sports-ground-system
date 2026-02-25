'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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

// ──────────────────────────────────────────────────────────
// Confetti particle canvas
// ──────────────────────────────────────────────────────────
function Confetti() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#00ff88', '#0088ff', '#ffffff', '#ffcc00', '#ff6688'];
        const particles = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 4,
            vy: 2 + Math.random() * 4,
            size: 4 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 6,
            alpha: 1,
        }));

        let animId: number;
        function draw() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
                ctx.restore();
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;
                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                    p.alpha = 1;
                }
                if (p.y > canvas.height * 0.7) p.alpha -= 0.01;
            }
            animId = requestAnimationFrame(draw);
        }
        draw();
        return () => cancelAnimationFrame(animId);
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
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

            // Get human readable ground name
            const groundRaw = localStorage.getItem('selectedGround');
            if (groundRaw) {
                const g = JSON.parse(groundRaw);
                setGroundName(g.name || b.ground_id);
            } else {
                setGroundName(b.ground_id);
            }
        }
    }, []);

    return (
        <main style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
            <Confetti />

            {/* Background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
                <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%)' }} />
            </div>

            <div style={{ position: 'relative', zIndex: 10, maxWidth: 560, width: '100%' }}>
                {/* ✓ Checkmark */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    style={{ textAlign: 'center', marginBottom: 28 }}
                >
                    <div style={{
                        width: 96, height: 96, borderRadius: '50%', margin: '0 auto 20px',
                        background: 'rgba(0,255,136,0.15)',
                        border: '2px solid #00ff88',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 60px rgba(0,255,136,0.5)',
                    }}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <motion.path
                                d="M10 24 L20 34 L38 14"
                                stroke="#00ff88" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            />
                        </svg>
                    </div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        style={{ fontSize: 36, fontWeight: 900, color: '#00ff88', textShadow: '0 0 30px rgba(0,255,136,0.5)', marginBottom: 8 }}
                    >
                        BOOKING CONFIRMED!
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        style={{ color: '#888', fontSize: 15 }}>
                        Your ground is reserved. See you on the field! ⚽
                    </motion.p>
                </motion.div>

                {booking && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        {/* Booking Ref */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: 12, color: '#666', letterSpacing: '2px', marginBottom: 8 }}>BOOKING REFERENCE</div>
                            <div style={{
                                display: 'inline-block', background: 'rgba(0,255,136,0.1)',
                                border: '1px solid rgba(0,255,136,0.5)', borderRadius: 10,
                                padding: '12px 32px', fontSize: 28, fontWeight: 900,
                                color: '#00ff88', letterSpacing: '4px',
                                boxShadow: '0 0 30px rgba(0,255,136,0.25)',
                            }}>
                                {booking.booking_ref}
                            </div>
                        </div>

                        {/* Details card */}
                        <div style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                            {[
                                { label: 'Ground', value: groundName },
                                { label: 'Date', value: booking.date },
                                { label: 'Time', value: `${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}` },
                                { label: 'Duration', value: `${booking.duration_hours} hours` },
                                { label: 'Customer', value: booking.customer_name },
                                { label: 'Phone', value: booking.customer_phone },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(0,255,136,0.06)' }}>
                                    <span style={{ color: '#888', fontSize: 14 }}>{label}</span>
                                    <span style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Reminders */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                            <div style={{ background: 'rgba(0,136,255,0.08)', border: '1px solid rgba(0,136,255,0.25)', borderRadius: 8, padding: '12px 16px', color: '#60aaff', fontSize: 14 }}>
                                📱 Your confirmation will be sent to your WhatsApp shortly.
                            </div>
                            <div style={{ background: 'rgba(255,204,0,0.08)', border: '1px solid rgba(255,204,0,0.25)', borderRadius: 8, padding: '12px 16px', color: '#ffd700', fontSize: 14 }}>
                                💰 Remaining PKR {fmt(booking.remaining_amount)} to be paid at the ground.
                            </div>
                        </div>

                        <button
                            className="neon-btn"
                            onClick={() => router.push('/book')}
                            style={{ width: '100%', fontSize: 16 }}
                        >
                            BOOK ANOTHER GROUND →
                        </button>
                    </motion.div>
                )}
            </div>
        </main>
    );
}

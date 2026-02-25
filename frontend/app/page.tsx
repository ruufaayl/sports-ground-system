'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; color: string;
    }[] = [];

    const colors = ['#00ff88', '#0088ff', '#00ff88aa', '#0088ffaa'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.8 - 0.2,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random(),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.002;
        if (p.y < -10 || p.alpha <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 10;
          p.alpha = Math.random() * 0.8 + 0.2;
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }
    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <main
      style={{ background: '#0a0a0f', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      />

      {/* Animated gradient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        <div
          style={{
            position: 'absolute', width: 600, height: 600,
            borderRadius: '50%', top: '-200px', left: '-150px',
            background: 'radial-gradient(circle, rgba(0,255,136,0.12) 0%, transparent 70%)',
            animation: 'orbFloat 8s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute', width: 500, height: 500,
            borderRadius: '50%', bottom: '-150px', right: '-100px',
            background: 'radial-gradient(circle, rgba(0,136,255,0.12) 0%, transparent 70%)',
            animation: 'orbFloat 10s ease-in-out infinite reverse',
          }}
        />
        <div
          style={{
            position: 'absolute', width: 400, height: 400,
            borderRadius: '50%', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'radial-gradient(circle, rgba(0,255,136,0.06) 0%, transparent 70%)',
            animation: 'orbFloat 12s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* Hero content */}
      <div
        style={{
          position: 'relative', zIndex: 10,
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid rgba(0,255,136,0.3)',
            borderRadius: 999, padding: '6px 18px', marginBottom: 32,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 8px #00ff88' }} />
          <span style={{ color: '#00ff88', fontSize: 13, fontWeight: 600, letterSpacing: '1px' }}>
            LIVE — ALL GROUNDS AVAILABLE
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{
            fontSize: 'clamp(48px, 10vw, 96px)',
            fontWeight: 900,
            letterSpacing: '-2px',
            lineHeight: 1.1,
            marginBottom: 24,
          }}
        >
          <span style={{ color: '#fff' }}>BOOK YOUR</span>
          <br />
          <span
            style={{
              color: '#00ff88',
              textShadow: '0 0 40px rgba(0,255,136,0.7), 0 0 80px rgba(0,255,136,0.3)',
            }}
          >
            GROUND
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{
            fontSize: 'clamp(16px, 3vw, 22px)',
            color: '#aaa',
            marginBottom: 48,
            maxWidth: 600,
            lineHeight: 1.6,
          }}
        >
          5 Premium Grounds &nbsp;•&nbsp; 24/7 Availability &nbsp;•&nbsp; Instant Confirmation
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/book')}
          style={{
            background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
            color: '#000',
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '2px',
            padding: '18px 56px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 0 40px rgba(0,255,136,0.5)',
            marginBottom: 56,
          }}
        >
          BOOK NOW →
        </motion.button>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {[
            { label: 'Grounds', value: '5' },
            { label: 'Availability', value: '24/7' },
            { label: 'Rate from', value: 'PKR 2,000/hr' },
            { label: 'Confirmation', value: 'Instant' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#00ff88' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#666', letterSpacing: '1px', marginTop: 4 }}>
                {stat.label.toUpperCase()}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom ticker strip */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'rgba(0,255,136,0.08)',
          borderTop: '1px solid rgba(0,255,136,0.2)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden', height: 40,
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', height: '100%',
            animation: 'none',
            whiteSpace: 'nowrap',
            padding: '0 20px',
            gap: 32,
            color: '#00ff88',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '1px',
          }}
        >
          {['G1', 'G2', 'G3', 'G4', 'G5', 'Available 24/7', 'PKR 2,000–4,200/hr',
            'Full Size & Smaller Grounds', 'WhatsApp Booking', 'Instant Confirmation',
            'G1', 'G2', 'G3', 'G4', 'G5'].map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'rgba(0,255,136,0.4)' }}>●</span>
                {item}
              </span>
            ))}
        </div>
      </div>
    </main>
  );
}

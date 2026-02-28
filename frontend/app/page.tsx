'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import FifaCard from './components/FifaCard';
import { playSelect, setSoundEnabled } from './lib/sounds';

// ── Field lines canvas ────────────────────────────────────────────────────────
function FieldLines() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const w = c.width, h = c.height;
    const s = 'rgba(139,26,43,0.07)';
    ctx.strokeStyle = s; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.strokeRect(w * 0.1, h * 0.08, w * 0.8, h * 0.84);
    ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2); ctx.fillStyle = s; ctx.fill();
    const pb = { w: w * 0.4, h: h * 0.18 };
    ctx.strokeRect((w - pb.w) / 2, h * 0.08, pb.w, pb.h);
    ctx.strokeRect((w - pb.w) / 2, h * 0.92 - pb.h, pb.w, pb.h);
    const ca = 30;
    for (const [cx2, cy2, sa, ea] of [
      [w * 0.1, h * 0.08, 0, Math.PI / 2],
      [w * 0.9, h * 0.08, Math.PI / 2, Math.PI],
      [w * 0.1, h * 0.92, (Math.PI * 3) / 2, Math.PI * 2],
      [w * 0.9, h * 0.92, Math.PI, (Math.PI * 3) / 2],
    ] as [number, number, number, number][]) {
      ctx.beginPath(); ctx.arc(cx2, cy2, ca, sa, ea); ctx.stroke();
    }
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />;
}

// ── Player Cards Showcase (6 cards, lazy loaded) ──────────────────────────────
const TOTAL_PLAYERS = 111 // Adjusted to 111 to include all files (count is 72, but highest number is 111)
const POSITIONS: {
  top?: string; bottom?: string; left?: string; right?: string;
  rotate: string; scale: number; floatDuration: string; floatDelay: string;
}[] = [
    { top: '8%', left: '3%', rotate: '-15deg', scale: 0.85, floatDuration: '3.8s', floatDelay: '0s' },
    { top: '5%', left: '18%', rotate: '-5deg', scale: 0.9, floatDuration: '4.5s', floatDelay: '0.5s' },
    { top: '10%', right: '3%', rotate: '15deg', scale: 0.85, floatDuration: '3.2s', floatDelay: '1s' },
    { top: '5%', right: '18%', rotate: '5deg', scale: 0.9, floatDuration: '5s', floatDelay: '0.8s' },
    { bottom: '12%', left: '5%', rotate: '-10deg', scale: 0.8, floatDuration: '4.2s', floatDelay: '0.3s' },
    { bottom: '12%', right: '5%', rotate: '10deg', scale: 0.8, floatDuration: '3.6s', floatDelay: '1.2s' },
  ];

const getRandomPlayers = (count: number): number[] => {
  const all = Array.from({ length: TOTAL_PLAYERS }, (_, i) => i + 1)
  const shuffled = all.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function PlayerCardsShowcase() {
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>(
    () => getRandomPlayers(6)
  )
  const [visible, setVisible] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSelectedPlayers(getRandomPlayers(6))
        setVisible(true);
      }, 600);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (selectedPlayers.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }} className="hide-mobile">
      {POSITIONS.map((pos, i) => {
        const num = selectedPlayers[i];
        if (!num) return null;
        const isHovered = hoveredIdx === i;
        const otherHovered = hoveredIdx !== null && !isHovered;

        const getPlayerPath = (n: number): string => {
          return `/players/player%20(${n}).png`
        }

        return (
          <div
            key={`pos-${i}`}
            className="player-card"
            style={{
              position: 'absolute',
              pointerEvents: 'auto',
              zIndex: isHovered ? 100 : 5,
              animation: `float-card-${i % 3} ${pos.floatDuration} ease-in-out ${pos.floatDelay} infinite alternate`,
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.5s ease',
              ...Object.fromEntries(
                Object.entries(pos)
                  .filter(([k]) => ['top', 'bottom', 'left', 'right'].includes(k))
              ),
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div style={{
              transform: `rotate(${pos.rotate}) scale(${pos.scale * (isHovered ? 1.15 : 1)})`,
              filter: otherHovered ? 'blur(2px) brightness(0.7)' : 'none',
              transition: 'transform 0.4s ease, filter 0.3s ease',
            }}>
              <FifaCard
                imagePath={getPlayerPath(num)}
                index={num - 1}
                loadingStrategy={i < 2 ? 'eager' : 'lazy'}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Char heading animation helper ─────────────────────────────────────────────
const LINE1 = 'THE EXECUTIVE'.split('');
const LINE2 = 'CHAMPIONS FIELD'.split('');

export default function HomePage() {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);

  const handleBook = () => { playSelect(); router.push('/book'); };
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  return (
    <main
      style={{
        background: 'radial-gradient(ellipse at center, #1a0a0d 0%, #0D0608 70%)',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FieldLines />

      <div style={{
        position: 'fixed', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,26,43,0.09) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      <PlayerCardsShowcase />

      {/* ═══ Hero content ═══ */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '40px 20px' }}>

        {/* Logo — priority since above the fold */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 120 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}
        >
          <Image
            src="/logo.png"
            alt="ECF Logo"
            width={140}
            height={140}
            priority
            style={{
              animation: 'spin-slow 20s linear infinite',
              cursor: 'none',
              filter: 'drop-shadow(0 4px 20px rgba(139,26,43,0.4))',
              willChange: 'transform',
            }}
          />
        </motion.div>

        {/* Heading line 1: THE EXECUTIVE */}
        <div style={{ overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.01em' }}>
            {LINE1.map((char, i) => (
              <motion.span
                key={i}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--font-hero)",
                  fontSize: 'clamp(52px, 10vw, 120px)',
                  color: '#FFFFFF',
                  letterSpacing: '0.1em',
                  lineHeight: 1,
                  display: 'inline-block',
                  willChange: 'transform',
                  textShadow: '0 0 80px rgba(255,255,255,0.3), 2px 2px 0 rgba(139,26,43,0.5)',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Heading line 2: CHAMPIONS FIELD */}
        <div style={{ overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.01em' }}>
            {LINE2.map((char, i) => (
              <motion.span
                key={i}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--font-hero)",
                  fontSize: 'clamp(52px, 10vw, 120px)',
                  color: '#8B1A2B',
                  letterSpacing: '0.1em',
                  lineHeight: 1,
                  display: 'inline-block',
                  willChange: 'transform',
                  textShadow: '0 0 40px rgba(139,26,43,0.8), 0 0 80px rgba(139,26,43,0.4)',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.25em',
            color: 'rgba(255,255,255,0.75)',
            marginBottom: 44,
            textTransform: 'uppercase',
          }}
        >
          5 Premium Grounds &nbsp;•&nbsp; Karachi &nbsp;•&nbsp; 24/7 Open
        </motion.p>

        {/* BOOK YOUR GROUND — futuristic button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.6 }}
          style={{ marginBottom: 56 }}
        >
          <button
            onClick={handleBook}
            className="btn-futuristic"
            style={{ width: 260 }}
          >
            BOOK YOUR GROUND
            <span className="btn-arrow">→</span>
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <div style={{
            width: 20, height: 20,
            borderBottom: '2px solid rgba(255,255,255,0.4)',
            borderRight: '2px solid rgba(255,255,255,0.4)',
            transform: 'rotate(45deg)',
            animation: 'bounce-down 1.5s ease-in-out infinite',
          }} />
        </motion.div>
      </div>

      {/* Bottom marquee strip */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(13,6,8,0.92)',
        borderTop: '1px solid rgba(139,26,43,0.5)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden', height: 40,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', height: '100%',
          whiteSpace: 'nowrap',
          animation: 'marquee-scroll 24s linear infinite',
          willChange: 'transform',
        }}>
          {[
            '★ G1 AVAILABLE', '★ G2 AVAILABLE', '★ G3 AVAILABLE',
            '★ G4 AVAILABLE', '★ G5 AVAILABLE',
            '★ 5 PREMIUM GROUNDS', '★ KARACHI, PAKISTAN',
            '★ 24/7 OPEN', '★ PKR 2000-4200/HR', '★ BOOK NOW',
            '★ G1 AVAILABLE', '★ G2 AVAILABLE', '★ G3 AVAILABLE',
            '★ G4 AVAILABLE', '★ G5 AVAILABLE',
            '★ 5 PREMIUM GROUNDS', '★ KARACHI, PAKISTAN',
            '★ 24/7 OPEN', '★ PKR 2000-4200/HR', '★ BOOK NOW',
          ].map((item, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: i % 2 === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(201,168,76,0.85)',
              paddingRight: 28,
            }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .hide-mobile { display: none !important; } }
        @keyframes float-card-0 { from { transform: translateY(0); } to { transform: translateY(-12px); } }
        @keyframes float-card-1 { from { transform: translateY(-6px); } to { transform: translateY(8px); } }
        @keyframes float-card-2 { from { transform: translateY(-4px); } to { transform: translateY(10px); } }
      `}</style>
    </main>
  );
}

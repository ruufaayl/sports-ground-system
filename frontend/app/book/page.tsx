'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { PricingRule } from '../../lib/types';
import StepIndicator from '../components/StepIndicator';
import { playSelect, playTick } from '../lib/sounds';

// ── Fallback data (unchanged UUIDs) ──────────────────────────────────────────
const FALLBACK_GROUNDS = [
    {
        id: 'fcc2caea-879c-47ff-b5ef-08216cc5a69c', name: 'G1', size: 'full', pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[]
    },
    {
        id: 'bc2368dd-2a56-42c4-a674-e29cdc837f77', name: 'G2', size: 'full', pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[]
    },
    {
        id: 'e73b15fb-6f7e-455d-ad83-b9d00baf2cff', name: 'G3', size: 'full', pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[]
    },
    {
        id: 'd6667c0b-3348-4ced-9172-25252834aef6', name: 'G4', size: 'full', pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[]
    },
    {
        id: 'dcb5a29f-cb46-431f-b259-9add8319f8df', name: 'G5', size: 'smaller', pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 1800 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 3000 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2000 },
        ] as PricingRule[]
    },
] as { id: string; name: string; size: string; pricing_rules: PricingRule[] }[];

function getPrices(rules: PricingRule[]) {
    const wdMin = Math.min(
        rules.find(r => r.day_type === 'weekday' && r.slot_type === 'offpeak')?.price_per_hour ?? 9999,
        rules.find(r => r.day_type === 'weekday' && r.slot_type === 'peak')?.price_per_hour ?? 9999,
    );
    const weMin = Math.min(
        rules.find(r => r.day_type === 'weekend' && r.slot_type === 'offpeak')?.price_per_hour ?? 9999,
        rules.find(r => r.day_type === 'weekend' && r.slot_type === 'peak')?.price_per_hour ?? 9999,
    );
    return { wdMin, weMin };
}
function fmt(n: number) { return n.toLocaleString('en-PK'); }

// ── Pitch Card ─────────────────────────────────────────────────────────────────
function PitchCard({
    ground, isSelected, isBlurred, onSelect, index,
}: {
    ground: typeof FALLBACK_GROUNDS[number];
    isSelected: boolean; isBlurred: boolean;
    onSelect: () => void; index: number;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [hovering, setHovering] = useState(false);
    const isFullSize = ground.size === 'full' || ground.size === 'Full Size';
    const { wdMin, weMin } = getPrices(ground.pricing_rules);
    const capacity = isFullSize ? 22 : 14;

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current; if (!card) return;
        const rect = card.getBoundingClientRect();
        const rotX = Math.max(-14, Math.min(14, ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -14));
        const rotY = Math.max(-14, Math.min(14, ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 14));
        setTilt({ x: rotX, y: rotY });
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: 1000 }}
        >
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovering(false); }}
                onMouseEnter={() => { setHovering(true); playTick(); }}
                onClick={() => { playSelect(); onSelect(); }}
                style={{
                    width: 280,
                    height: 400,
                    borderRadius: 16,
                    cursor: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${hovering || isSelected ? 18 : 0}px)`,
                    transformStyle: 'preserve-3d',
                    transition: hovering ? 'transform 0.05s ease' : 'transform 0.5s ease, box-shadow 0.3s ease, filter 0.3s ease',
                    border: isSelected ? '2px solid #8B1A2B' : '1px solid rgba(201,168,76,0.1)',
                    boxShadow: isSelected ? '0 0 40px rgba(139,26,43,0.6), 0 20px 60px rgba(0,0,0,0.6)' : hovering ? '0 20px 60px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.4)',
                    filter: isBlurred ? 'blur(1px) brightness(0.55)' : 'none',
                    willChange: 'transform',
                }}
            >
                {/* Grass stripes */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `repeating-linear-gradient(180deg, #0a1f0a 0px, #0a1f0a 20px, #0d2510 20px, #0d2510 40px)`,
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.4) 100%)' }} />

                {/* Pitch lines SVG */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: hovering ? 'scale(1.02)' : 'scale(1)', transition: 'transform 0.3s ease' }} viewBox="0 0 280 400" fill="none">
                    <rect x="12" y="12" width="256" height="376" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                    <line x1="12" y1="200" x2="268" y2="200" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
                    <circle cx="140" cy="200" r="46" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                    <circle cx="140" cy="200" r="3" fill="rgba(255,255,255,0.4)" />
                    <rect x="70" y="12" width="140" height="72" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                    <rect x="70" y="316" width="140" height="72" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                    <rect x="106" y="12" width="68" height="30" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                    <rect x="106" y="358" width="68" height="30" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                </svg>

                {/* Ground name — painted on pitch */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 86, color: hovering ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)', letterSpacing: '0.03em', lineHeight: 1, userSelect: 'none', transition: 'color 0.3s ease', zIndex: 2 }}>
                    {ground.name}
                </div>

                {/* Top-left label */}
                <div style={{ position: 'absolute', top: 18, left: 18, fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 20, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em', zIndex: 5, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {ground.name}
                </div>

                {/* ARTIFICIAL TURF badge top-right */}
                <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(45,90,39,0.85)', border: '1px solid rgba(100,180,80,0.4)', borderRadius: 4, padding: '3px 8px', zIndex: 5 }}>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 8, fontWeight: 700, color: 'rgba(150,220,120,0.9)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ARTIFICIAL TURF</div>
                </div>

                {/* Stadium lights on hover */}
                {hovering && [{ top: 16, left: 16 }, { top: 16, right: 16 }, { bottom: 16, left: 16 }, { bottom: 16, right: 16 }].map((pos, j) => (
                    <div key={j} style={{ position: 'absolute', width: 9, height: 9, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 14px rgba(201,168,76,0.9), 0 0 28px rgba(201,168,76,0.5)', zIndex: 6, animation: 'gold-pulse 1s ease-in-out infinite', ...pos }} />
                ))}

                {/* Hover pricing */}
                <motion.div
                    animate={{ opacity: hovering ? 1 : 0, y: hovering ? 0 : 16 }}
                    transition={{ duration: 0.22 }}
                    style={{ position: 'absolute', bottom: 58, left: 0, right: 0, textAlign: 'center', zIndex: 6, pointerEvents: 'none' }}
                >
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 600, color: '#C9A84C', textShadow: '0 0 12px rgba(201,168,76,0.7)' }}>WEEKDAY FROM PKR {fmt(wdMin)}</div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 500, color: 'rgba(201,168,76,0.75)', marginTop: 2 }}>WEEKEND FROM PKR {fmt(weMin)}</div>
                </motion.div>

                {/* Bottom info bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px 14px', background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', zIndex: 5 }}>
                    {/* Capacity */}
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.06em', marginBottom: 6 }}>
                        CAPACITY: {capacity} PLAYERS
                    </div>
                    {/* Size pill */}
                    <div style={{ display: 'inline-block', background: isFullSize ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.12)', border: `1px solid ${isFullSize ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.25)'}`, borderRadius: 999, padding: '4px 12px', fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: isFullSize ? '#C9A84C' : 'rgba(255,255,255,0.75)', letterSpacing: '0.1em' }}>
                        {isFullSize ? 'FULL SIZE • 100×65m' : 'STANDARD • 80×50m'}
                    </div>
                </div>

                {/* Gold corner brackets on selection */}
                {isSelected && [
                    { top: 6, left: 6, borderTop: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C' },
                    { top: 6, right: 6, borderTop: '2px solid #C9A84C', borderRight: '2px solid #C9A84C' },
                    { bottom: 6, left: 6, borderBottom: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C' },
                    { bottom: 6, right: 6, borderBottom: '2px solid #C9A84C', borderRight: '2px solid #C9A84C' },
                ].map((s, j) => (
                    <div key={j} style={{ position: 'absolute', width: 16, height: 16, zIndex: 7, ...s }} />
                ))}
            </div>
        </motion.div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BookPage() {
    const router = useRouter();
    const [grounds, setGrounds] = useState(FALLBACK_GROUNDS as typeof FALLBACK_GROUNDS);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        fetch(`${base}/api/grounds`)
            .then(r => r.json())
            .then(data => { if (data?.grounds?.length) setGrounds(data.grounds); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSelect = (ground: typeof grounds[number]) => {
        setSelectedId(ground.id);
        localStorage.setItem('selectedGround', JSON.stringify({ id: ground.id, name: ground.name, size: ground.size, pricing_rules: ground.pricing_rules }));
    };

    const handleContinue = () => {
        if (!selectedId) return;
        playSelect();
        router.push('/book/schedule');
    };

    return (
        <main style={{ background: '#0D0608', minHeight: '100vh', padding: '40px 20px 80px', position: 'relative' }}>
            <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <StepIndicator current={1} />

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <img src="/logo.png" alt="ECF" style={{ width: 52, height: 'auto' }} />
                    </div>
                    <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 'clamp(28px, 5vw, 48px)', color: '#fff', letterSpacing: '0.06em', marginBottom: 8 }}>
                        SELECT YOUR GROUND
                    </h1>
                    <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6 }}>
                        {loading ? 'Loading grounds...' : 'Click a pitch to select'}
                    </p>
                </motion.div>

                {/* Row 1 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
                    {grounds.slice(0, 3).map((g, i) => (
                        <PitchCard key={g.id} ground={g} isSelected={selectedId === g.id} isBlurred={selectedId !== null && selectedId !== g.id} onSelect={() => handleSelect(g)} index={i} />
                    ))}
                </div>

                {/* Row 2 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 40 }}>
                    {grounds.slice(3).map((g, i) => (
                        <PitchCard key={g.id} ground={g} isSelected={selectedId === g.id} isBlurred={selectedId !== null && selectedId !== g.id} onSelect={() => handleSelect(g)} index={i + 3} />
                    ))}
                </div>

                {/* Pricing hint */}
                <div style={{ textAlign: 'center', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontSize: 15, marginBottom: 32 }}>
                    WEEKDAY: PKR 2,500 — 3,500/HR &nbsp;•&nbsp; WEEKEND: PKR 2,800 — 4,200/HR
                </div>

                {/* Continue */}
                <AnimatePresence>
                    {selectedId && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ display: 'flex', justifyContent: 'center' }}>
                            <motion.button onClick={handleContinue} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '16px 56px', background: '#8B1A2B', border: '1px solid #C9A84C', borderRadius: 999, color: '#fff', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '0.1em', cursor: 'none', boxShadow: '0 0 30px rgba(139,26,43,0.4)', transition: 'background 0.3s, color 0.3s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#C9A84C'; e.currentTarget.style.color = '#6B1422'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#8B1A2B'; e.currentTarget.style.color = '#fff'; }}>
                                CONTINUE →
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}

// Re-export StepIndicator for legacy page imports
export { default as StepIndicator } from '../components/StepIndicator';

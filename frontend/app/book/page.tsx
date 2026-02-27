'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { PricingRule } from '../../lib/types';
import StepIndicator from '../components/StepIndicator';
import { playSelect, playTick } from '../lib/sounds';

// ── Fallback data ────────────────────────────────────────────────────────────
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
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 2200 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2000 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2200 },
        ] as PricingRule[]
    },
] as { id: string; name: string; size: string; pricing_rules: PricingRule[] }[];

function getRates(rules: PricingRule[]) {
    return {
        wdPeak: rules.find(r => r.day_type === 'weekday' && r.slot_type === 'peak')?.price_per_hour ?? 0,
        wdOff: rules.find(r => r.day_type === 'weekday' && r.slot_type === 'offpeak')?.price_per_hour ?? 0,
        wePeak: rules.find(r => r.day_type === 'weekend' && r.slot_type === 'peak')?.price_per_hour ?? 0,
        weOff: rules.find(r => r.day_type === 'weekend' && r.slot_type === 'offpeak')?.price_per_hour ?? 0,
    };
}
function fmt(n: number) { return n.toLocaleString('en-PK'); }

// ── Slot type ─────────────────────────────────────────────────────────────────
interface AvailSlot {
    hour: number;
    available: boolean;
}

// ── Availability Bar ──────────────────────────────────────────────────────────
function AvailabilityBar({ slots }: { slots: AvailSlot[] }) {
    const hoursToShow = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    const currentHour = new Date().getHours();

    return (
        <div style={{ padding: '8px 0 2px 0' }}>
            <div style={{
                fontSize: 9, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.2em', marginBottom: 6,
                fontFamily: 'var(--font-ui)', fontWeight: 600,
            }}>
                TODAY&apos;S AVAILABILITY
            </div>
            <div style={{
                display: 'flex', gap: 1.5, height: 8,
                borderRadius: 4, overflow: 'hidden',
            }}>
                {hoursToShow.map(hour => {
                    const slot = slots.find(s => s.hour === hour);
                    const isPast = hour < currentHour;
                    const isBooked = slot ? !slot.available : false;

                    let bg = 'rgba(0,166,81,0.6)'; // available green
                    if (isPast) bg = 'rgba(255,255,255,0.08)'; // past grey
                    else if (isBooked) bg = 'rgba(139,26,43,0.8)'; // booked crimson

                    return (
                        <div
                            key={hour}
                            style={{ flex: 1, background: bg, borderRadius: 1 }}
                            title={`${hour}:00 - ${isBooked ? 'Booked' : isPast ? 'Past' : 'Available'}`}
                        />
                    );
                })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-ui)' }}>6AM</span>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-ui)' }}>12AM</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(0,166,81,0.6)' }} />
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)' }}>Free</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(139,26,43,0.8)' }} />
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)' }}>Booked</span>
                </div>
            </div>
        </div>
    );
}

// ── Slots Badge ───────────────────────────────────────────────────────────────
function SlotsBadge({ slots }: { slots: AvailSlot[] }) {
    const currentHour = new Date().getHours();
    const availableCount = slots.filter(s => s.available && s.hour >= currentHour && s.hour >= 6).length;

    let bg: string, border: string, color: string, text: string;
    if (availableCount === 0) {
        bg = 'rgba(139,26,43,0.25)'; border = 'rgba(139,26,43,0.5)'; color = '#e74c3c'; text = 'Fully booked';
    } else if (availableCount <= 3) {
        bg = 'rgba(139,26,43,0.2)'; border = 'rgba(139,26,43,0.4)'; color = '#e74c3c'; text = `${availableCount} slots left`;
    } else if (availableCount <= 8) {
        bg = 'rgba(201,168,76,0.2)'; border = 'rgba(201,168,76,0.4)'; color = '#C9A84C'; text = `${availableCount} slots free`;
    } else {
        bg = 'rgba(0,166,81,0.2)'; border = 'rgba(0,166,81,0.4)'; color = '#00a651'; text = `${availableCount} slots free`;
    }

    return (
        <div style={{
            position: 'absolute', top: 14, right: 14,
            background: bg, border: `1px solid ${border}`,
            borderRadius: 20, padding: '3px 8px', zIndex: 5,
        }}>
            <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
                color, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>
                {text}
            </div>
        </div>
    );
}

// ── Pitch Card ────────────────────────────────────────────────────────────────
function PitchCard({
    ground, isSelected, isBlurred, onSelect, index, availability,
}: {
    ground: typeof FALLBACK_GROUNDS[number];
    isSelected: boolean; isBlurred: boolean;
    onSelect: () => void; index: number;
    availability: AvailSlot[];
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [hovering, setHovering] = useState(false);
    const isFullSize = ground.size === 'full' || ground.size === 'Full Size';
    const rates = getRates(ground.pricing_rules);
    const format = isFullSize ? '6v6' : '5v5';
    const capacity = isFullSize ? 12 : 10;
    const hasAvailability = availability.length > 0;

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
                    height: hasAvailability ? 430 : 400,
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
                <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 86, color: hovering ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)', letterSpacing: '0.03em', lineHeight: 1, userSelect: 'none', transition: 'color 0.3s ease', zIndex: 2 }}>
                    {ground.name}
                </div>

                {/* Top-left label */}
                <div style={{ position: 'absolute', top: 18, left: 18, fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 20, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em', zIndex: 5, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {ground.name}
                </div>

                {/* Slots badge — top right */}
                {hasAvailability ? (
                    <SlotsBadge slots={availability} />
                ) : (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(45,90,39,0.85)', border: '1px solid rgba(100,180,80,0.4)', borderRadius: 4, padding: '3px 8px', zIndex: 5 }}>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, color: 'rgba(150,220,120,0.9)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ARTIFICIAL TURF</div>
                    </div>
                )}

                {/* Stadium lights on hover */}
                {hovering && [{ top: 16, left: 16 }, { top: 16, right: 16 }, { bottom: 16, left: 16 }, { bottom: 16, right: 16 }].map((pos, j) => (
                    <div key={j} style={{ position: 'absolute', width: 9, height: 9, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 14px rgba(201,168,76,0.9), 0 0 28px rgba(201,168,76,0.5)', zIndex: 6, animation: 'gold-pulse 1s ease-in-out infinite', ...pos }} />
                ))}

                {/* Bottom info: format + capacity + availability bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px 14px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4), transparent)', zIndex: 5 }}>
                    {hasAvailability && <AvailabilityBar slots={availability} />}
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 800, color: '#C9A84C', letterSpacing: '0.02em' }}>
                        {format}
                    </div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
                        CAPACITY {capacity}
                    </div>
                </div>

                {/* Hover rates panel — slides up from bottom */}
                <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    background: '#1a0408',
                    padding: '16px 14px',
                    zIndex: 8,
                    transform: hovering ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.3s ease',
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {/* Weekday */}
                        <div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#C9A84C', marginBottom: 6 }}>WEEKDAY</div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: '#fff', marginBottom: 3 }}>Peak PKR {fmt(rates.wdPeak)}/hr</div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Off-Peak PKR {fmt(rates.wdOff)}/hr</div>
                        </div>
                        {/* Weekend */}
                        <div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#C9A84C', marginBottom: 6 }}>WEEKEND</div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: '#fff', marginBottom: 3 }}>Peak PKR {fmt(rates.wePeak)}/hr</div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Off-Peak PKR {fmt(rates.weOff)}/hr</div>
                        </div>
                    </div>
                </div>

                {/* Gold corner brackets on selection */}
                {isSelected && [
                    { top: 6, left: 6, borderTop: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C' },
                    { top: 6, right: 6, borderTop: '2px solid #C9A84C', borderRight: '2px solid #C9A84C' },
                    { bottom: 6, left: 6, borderBottom: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C' },
                    { bottom: 6, right: 6, borderBottom: '2px solid #C9A84C', borderRight: '2px solid #C9A84C' },
                ].map((s, j) => (
                    <div key={j} style={{ position: 'absolute', width: 16, height: 16, zIndex: 9, ...s }} />
                ))}
            </div>
        </motion.div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BookPage() {
    const router = useRouter();
    const [grounds, setGrounds] = useState(FALLBACK_GROUNDS);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [groundAvailability, setGroundAvailability] = useState<Record<string, AvailSlot[]>>({});

    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        fetch(`${base}/api/grounds`)
            .then(r => r.json())
            .then(data => { if (data?.grounds?.length) setGrounds(data.grounds); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Fetch today's availability for all grounds
    useEffect(() => {
        if (!grounds || grounds.length === 0) return;
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const today = new Date().toISOString().split('T')[0];

        Promise.all(
            grounds.map(async (ground) => {
                try {
                    const res = await fetch(
                        `${base}/api/availability/ground-slots?ground_id=${ground.id}&date=${today}`
                    );
                    const data = await res.json();
                    return { name: ground.name, slots: (data.slots || []) as AvailSlot[] };
                } catch {
                    return { name: ground.name, slots: [] as AvailSlot[] };
                }
            })
        ).then(results => {
            const map: Record<string, AvailSlot[]> = {};
            results.forEach(r => { map[r.name] = r.slots; });
            setGroundAvailability(map);
        });
    }, [grounds]);

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
        <main className="book-page-main" style={{ background: '#0D0608', minHeight: '100vh', padding: '40px 20px 80px', position: 'relative' }}>
            <style>{`
                @media (max-width: 767px) {
                    .book-page-main {
                        padding-bottom: 100px !important;
                    }
                }
            `}</style>
            <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <StepIndicator current={1} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <Image src="/logo.png" alt="ECF Logo" width={52} height={52} priority />
                    </div>
                    <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 'clamp(28px, 5vw, 48px)', color: '#fff', letterSpacing: '0.06em', marginBottom: 8 }}>
                        SELECT YOUR GROUND
                    </h1>
                    <p style={{ fontFamily: "var(--font-body)", color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6 }}>
                        {loading ? 'Loading grounds...' : 'Click a pitch to select'}
                    </p>
                </motion.div>

                {/* Row 1 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
                    {grounds.slice(0, 3).map((g, i) => (
                        <PitchCard key={g.id} ground={g} isSelected={selectedId === g.id} isBlurred={selectedId !== null && selectedId !== g.id} onSelect={() => handleSelect(g)} index={i} availability={groundAvailability[g.name] || []} />
                    ))}
                </div>

                {/* Row 2 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 48 }}>
                    {grounds.slice(3).map((g, i) => (
                        <PitchCard key={g.id} ground={g} isSelected={selectedId === g.id} isBlurred={selectedId !== null && selectedId !== g.id} onSelect={() => handleSelect(g)} index={i + 3} availability={groundAvailability[g.name] || []} />
                    ))}
                </div>

                {/* Continue — futuristic button (desktop only) */}
                <AnimatePresence>
                    {selectedId && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="desktop-continue" style={{ display: 'flex', justifyContent: 'center' }}>
                            <button onClick={handleContinue} className="btn-futuristic" style={{ width: 260 }}>
                                CONTINUE
                                <span className="btn-arrow">→</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile fixed bottom bar */}
            <AnimatePresence>
                {selectedId && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="mobile-bottom-bar"
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(13, 6, 8, 0.95)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            borderTop: '1px solid rgba(139,26,43,0.3)',
                            padding: '16px 24px',
                            zIndex: 50,
                            display: 'none',
                            justifyContent: 'center',
                        }}
                    >
                        <button onClick={handleContinue} className="btn-futuristic" style={{ width: '100%', maxWidth: 360 }}>
                            CONTINUE
                            <span className="btn-arrow">→</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile responsive styles */}
            <style>{`
                @media (max-width: 767px) {
                    .desktop-continue {
                        display: none !important;
                    }
                    .mobile-bottom-bar {
                        display: flex !important;
                    }
                }
            `}</style>
        </main>
    );
}

export { default as StepIndicator } from '../components/StepIndicator';

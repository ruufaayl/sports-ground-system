'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Ground, PricingRule } from '../../lib/types';

// ── Fallback static data (shown while loading / on API error) ────────────
// UUIDs match the Supabase database exactly.
const FALLBACK_GROUNDS = [
    {
        id: 'fcc2caea-879c-47ff-b5ef-08216cc5a69c', name: 'G1', size: 'full',
        pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[],
    },
    {
        id: 'bc2368dd-2a56-42c4-a674-e29cdc837f77', name: 'G2', size: 'full',
        pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[],
    },
    {
        id: 'e73b15fb-6f7e-455d-ad83-b9d00baf2cff', name: 'G3', size: 'full',
        pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[],
    },
    {
        id: 'd6667c0b-3348-4ced-9172-25252834aef6', name: 'G4', size: 'full',
        pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 3500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 4200 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2800 },
        ] as PricingRule[],
    },
    {
        id: 'dcb5a29f-cb46-431f-b259-9add8319f8df', name: 'G5', size: 'smaller',
        pricing_rules: [
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'peak', price_per_hour: 2500 },
            { id: '', ground_id: '', day_type: 'weekday', slot_type: 'offpeak', price_per_hour: 1800 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'peak', price_per_hour: 3000 },
            { id: '', ground_id: '', day_type: 'weekend', slot_type: 'offpeak', price_per_hour: 2000 },
        ] as PricingRule[],
    },
] satisfies Omit<Ground, 'status' | 'description'>[];

// ── Helpers ──────────────────────────────────────────────────────────────
function getRate(rules: PricingRule[], dayType: string, slotType: string) {
    return rules.find((r) => r.day_type === dayType && r.slot_type === slotType)?.price_per_hour ?? 0;
}
function fmt(n: number) { return n.toLocaleString('en-PK'); }

// ── Step indicator (exported for use in child pages) ──────────────────────
const STEP_NAMES = ['Ground', 'Date & Time', 'Details', 'Payment'];

interface StepIndicatorProps { current: number }
export function StepIndicator({ current }: StepIndicatorProps) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 0, marginBottom: 48 }}>
            {STEP_NAMES.map((name, i) => {
                const step = i + 1;
                const isDone = step < current;
                const isActive = step === current;
                return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700,
                                background: isActive ? '#00ff88' : isDone ? 'rgba(0,255,136,0.2)' : '#1a1a2e',
                                color: isActive ? '#000' : isDone ? '#00ff88' : '#888',
                                border: `1px solid ${isActive || isDone ? '#00ff88' : 'rgba(0,255,136,0.2)'}`,
                                boxShadow: isActive ? '0 0 20px rgba(0,255,136,0.4)' : 'none',
                                transition: '0.3s ease', margin: '0 auto',
                            }}>
                                {isDone ? '✓' : step}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 6, color: isActive ? '#00ff88' : '#666' }}>{name}</div>
                        </div>
                        {i < STEP_NAMES.length - 1 && (
                            <div style={{ width: 60, height: 1, background: isDone ? 'rgba(0,255,136,0.5)' : 'rgba(0,255,136,0.15)', marginBottom: 20 }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function BookPage() {
    const router = useRouter();
    const [grounds, setGrounds] = useState(FALLBACK_GROUNDS as typeof FALLBACK_GROUNDS);
    const [loading, setLoading] = useState(true);

    // Fetch real grounds from API; fall back to static data on any error
    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        fetch(`${base}/api/grounds`)
            .then((r) => r.json())
            .then((data) => {
                if (data?.grounds?.length) setGrounds(data.grounds);
            })
            .catch(() => { /* silently use fallback */ })
            .finally(() => setLoading(false));
    }, []);

    const handleSelect = (ground: typeof grounds[number]) => {
        // Persist the full ground object (including real UUID) to localStorage
        localStorage.setItem('selectedGround', JSON.stringify({
            id: ground.id,
            name: ground.name,
            size: ground.size,
            pricing_rules: ground.pricing_rules,
        }));
        router.push('/book/schedule');
    };

    return (
        <main style={{ background: '#0a0a0f', minHeight: '100vh', padding: '40px 20px' }}>
            {/* Subtle orb */}
            <div style={{ position: 'fixed', top: '-200px', right: '-200px', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,136,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <StepIndicator current={1} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                        Choose Your Ground
                    </h1>
                    <p style={{ textAlign: 'center', color: '#666', marginBottom: 48 }}>
                        {loading ? 'Loading grounds...' : 'Select a ground to view availability and pricing'}
                    </p>
                </motion.div>

                {/* 2+2+1 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                    {grounds.map((g, i) => {
                        const wdPeak = getRate(g.pricing_rules, 'weekday', 'peak');
                        const wdOffpeak = getRate(g.pricing_rules, 'weekday', 'offpeak');
                        const wePeak = getRate(g.pricing_rules, 'weekend', 'peak');
                        const weOffpeak = getRate(g.pricing_rules, 'weekend', 'offpeak');
                        const sizeLabel = g.size === 'full' || (g.size as string) === 'Full Size' ? 'Full Size' : 'Smaller';

                        return (
                            <motion.div
                                key={g.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={() => handleSelect(g)}
                                style={{
                                    background: '#1a1a2e',
                                    border: '1px solid rgba(0,255,136,0.2)',
                                    borderRadius: 16, padding: '28px 24px',
                                    cursor: 'pointer', transition: 'all 0.3s ease',
                                    position: 'relative', overflow: 'hidden',
                                }}
                                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,255,136,0.25)', borderColor: 'rgba(0,255,136,0.6)' }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Background shimmer */}
                                <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

                                {/* Ground name */}
                                <div style={{ fontSize: 52, fontWeight: 900, color: '#00ff88', textShadow: '0 0 30px rgba(0,255,136,0.5)', lineHeight: 1, marginBottom: 12 }}>{g.name}</div>

                                {/* Badges */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                                    <span style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>
                                        {sizeLabel}
                                    </span>
                                    <span style={{ background: 'rgba(0,136,255,0.1)', border: '1px solid rgba(0,136,255,0.3)', borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#0088ff', fontWeight: 600 }}>
                                        Available 24/7
                                    </span>
                                </div>

                                {/* Pricing */}
                                <div style={{ borderTop: '1px solid rgba(0,255,136,0.1)', paddingTop: 16 }}>
                                    <div style={{ fontSize: 12, color: '#666', marginBottom: 10, letterSpacing: '1px' }}>WEEKDAY</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ color: '#888', fontSize: 13 }}>⚡ Peak</span>
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>PKR {fmt(wdPeak)}/hr</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <span style={{ color: '#888', fontSize: 13 }}>🌙 Off-Peak</span>
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>PKR {fmt(wdOffpeak)}/hr</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#666', marginBottom: 10, letterSpacing: '1px' }}>WEEKEND</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ color: '#888', fontSize: 13 }}>⚡ Peak</span>
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>PKR {fmt(wePeak)}/hr</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#888', fontSize: 13 }}>🌙 Off-Peak</span>
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>PKR {fmt(weOffpeak)}/hr</span>
                                    </div>
                                </div>

                                <div style={{ marginTop: 20, textAlign: 'right', color: '#00ff88', fontSize: 13, fontWeight: 600 }}>
                                    SELECT →
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}

'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { checkAvailability } from '../../../lib/api';
import { getPKTDate, getPKTHour, parseLocalDate } from '../../../lib/dateUtils';
import StepIndicator from '../../components/StepIndicator';
import { playTick, playSelect } from '../../lib/sounds';

// ── Constants ─────────────────────────────────────────────────────────────────
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ITEM_HEIGHT = 50;

interface AvailSlot {
    hour: number;
    available: boolean;
    startTime?: string;
    endTime?: string;
}

function addHours(hour24: number, durationHours: number): string {
    const endH = (hour24 + durationHours) % 24;
    return `${String(endH).padStart(2, '0')}:00`;
}

function fmt24to12(hour24: number): string {
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${h}:00 ${ampm}`;
}

function genDays(count = 14) {
    const days: { label: string; day: string; num: string; month: string; fullDay: string }[] = [];
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MON_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < count; i++) {
        const future = new Date();
        future.setDate(future.getDate() + i);
        const dateStr = getPKTDate(future);
        const d = parseLocalDate(dateStr);
        days.push({
            label: dateStr,
            day: DAY_NAMES[d.getDay()],
            fullDay: FULL_DAY_NAMES[d.getDay()],
            num: String(d.getDate()).padStart(2, '0'),
            month: MON_NAMES[d.getMonth()],
        });
    }
    return days;
}

function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }

function getMaxDuration(startHour24: number, bookedSlots: AvailSlot[]): number {
    for (let i = 1; i <= 12; i++) {
        const checkHour = (startHour24 + i) % 24;
        const slot = bookedSlots.find(s => s.hour === checkHour);
        if (slot && !slot.available) return i;
    }
    return 12;
}

type PriceResult = {
    duration: number; pricePerHour: number; basePrice: number;
    advanceAmount: number; remainingAmount: number; dayType: string; slotType: string;
};

// ── Availability Timeline (interactive schedule bar) ──────────────────────────
function AvailabilityTimeline({
    slots, selectedHour24, onHourClick, loading, isToday,
}: {
    slots: AvailSlot[]; selectedHour24: number;
    onHourClick: (hour: number) => void; loading: boolean; isToday: boolean;
}) {
    const hoursToShow = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
    const currentHour = getPKTHour();
    const [hoverHour, setHoverHour] = useState<number | null>(null);

    if (loading) {
        return (
            <div style={{ height: 16, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                    height: '100%', background: 'linear-gradient(90deg, rgba(139,26,43,0.1), rgba(139,26,43,0.2), rgba(139,26,43,0.1))',
                    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                }} />
                <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'flex', gap: 2, height: 16,
                borderRadius: 6, overflow: 'hidden',
            }}>
                {hoursToShow.map(hour => {
                    const slot = slots.find(s => s.hour === hour);
                    const isPast = isToday && hour < currentHour;
                    const isBooked = slot ? !slot.available : false;
                    const isSelected = hour === selectedHour24;
                    const isHovered = hour === hoverHour;

                    let bg = 'rgba(0,166,81,0.5)'; // free
                    if (isPast) bg = 'rgba(255,255,255,0.06)';
                    else if (isBooked) bg = 'rgba(139,26,43,0.7)';
                    if (isSelected) bg = '#C9A84C';
                    else if (isHovered && !isPast && !isBooked) bg = 'rgba(0,166,81,0.8)';

                    return (
                        <div
                            key={hour}
                            onClick={() => {
                                if (!isPast && !isBooked) onHourClick(hour);
                            }}
                            onMouseEnter={() => setHoverHour(hour)}
                            onMouseLeave={() => setHoverHour(null)}
                            style={{
                                flex: 1, background: bg, borderRadius: 2,
                                cursor: isPast || isBooked ? 'not-allowed' : 'pointer',
                                transition: 'background 0.15s ease',
                                position: 'relative',
                            }}
                            title={`${fmt24to12(hour)} — ${isBooked ? 'Booked' : isPast ? 'Past' : 'Available'}`}
                        />
                    );
                })}
            </div>
            <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {hoursToShow.map(hour => {
                    const h12 = hour % 12 === 0 ? 12 : hour % 12;
                    const ampm = hour >= 12 ? 'P' : 'A';
                    return (
                        <div key={hour} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)', lineHeight: 1, whiteSpace: 'nowrap' }}>
                            {h12}{ampm}
                        </div>
                    );
                })}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {[
                    { bg: 'rgba(0,166,81,0.5)', label: 'Free' },
                    { bg: 'rgba(139,26,43,0.7)', label: 'Booked' },
                    { bg: '#C9A84C', label: 'Selected' },
                ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: l.bg }} />
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)' }}>{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Hours roulette wheel ─────────────────────────────────────────────────────
function HourWheel({
    selectedIndex, onSelect, bookedSlots, isPM, isToday, currentHour,
}: {
    selectedIndex: number; onSelect: (i: number) => void;
    bookedSlots: AvailSlot[]; isPM: boolean; isToday: boolean; currentHour: number;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startOffset = useRef(0);
    const currentOffset = useRef(selectedIndex * ITEM_HEIGHT);
    const velocity = useRef(0);
    const lastY = useRef(0);
    const lastTime = useRef(0);
    const animFrameRef = useRef<number>(0);
    const lastIdx = useRef(selectedIndex);

    const clamp = (idx: number) => Math.max(0, Math.min(HOURS.length - 1, idx));

    const getDrum = () => containerRef.current?.querySelector('.hour-drum') as HTMLElement | null;

    const updateDrum = useCallback(() => {
        const drum = getDrum();
        if (drum) drum.style.transform = `translateY(${-currentOffset.current + ITEM_HEIGHT * 2}px)`;
        const idx = clamp(Math.round(currentOffset.current / ITEM_HEIGHT));
        if (idx !== lastIdx.current) { lastIdx.current = idx; onSelect(idx); playTick(); }
    }, [onSelect]);

    const snap = useCallback((idx: number) => {
        const c = clamp(idx);
        currentOffset.current = c * ITEM_HEIGHT;
        updateDrum();
    }, [updateDrum]);

    const momentum = useCallback(() => {
        if (Math.abs(velocity.current) < 0.5) { snap(Math.round(currentOffset.current / ITEM_HEIGHT)); return; }
        currentOffset.current = Math.max(0, Math.min((HOURS.length - 1) * ITEM_HEIGHT, currentOffset.current + velocity.current));
        velocity.current *= 0.91;
        updateDrum();
        animFrameRef.current = requestAnimationFrame(momentum);
    }, [snap, updateDrum]);

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true; startY.current = e.clientY;
        startOffset.current = currentOffset.current; lastY.current = e.clientY;
        lastTime.current = Date.now(); velocity.current = 0;
        cancelAnimationFrame(animFrameRef.current); e.preventDefault();
    };
    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        const now = Date.now(); const dt = now - lastTime.current;
        if (dt > 0) velocity.current = (lastY.current - e.clientY) / dt * 8;
        lastY.current = e.clientY; lastTime.current = now;
        currentOffset.current = Math.max(0, Math.min((HOURS.length - 1) * ITEM_HEIGHT, startOffset.current + (startY.current - e.clientY)));
        updateDrum();
    }, [updateDrum]);
    const onMouseUp = useCallback(() => { if (!isDragging.current) return; isDragging.current = false; animFrameRef.current = requestAnimationFrame(momentum); }, [momentum]);
    const onTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true; startY.current = e.touches[0].clientY;
        startOffset.current = currentOffset.current; lastY.current = e.touches[0].clientY;
        lastTime.current = Date.now(); velocity.current = 0; cancelAnimationFrame(animFrameRef.current);
    };
    const onTouchMove = useCallback((e: TouchEvent) => {
        if (!isDragging.current) return;
        const now = Date.now(); const dt = now - lastTime.current;
        if (dt > 0) velocity.current = (lastY.current - e.touches[0].clientY) / dt * 8;
        lastY.current = e.touches[0].clientY; lastTime.current = now;
        currentOffset.current = Math.max(0, Math.min((HOURS.length - 1) * ITEM_HEIGHT, startOffset.current + (startY.current - e.touches[0].clientY)));
        updateDrum(); e.preventDefault();
    }, [updateDrum]);
    const onTouchEnd = useCallback(() => { if (!isDragging.current) return; isDragging.current = false; animFrameRef.current = requestAnimationFrame(momentum); }, [momentum]);
    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault(); cancelAnimationFrame(animFrameRef.current); velocity.current = 0;
        currentOffset.current = Math.max(0, Math.min((HOURS.length - 1) * ITEM_HEIGHT, currentOffset.current + e.deltaY * 0.3));
        updateDrum(); snap(Math.round(currentOffset.current / ITEM_HEIGHT));
    };

    useEffect(() => {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

    useEffect(() => { snap(selectedIndex); }, []);

    // Helper: get 24h value for a wheel item
    const getHour24 = (h12: number) => isPM ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);

    return (
        <div
            ref={containerRef}
            style={{
                width: 90, height: 250, position: 'relative',
                overflow: 'hidden', cursor: 'none', userSelect: 'none', touchAction: 'none',
            }}
            onMouseDown={onMouseDown}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
        >
            {/* Fades */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, var(--bg-card), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, var(--bg-card), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            {/* Selected highlight */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: ITEM_HEIGHT, transform: 'translateY(-50%)', background: 'rgba(139,26,43,0.12)', borderTop: '1px solid rgba(139,26,43,0.4)', borderBottom: '1px solid rgba(139,26,43,0.4)', zIndex: 1, pointerEvents: 'none' }} />
            {/* Drum */}
            <div
                className="hour-drum"
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    transform: `translateY(${-selectedIndex * ITEM_HEIGHT + ITEM_HEIGHT * 2}px)`,
                    willChange: 'transform',
                }}
            >
                {HOURS.map((h, i) => {
                    const dist = Math.abs(i - selectedIndex);
                    const h24 = getHour24(h);
                    const slot = bookedSlots.find(s => s.hour === h24);
                    const isBooked = slot ? !slot.available : false;
                    const isPast = isToday && h24 < currentHour;
                    const isCentered = dist === 0;

                    // Determine styles per state
                    let itemColor = dist === 0 ? '#fff' : '#888';
                    let itemOpacity = dist === 0 ? 1 : dist === 1 ? 0.6 : 0.35;
                    let textDeco = 'none';
                    let decoColor: string | undefined = undefined;

                    if (isBooked) {
                        itemColor = 'rgba(139,26,43,0.7)';
                        itemOpacity = isCentered ? 0.5 : 0.25;
                        textDeco = 'line-through';
                        decoColor = 'rgba(139,26,43,0.8)';
                    } else if (isPast) {
                        itemColor = 'rgba(255,255,255,0.2)';
                        itemOpacity = 0.2;
                    }

                    return (
                        <div key={i} style={{
                            height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "var(--font-heading)",
                            fontSize: dist === 0 ? 48 : dist === 1 ? 32 : 22,
                            fontWeight: dist === 0 ? 700 : 400,
                            color: itemColor,
                            opacity: itemOpacity,
                            transform: `scale(${dist === 0 ? 1 : dist === 1 ? 0.85 : 0.7})`,
                            transition: 'font-size 0.1s, color 0.15s, opacity 0.15s',
                            userSelect: 'none',
                            letterSpacing: '0.02em',
                            position: 'relative',
                            background: isBooked && isCentered ? 'rgba(139,26,43,0.08)' : 'transparent',
                        }}>
                            <span style={{
                                textDecoration: textDeco,
                                textDecorationColor: decoColor,
                                textDecorationThickness: '2px',
                            }}>
                                {h}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Duration 12-card grid ────────────────────────────────────────────────────
function DurationGrid({ value, onChange, maxDuration, startHour24, bookedSlots }: {
    value: number; onChange: (v: number) => void;
    maxDuration: number; startHour24: number; bookedSlots: AvailSlot[];
}) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
        }}>
            {DURATIONS.map((d) => {
                const active = value === d;
                const disabled = d > maxDuration;
                // Find the blocking hour for tooltip
                let blockHourLabel = '';
                if (disabled) {
                    const blockHour = (startHour24 + maxDuration) % 24;
                    blockHourLabel = `Slot taken at ${fmt24to12(blockHour)}`;
                }

                return (
                    <motion.button
                        key={d}
                        onClick={() => { if (!disabled) { onChange(d); playTick(); } }}
                        whileHover={disabled ? {} : { scale: 1.05 }}
                        whileTap={disabled ? {} : { scale: 0.95 }}
                        title={disabled ? blockHourLabel : `${d} hour${d > 1 ? 's' : ''}`}
                        style={{
                            width: '100%',
                            aspectRatio: '1',
                            maxWidth: 80,
                            borderRadius: 12,
                            border: active ? '2px solid #C9A84C' : disabled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.15)',
                            background: active ? '#8B1A2B' : disabled ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                            cursor: disabled ? 'not-allowed' : 'none',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 2,
                            boxShadow: active ? '0 0 20px rgba(139,26,43,0.6)' : 'none',
                            transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                            opacity: disabled ? 0.25 : 1,
                        }}
                    >
                        <div style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 28,
                            fontWeight: 700,
                            color: active ? '#fff' : disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
                            lineHeight: 1,
                        }}>{d}</div>
                        <div style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 10,
                            fontWeight: 500,
                            color: active ? 'rgba(255,255,255,0.7)' : disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)',
                            letterSpacing: '0.05em',
                        }}>{d === 1 ? 'HR' : 'HRS'}</div>
                    </motion.button>
                );
            })}
        </div>
    );
}

// ─── Main schedule inner ──────────────────────────────────────────────────────
function ScheduleInner() {
    const router = useRouter();
    const [groundId, setGroundId] = useState('');
    const [groundName, setGroundName] = useState('');

    useEffect(() => {
        const raw = localStorage.getItem('selectedGround');
        if (!raw) { router.push('/book'); return; }
        const g = JSON.parse(raw);
        setGroundId(g.id); setGroundName(g.name);
    }, [router]);

    const days = genDays(14);
    const [selectedDate, setSelectedDate] = useState(days[0].label);
    const [hourIdx, setHourIdx] = useState(5); // default 6 PM (index 5 → HOURS[5]=6)
    const [isPM, setIsPM] = useState(true);
    const [duration, setDuration] = useState(2);

    // Booked slots state
    const [bookedSlots, setBookedSlots] = useState<AvailSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Fetch booked slots when date or ground changes
    useEffect(() => {
        if (!groundId || !selectedDate) return;
        setLoadingSlots(true);
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        fetch(`${base}/api/availability/ground-slots?ground_id=${groundId}&date=${selectedDate}`)
            .then(r => r.json())
            .then(data => { setBookedSlots((data.slots || []) as AvailSlot[]); })
            .catch(err => { console.error('Failed to fetch slots:', err); })
            .finally(() => setLoadingSlots(false));
    }, [selectedDate, groundId]);

    // Derived 24h times
    const hour12 = HOURS[hourIdx];
    const hour24 = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
    const startTime = `${String(hour24).padStart(2, '0')}:00`;
    const endHour24 = (hour24 + duration) % 24;
    const endTime = `${String(endHour24).padStart(2, '0')}:00`;
    const startDisplay = fmt24to12(hour24);
    const endDisplay = fmt24to12(endHour24);

    // Is today?
    const isToday = selectedDate === days[0].label;
    const currentHour = getPKTHour();

    // Helper: check if a 24h hour is unavailable
    const isHourUnavailable = useCallback((h24: number) => {
        const slot = bookedSlots.find(s => s.hour === h24);
        if (slot && !slot.available) return true;
        if (isToday && h24 < currentHour) return true;
        return false;
    }, [bookedSlots, isToday, currentHour]);

    // Snap to nearest available hour if currently on a booked one
    const snapToNearestAvailable = useCallback((attemptedHour: number): number => {
        if (!isHourUnavailable(attemptedHour)) return attemptedHour;
        for (let offset = 1; offset <= 12; offset++) {
            const nextH = (attemptedHour + offset) % 24;
            if (!isHourUnavailable(nextH)) return nextH;
            const prevH = (attemptedHour - offset + 24) % 24;
            if (!isHourUnavailable(prevH)) return prevH;
        }
        return attemptedHour;
    }, [isHourUnavailable]);

    // Auto-snap away from booked/past hours
    useEffect(() => {
        if (bookedSlots.length === 0) return;
        if (isHourUnavailable(hour24)) {
            const available = snapToNearestAvailable(hour24);
            if (available !== hour24) {
                const h12 = available % 12 === 0 ? 12 : available % 12;
                const idx = HOURS.indexOf(h12);
                if (idx >= 0) {
                    setHourIdx(idx);
                    setIsPM(available >= 12);
                }
            }
        }
    }, [hour24, bookedSlots, isHourUnavailable, snapToNearestAvailable]);

    // Max duration
    const maxDuration = getMaxDuration(hour24, bookedSlots);

    // Auto-clamp duration
    useEffect(() => {
        if (duration > maxDuration) setDuration(maxDuration);
    }, [maxDuration, duration]);

    // Handle clicking on timeline segment
    const handleTimelineClick = (hour: number) => {
        // Convert hour24 to roulette index + AM/PM
        const h12 = hour % 12 === 0 ? 12 : hour % 12;
        const idx = HOURS.indexOf(h12);
        if (idx >= 0) {
            setHourIdx(idx);
            setIsPM(hour >= 12);
            playTick();
        }
    };

    // Selected date info
    const selectedDayInfo = days.find(d => d.label === selectedDate);

    const [checking, setChecking] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const [price, setPrice] = useState<PriceResult | null>(null);
    const [checkError, setCheckError] = useState('');

    useEffect(() => {
        if (!groundId || !selectedDate) return;
        setAvailable(null); setPrice(null); setCheckError('');
        const timer = setTimeout(async () => {
            setChecking(true);
            try {
                const res = await checkAvailability(groundId, selectedDate, startTime, endTime);
                setAvailable(res.available);
                setPrice(res.available ? res.price : null);
                if (res.available && res.price) localStorage.setItem('bookingPrice', JSON.stringify(res.price));
            } catch (err: unknown) {
                setAvailable(null); setPrice(null);
                setCheckError(err instanceof Error ? err.message : 'Could not reach the server');
            } finally { setChecking(false); }
        }, 600);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, startTime, endTime, groundId]);

    const canContinue = available === true && !checking && !isHourUnavailable(hour24);
    const handleContinue = () => {
        if (!canContinue || !price) return;
        localStorage.setItem('bookingProgress', JSON.stringify({
            groundId, groundName, date: selectedDate,
            startTime, endTime, duration,
            pricePerHour: price.pricePerHour, basePrice: price.basePrice,
            advanceAmount: price.advanceAmount, remainingAmount: price.remainingAmount,
            dayType: price.dayType, slotType: price.slotType,
        }));
        playSelect();
        router.push('/book/details');
    };

    return (
        <main style={{ background: '#0D0608', minHeight: '100vh', padding: '40px 20px 80px' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <StepIndicator current={2} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        {groundName && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 10,
                                background: 'rgba(139,26,43,0.15)', border: '1px solid rgba(139,26,43,0.4)',
                                borderRadius: 999, padding: '6px 20px', marginBottom: 16,
                            }}>
                                <span style={{ fontFamily: "var(--font-ui)", color: '#C9A84C', letterSpacing: '0.1em', fontSize: 15, fontWeight: 600 }}>{groundName}</span>
                            </div>
                        )}
                        <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
                            SELECT YOUR SLOT
                        </h1>
                    </div>

                    {/* Ground + Date header with availability bar */}
                    {groundName && selectedDayInfo && (
                        <div className="card-dark" style={{ padding: '16px 20px', marginBottom: 20 }}>
                            <div style={{
                                fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                                color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em', marginBottom: 12,
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ color: '#C9A84C', fontWeight: 700 }}>{groundName}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                                <span>{selectedDayInfo.fullDay} {selectedDayInfo.num} {selectedDayInfo.month}</span>
                            </div>
                            <AvailabilityTimeline
                                slots={bookedSlots}
                                selectedHour24={hour24}
                                onHourClick={handleTimelineClick}
                                loading={loadingSlots}
                                isToday={isToday}
                            />
                        </div>
                    )}

                    {/* Date selector */}
                    <div className="card-dark" style={{ padding: 20, marginBottom: 20 }}>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', marginBottom: 14, textTransform: 'uppercase' }}>
                            Select Date
                        </div>
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                            {days.map((d, i) => {
                                const isSel = d.label === selectedDate;
                                return (
                                    <button key={d.label} onClick={() => { setSelectedDate(d.label); playTick(); }}
                                        style={{
                                            minWidth: 62, padding: '10px 6px', borderRadius: 10, flexShrink: 0,
                                            border: isSel ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.06)',
                                            background: isSel ? '#8B1A2B' : 'rgba(255,255,255,0.03)',
                                            color: isSel ? '#fff' : '#888', cursor: 'none', textAlign: 'center',
                                            transition: 'all 0.2s', position: 'relative',
                                            boxShadow: isSel ? '0 0 16px rgba(139,26,43,0.5)' : 'none',
                                            transform: isSel ? 'scale(1.08)' : 'scale(1)',
                                        }}>
                                        {i === 0 && (
                                            <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#C9A84C', color: '#0D0608', fontSize: 8, fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: '0.05em', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>TODAY</div>
                                        )}
                                        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 2, fontFamily: "var(--font-ui)", fontWeight: 500 }}>{d.day}</div>
                                        <div style={{ fontSize: 36, fontFamily: "var(--font-heading)", fontWeight: 700, lineHeight: 1 }}>{d.num}</div>
                                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, fontFamily: "var(--font-ui)", fontWeight: 400 }}>{d.month}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hour roulette + AM/PM */}
                    <div className="card-dark" style={{ padding: '28px 24px', marginBottom: 20 }}>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', marginBottom: 20, textTransform: 'uppercase' }}>
                            Start Hour
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                            <HourWheel
                                selectedIndex={hourIdx}
                                onSelect={setHourIdx}
                                bookedSlots={bookedSlots}
                                isPM={isPM}
                                isToday={isToday}
                                currentHour={currentHour}
                            />

                            {/* AM/PM toggle */}
                            <div style={{
                                background: '#150A0C', border: '1px solid rgba(139,26,43,0.3)',
                                borderRadius: 999, padding: 4,
                                display: 'flex', flexDirection: 'column', gap: 3,
                            }}>
                                {['AM', 'PM'].map((label) => {
                                    const active = (label === 'PM') === isPM;
                                    return (
                                        <button key={label} onClick={() => { setIsPM(label === 'PM'); playTick(); }}
                                            style={{
                                                fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
                                                letterSpacing: '0.08em', padding: '10px 18px', borderRadius: 999,
                                                border: 'none', background: active ? '#8B1A2B' : 'transparent',
                                                color: active ? '#fff' : '#666', cursor: 'none', transition: 'all 0.2s',
                                                boxShadow: active ? '0 0 12px rgba(139,26,43,0.5)' : 'none',
                                            }}>{label}</button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Duration grid */}
                    <div className="card-dark" style={{ padding: '24px', marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                Duration
                            </div>
                            {maxDuration < 12 && (
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.05em' }}>
                                    MAX {maxDuration}H
                                </div>
                            )}
                        </div>
                        <DurationGrid value={duration} onChange={setDuration} maxDuration={maxDuration} startHour24={hour24} bookedSlots={bookedSlots} />
                    </div>

                    {/* End time banner */}
                    <motion.div
                        key={`${startTime}-${duration}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            background: 'rgba(139,26,43,0.08)',
                            border: '1px solid rgba(139,26,43,0.25)',
                            borderRadius: 12,
                            padding: '18px 24px',
                            textAlign: 'center',
                            marginBottom: 20,
                        }}
                    >
                        <div style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 'clamp(24px, 6vw, 36px)',
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #8B1A2B, #ffffff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            lineHeight: 1.2,
                            letterSpacing: '0.04em',
                        }}>
                            {startDisplay} → {endDisplay}
                        </div>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.1em', marginTop: 6 }}>
                            {duration} {duration === 1 ? 'HOUR' : 'HOURS'}
                        </div>
                    </motion.div>

                    {/* Availability + price card */}
                    <div className="card-dark" style={{
                        padding: 20, marginBottom: 28,
                        border: available === true ? '1px solid rgba(139,26,43,0.5)' : available === false ? '1px solid rgba(231,76,60,0.35)' : '1px solid rgba(139,26,43,0.25)',
                        transition: 'border-color 0.3s ease',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: checking || available !== null ? 16 : 0 }}>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                Availability & Price
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: checking ? 'rgba(201,168,76,1)' : available === true ? '#2ecc71' : available === false ? '#e74c3c' : 'rgba(255,255,255,0.3)',
                                    animation: checking ? 'pulse-crimson 1s infinite' : 'none',
                                }} />
                                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: available === true ? '#2ecc71' : available === false ? '#e74c3c' : 'rgba(255,255,255,0.55)' }}>
                                    {checking ? 'CHECKING...' : available === true ? 'AVAILABLE ✓' : available === false ? 'SLOT TAKEN ✗' : checkError || 'SELECT A SLOT'}
                                </span>
                                {checking && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                        <circle cx="12" cy="12" r="10" stroke="rgba(201,168,76,0.5)" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        {!checking && available === true && price && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                    {[
                                        { label: 'Duration', value: `${price.duration}h` },
                                        { label: 'Rate/hr', value: `PKR ${fmt(price.pricePerHour)}` },
                                        { label: 'Total', value: `PKR ${fmt(price.basePrice)}` },
                                        { label: 'Advance (30%)', value: `PKR ${fmt(price.advanceAmount)}`, gold: true },
                                    ].map(({ label, value, gold }) => (
                                        <div key={label} style={{ padding: 12, borderBottom: '1px solid rgba(139,26,43,0.1)' }}>
                                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
                                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 20, fontWeight: 700, color: gold ? '#C9A84C' : '#fff', letterSpacing: '0.02em' }}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}>
                                    <span style={{ fontFamily: "var(--font-body)", color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>At ground (70%)</span>
                                    <span style={{ fontFamily: "var(--font-ui)", color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: 600 }}>PKR {fmt(price.remainingAmount)}</span>
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: "var(--font-body)", padding: '0 12px' }}>{price.dayType} · {price.slotType} pricing</div>
                            </motion.div>
                        )}
                        {!checking && available === false && (
                            <div style={{ color: '#e74c3c', fontSize: 14, fontFamily: "var(--font-body)" }}>This slot is taken. Please choose a different date or time.</div>
                        )}
                        {!checking && available === null && !checkError && (
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: "var(--font-body)" }}>Select date, time and duration above.</div>
                        )}
                        {!checking && checkError && available === null && (
                            <div style={{ color: '#ff8844', fontSize: 14, fontFamily: "var(--font-body)" }}>{checkError}</div>
                        )}
                    </div>

                    {/* Continue */}
                    <AnimatePresence>
                        {canContinue && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} style={{ display: 'flex', justifyContent: 'center' }}>
                                <button onClick={handleContinue} className="btn-futuristic" style={{ width: 260 }}>
                                    CONTINUE
                                    <span className="btn-arrow">→</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {!canContinue && !checking && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button disabled className="btn-futuristic" style={{ width: 260 }}>
                                CONTINUE
                                <span className="btn-arrow">→</span>
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </main>
    );
}

export default function SchedulePage() {
    return (
        <Suspense fallback={
            <div style={{ background: '#0D0608', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B1A2B', fontFamily: "var(--font-ui)", fontSize: 24, letterSpacing: '0.2em' }}>
                LOADING...
            </div>
        }>
            <ScheduleInner />
        </Suspense>
    );
}

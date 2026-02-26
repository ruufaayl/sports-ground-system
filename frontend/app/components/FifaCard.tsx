'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface FifaCardProps {
    imagePath: string;
    index: number;
    style?: React.CSSProperties;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
}

export default function FifaCard({ imagePath, index, style }: FifaCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [shimmerX, setShimmerX] = useState(-100);
    const [particles, setParticles] = useState<Particle[]>([]);
    const particleIdRef = useRef(0);
    const rafRef = useRef<number>(0);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rotX = Math.max(-15, Math.min(15, ((e.clientY - cy) / (rect.height / 2)) * -15));
        const rotY = Math.max(-15, Math.min(15, ((e.clientX - cx) / (rect.width / 2)) * 15));
        const shimmer = ((e.clientX - rect.left) / rect.width) * 200 - 50;
        setTilt({ x: rotX, y: rotY });
        setShimmerX(shimmer);
    }, []);

    const spawnParticles = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const colors = ['#8B1A2B', '#C9A84C', '#E8C96A', '#6B1422', '#fff'];
        const newParticles: Particle[] = Array.from({ length: 14 }, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            return {
                id: ++particleIdRef.current,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
            };
        });
        setParticles(newParticles);
    }, []);

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        setIsHovering(true);
        spawnParticles(e);
    }, [spawnParticles]);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
        setTilt({ x: 0, y: 0 });
        setShimmerX(-100);
        setParticles([]);
    }, []);

    // Animate particles
    useEffect(() => {
        if (particles.length === 0) return;
        let animating = true;

        const animate = () => {
            if (!animating) return;
            setParticles(prev => {
                const updated = prev
                    .map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy,
                        vy: p.vy + 0.1,
                        vx: p.vx * 0.96,
                        alpha: p.alpha - 0.025,
                    }))
                    .filter(p => p.alpha > 0);
                if (updated.length === 0) animating = false;
                return updated;
            });
            if (animating) rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => {
            animating = false;
            cancelAnimationFrame(rafRef.current);
        };
    }, [particles.length > 0]);

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                width: 180,
                height: 250,
                position: 'relative',
                cursor: 'none',
                transformStyle: 'preserve-3d',
                transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovering ? 1.08 : 1})`,
                transition: isHovering
                    ? 'transform 0.08s ease'
                    : 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)',
                willChange: 'transform',
                ...style,
            }}
        >
            {/* Card body */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px 16px 8px 8px',
                    background: 'linear-gradient(135deg, #1a1528 0%, #1e1840 40%, #17254a 100%)',
                    border: `2px solid ${isHovering ? '#C9A84C' : 'rgba(201,168,76,0.5)'}`,
                    boxShadow: isHovering
                        ? '0 20px 60px rgba(139,26,43,0.6), 0 0 40px rgba(201,168,76,0.3), inset 0 0 30px rgba(201,168,76,0.05)'
                        : '0 8px 24px rgba(0,0,0,0.6), inset 0 0 16px rgba(201,168,76,0.03)',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                }}
            >
                {/* Metallic top accent */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, transparent, #C9A84C, transparent)`,
                    opacity: isHovering ? 1 : 0.4,
                    transition: 'opacity 0.3s ease',
                    zIndex: 4,
                }} />

                {/* Player image */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '78%',
                    overflow: 'hidden',
                }}>
                    <img
                        src={imagePath}
                        alt={`Player ${index + 1}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'top center',
                            display: 'block',
                        }}
                        draggable={false}
                    />
                    {/* Image vignette */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to bottom, transparent 55%, rgba(10,6,16,0.7) 100%)',
                    }} />
                </div>

                {/* Shimmer overlay */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(105deg, transparent 30%, rgba(201,168,76,0.22) ${shimmerX}%, transparent ${shimmerX + 25}%)`,
                        pointerEvents: 'none',
                        zIndex: 3,
                        transition: isHovering ? 'none' : 'opacity 0.3s ease',
                        opacity: isHovering ? 1 : 0,
                    }}
                />

                {/* ECF bottom strip */}
                <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: '22%',
                    background: 'linear-gradient(180deg, rgba(107,20,34,0.9) 0%, #6B1422 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    zIndex: 2,
                }}>
                    <div style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#C9A84C',
                        letterSpacing: '0.25em',
                        textShadow: '0 0 10px rgba(201,168,76,0.6)',
                    }}>ECF</div>
                    <div style={{
                        width: 1,
                        height: 14,
                        background: 'rgba(201,168,76,0.4)',
                    }} />
                    <div style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.6)',
                        letterSpacing: '0.1em',
                    }}>{`#${index + 1}`}</div>
                </div>

                {/* Corner star ornament */}
                <div style={{
                    position: 'absolute',
                    top: 8, right: 10,
                    fontFamily: 'sans-serif',
                    fontSize: 10,
                    color: 'rgba(201,168,76,0.6)',
                    zIndex: 4,
                }}>★</div>
                <div style={{
                    position: 'absolute',
                    top: 8, left: 10,
                    fontFamily: 'sans-serif',
                    fontSize: 10,
                    color: 'rgba(201,168,76,0.6)',
                    zIndex: 4,
                }}>★</div>
            </div>

            {/* Particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: p.x - p.size / 2,
                        top: p.y - p.size / 2,
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: p.color,
                        opacity: p.alpha,
                        pointerEvents: 'none',
                        zIndex: 10,
                        willChange: 'transform, opacity',
                    }}
                />
            ))}
        </div>
    );
}

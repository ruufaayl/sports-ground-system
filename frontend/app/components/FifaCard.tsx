'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';

interface FifaCardProps {
    imagePath: string;
    index: number;
    style?: React.CSSProperties;
}

export default function FifaCard({ imagePath, index, style }: FifaCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [shimmerX, setShimmerX] = useState(-100);

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

    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
        setTilt({ x: 0, y: 0 });
        setShimmerX(-100);
    }, []);

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fifa-card-wrapper"
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
                    <Image
                        src={imagePath}
                        alt={`Player ${index + 1}`}
                        width={180}
                        height={250}
                        loading="lazy"
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
                        fontFamily: "'Montserrat', sans-serif",
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
                        fontFamily: "'Montserrat', sans-serif",
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

            {/* CSS Sparkle effect — 4 corner dots on hover */}
            {isHovering && (
                <>
                    <span className="sparkle sparkle-tl" />
                    <span className="sparkle sparkle-tr" />
                    <span className="sparkle sparkle-bl" />
                    <span className="sparkle sparkle-br" />
                </>
            )}

            {/* Sparkle CSS */}
            <style>{`
                .sparkle {
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: #C9A84C;
                    pointer-events: none;
                    z-index: 10;
                    opacity: 0;
                    animation: sparkle-out 0.6s ease-out forwards;
                }
                .sparkle-tl { top: -2px; left: -2px; animation-name: sparkle-tl-out; }
                .sparkle-tr { top: -2px; right: -2px; animation-name: sparkle-tr-out; }
                .sparkle-bl { bottom: -2px; left: -2px; animation-name: sparkle-bl-out; }
                .sparkle-br { bottom: -2px; right: -2px; animation-name: sparkle-br-out; }

                @keyframes sparkle-tl-out {
                    0% { opacity: 1; transform: translate(0, 0); }
                    100% { opacity: 0; transform: translate(-12px, -12px); }
                }
                @keyframes sparkle-tr-out {
                    0% { opacity: 1; transform: translate(0, 0); }
                    100% { opacity: 0; transform: translate(12px, -12px); }
                }
                @keyframes sparkle-bl-out {
                    0% { opacity: 1; transform: translate(0, 0); }
                    100% { opacity: 0; transform: translate(-12px, 12px); }
                }
                @keyframes sparkle-br-out {
                    0% { opacity: 1; transform: translate(0, 0); }
                    100% { opacity: 0; transform: translate(12px, 12px); }
                }
            `}</style>
        </div>
    );
}

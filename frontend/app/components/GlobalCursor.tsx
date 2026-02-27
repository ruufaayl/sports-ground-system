'use client';

import { useEffect, useRef, useState } from 'react';

export default function GlobalCursor() {
    const [isMobile, setIsMobile] = useState(false);
    const cursorRef = useRef<HTMLDivElement>(null);
    const trailRefs = useRef<HTMLDivElement[]>([]);
    const mousePos = useRef({ x: -100, y: -100 });
    const cursorPos = useRef({ x: -100, y: -100 });
    const trailPositions = useRef<{ x: number; y: number }[]>(
        Array.from({ length: 8 }, () => ({ x: -100, y: -100 }))
    );
    const isHovering = useRef(false);
    const rafId = useRef<number>(0);

    useEffect(() => {
        const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        setIsMobile(mobile);
    }, []);

    useEffect(() => {
        const cursor = cursorRef.current;
        if (!cursor) return;

        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const clickable = target.closest('button, a, [role="button"], input, textarea, select, label, [data-hoverable]');
            isHovering.current = !!clickable;
        };

        const animate = () => {
            // Lerp cursor to mouse
            cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * 0.18;
            cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * 0.18;

            const { x, y } = cursorPos.current;
            const size = isHovering.current ? 60 : 20;
            const half = size / 2;

            cursor.style.transform = `translate(${x - half}px, ${y - half}px)`;
            cursor.style.width = `${size}px`;
            cursor.style.height = `${size}px`;
            cursor.style.background = isHovering.current
                ? 'rgba(139, 26, 43, 0.2)'
                : 'rgba(139, 26, 43, 0.85)';
            cursor.style.borderColor = isHovering.current
                ? '#C9A84C'
                : 'rgba(139, 26, 43, 0)';

            // Update trail positions
            let prev = cursorPos.current;
            trailPositions.current.forEach((pos, i) => {
                const lerpFactor = 0.12 - i * 0.01;
                pos.x += (prev.x - pos.x) * Math.max(lerpFactor, 0.04);
                pos.y += (prev.y - pos.y) * Math.max(lerpFactor, 0.04);
                prev = pos;

                const trail = trailRefs.current[i];
                if (trail) {
                    const dotSize = Math.max(6 - i, 2);
                    trail.style.transform = `translate(${pos.x - dotSize / 2}px, ${pos.y - dotSize / 2}px)`;
                    trail.style.opacity = String((1 - i / 8) * (isHovering.current ? 0.3 : 0.7));
                    trail.style.width = `${dotSize}px`;
                    trail.style.height = `${dotSize}px`;
                }
            });

            rafId.current = requestAnimationFrame(animate);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mouseover', handleMouseOver, { passive: true });
        rafId.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseover', handleMouseOver);
            cancelAnimationFrame(rafId.current);
        };
    }, []);

    if (isMobile) return null;

    return (
        <>
            {/* Main cursor */}
            <div
                ref={cursorRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 99999,
                    border: '1px solid transparent',
                    mixBlendMode: 'normal',
                    transition: 'width 0.2s ease, height 0.2s ease, background 0.2s ease, border-color 0.2s ease',
                    willChange: 'transform',
                }}
            />

            {/* Trail dots */}
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    ref={(el) => { if (el) trailRefs.current[i] = el; }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        borderRadius: '50%',
                        background: i < 4
                            ? `rgba(139, 26, 43, ${0.8 - i * 0.15})`
                            : `rgba(201, 168, 76, ${0.6 - (i - 4) * 0.12})`,
                        pointerEvents: 'none',
                        zIndex: 99998,
                        willChange: 'transform',
                    }}
                />
            ))}
        </>
    );
}

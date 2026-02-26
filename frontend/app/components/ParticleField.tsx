'use client';

import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 50;

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    size: number; opacity: number;
    color: string;
}

export default function ParticleField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mousePos = useRef({ x: -9999, y: -9999 });
    const particles = useRef<Particle[]>([]);
    const rafRef = useRef<number>(0);
    const frameCount = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const CRIMSON = 'rgba(139,26,43,';
        const GOLD = 'rgba(201,168,76,';

        // Init particles — no emoji, just dots
        particles.current = Array.from({ length: PARTICLE_COUNT }, () => {
            const sizeChoice = Math.random();
            const size = sizeChoice < 0.45 ? 1 : sizeChoice < 0.8 ? 2 : 3;
            const isCrimson = Math.random() > 0.5;
            const opacity = 0.2 + Math.random() * 0.45;
            return {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -(0.3 + Math.random() * 0.7),
                size,
                opacity,
                color: isCrimson ? CRIMSON : GOLD,
            };
        });

        const onMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', onMouseMove);

        const draw = () => {
            // Pause when tab not visible
            if (document.hidden) {
                rafRef.current = requestAnimationFrame(draw);
                return;
            }

            // Frame skipping — only update every 2nd frame
            frameCount.current++;
            if (frameCount.current % 2 !== 0) {
                rafRef.current = requestAnimationFrame(draw);
                return;
            }

            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const mx = mousePos.current.x;
            const my = mousePos.current.y;

            for (const p of particles.current) {
                // Mouse repulsion — only check within 100px grid cell
                const dx = p.x - mx;
                const dy = p.y - my;
                if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100 && dist > 0) {
                        const force = (100 - dist) / 100;
                        p.vx += (dx / dist) * force * 0.6;
                        p.vy += (dy / dist) * force * 0.6;
                    }
                }

                p.vx *= 0.97;
                p.vy = Math.max(-1.2, Math.min(-0.1, p.vy * 0.99));

                p.x += p.vx;
                p.y += p.vy;

                // Wrap
                if (p.y < -12) p.y = canvas.height + 12;
                if (p.x < -12) p.x = canvas.width + 12;
                if (p.x > canvas.width + 12) p.x = -12;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}${p.opacity})`;
                ctx.fill();
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}

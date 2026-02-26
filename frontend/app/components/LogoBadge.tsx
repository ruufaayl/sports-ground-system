'use client';

interface LogoBadgeProps {
    size?: number;
    spinning?: boolean;
    className?: string;
}

export default function LogoBadge({ size = 80, spinning = false, className = '' }: LogoBadgeProps) {
    const r = size / 2;
    const cx = r;
    const cy = r;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={className}
            style={spinning ? { animation: 'spin-slow 20s linear infinite' } : {}}
        >
            {/* Outer crimson circle */}
            <circle cx={cx} cy={cy} r={r - 1} fill="#8B1A2B" />

            {/* Outer ring */}
            <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={size * 0.015} />

            {/* Inner ring */}
            <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={size * 0.012} />

            {/* Stars on sides */}
            <text
                x={cx - r * 0.68}
                y={cy + size * 0.05}
                textAnchor="middle"
                fill="white"
                fontSize={size * 0.1}
                fontFamily="sans-serif"
                dominantBaseline="middle"
            >★</text>
            <text
                x={cx + r * 0.68}
                y={cy + size * 0.05}
                textAnchor="middle"
                fill="white"
                fontSize={size * 0.1}
                fontFamily="sans-serif"
                dominantBaseline="middle"
            >★</text>

            {/* Footballer silhouette (simplified SVG path centered) */}
            <g transform={`translate(${cx - size * 0.18}, ${cy - size * 0.26}) scale(${size / 200})`}>
                {/* Body */}
                <ellipse cx="36" cy="24" rx="12" ry="14" fill="white" opacity="0.95" />
                {/* Head */}
                <circle cx="36" cy="6" r="8" fill="white" opacity="0.95" />
                {/* Kicking leg */}
                <path d="M28 35 Q20 50 14 60 Q12 65 18 66 Q24 67 28 58 Q32 50 36 45" fill="white" opacity="0.9" />
                {/* Standing leg */}
                <path d="M38 38 Q40 52 42 62 Q43 68 50 67 Q56 66 54 60 Q50 52 46 40" fill="white" opacity="0.9" />
                {/* Ball */}
                <circle cx="10" cy="70" r="10" fill="white" opacity="0.9" />
                <path d="M5 66 Q10 62 15 66 M3 72 Q8 76 13 72" stroke="#8B1A2B" strokeWidth="1.5" fill="none" />
                {/* Arm */}
                <path d="M28 28 Q18 22 14 18" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9" />
                <path d="M44 28 Q52 22 56 20" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9" />
            </g>

            {/* Arc text — THE EXECUTIVE (top) */}
            <defs>
                <path
                    id="top-arc"
                    d={`M ${size * 0.1},${cy} A ${r * 0.88},${r * 0.88} 0 0,1 ${size * 0.9},${cy}`}
                />
                <path
                    id="bottom-arc"
                    d={`M ${size * 0.1},${cy} A ${r * 0.88},${r * 0.88} 0 0,0 ${size * 0.9},${cy}`}
                />
            </defs>

            <text fill="white" fontFamily="'Bebas Neue', 'Arial Black', sans-serif" fontSize={size * 0.09} letterSpacing={size * 0.008}>
                <textPath href="#top-arc" startOffset="12%">THE EXECUTIVE</textPath>
            </text>
            <text fill="white" fontFamily="'Bebas Neue', 'Arial Black', sans-serif" fontSize={size * 0.09} letterSpacing={size * 0.008}>
                <textPath href="#bottom-arc" startOffset="10%">CHAMPIONS FIELD</textPath>
            </text>
        </svg>
    );
}

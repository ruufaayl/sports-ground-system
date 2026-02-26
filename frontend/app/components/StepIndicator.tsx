'use client';

const STEP_NAMES = ['GROUND', 'SCHEDULE', 'DETAILS', 'PAYMENT'];

interface StepIndicatorProps {
    current: number;
}

export default function StepIndicator({ current }: StepIndicatorProps) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 0, marginBottom: 48 }}>
            {STEP_NAMES.map((name, i) => {
                const step = i + 1;
                const isDone = step < current;
                const isActive = step === current;
                return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            {/* Circle */}
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                transition: 'all 0.3s ease',
                                background: isActive ? '#8B1A2B' : isDone ? 'rgba(139,26,43,0.25)' : 'transparent',
                                border: isActive
                                    ? '2px solid #C9A84C'
                                    : isDone
                                        ? '1px solid rgba(139,26,43,0.6)'
                                        : '1px solid rgba(255,255,255,0.12)',
                                color: isActive ? '#fff' : isDone ? '#C9A84C' : 'rgba(255,255,255,0.3)',
                                fontFamily: "var(--font-ui)",
                                fontWeight: 700,
                                fontSize: 18,
                                boxShadow: isActive
                                    ? '0 0 24px rgba(139,26,43,0.6), 0 0 0 3px rgba(201,168,76,0.18)'
                                    : 'none',
                            }}>
                                {isDone ? '✓' : step}
                            </div>
                            {/* Label */}
                            <div style={{
                                fontFamily: "var(--font-ui)",
                                fontWeight: 600,
                                fontSize: 12,
                                letterSpacing: '0.08em',
                                marginTop: 7,
                                textTransform: 'uppercase',
                                color: isActive ? '#C9A84C' : isDone ? 'rgba(139,26,43,0.8)' : 'rgba(255,255,255,0.3)',
                                transition: 'color 0.3s ease',
                            }}>
                                {name}
                            </div>
                        </div>
                        {/* Connector line */}
                        {i < STEP_NAMES.length - 1 && (
                            <div style={{
                                width: 52,
                                height: 1,
                                background: isDone ? '#8B1A2B' : 'rgba(255,255,255,0.08)',
                                marginBottom: 22,
                                transition: 'background 0.3s ease',
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

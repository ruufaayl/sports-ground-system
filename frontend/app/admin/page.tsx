'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'staff'>('admin');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const headers = { 'x-admin-secret': password };

            // Step 1: Try admin endpoint
            const adminRes = await fetch(`${base}/api/reports/summary`, { headers });
            if (adminRes.ok) {
                localStorage.setItem('adminSecret', password);
                localStorage.setItem('adminRole', 'admin');
                router.push('/admin/dashboard');
                return;
            }

            // Step 2: If admin failed, try staff endpoint (tuck shop)
            const staffRes = await fetch(`${base}/api/tuckshop/today`, { headers });
            if (staffRes.ok) {
                localStorage.setItem('adminSecret', password);
                localStorage.setItem('adminRole', 'staff');
                router.push('/admin/tuckshop');
                return;
            }

            // Both failed
            setError('Invalid password');
        } catch {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleStyle = (active: boolean, color: string) => ({
        flex: 1 as const,
        height: 44,
        borderRadius: 2,
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
        background: active ? color : 'transparent',
        color: active && color === '#C9A84C' ? '#0D0608' : '#fff',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 700 as const,
        letterSpacing: '0.15em',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease',
    });

    return (
        <div style={{ minHeight: '100vh', background: '#0D0608', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{
                width: '100%', maxWidth: 400,
                background: 'rgba(139,26,43,0.06)',
                border: '1px solid rgba(139,26,43,0.25)',
                borderRadius: 4, padding: 48, textAlign: 'center',
            }}>
                <Image src="/logo.png" alt="ECF" width={80} height={80} style={{ marginBottom: 24 }} />
                <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '0.15em', marginBottom: 8 }}>
                    {role === 'admin' ? 'ADMIN ACCESS' : 'STAFF ACCESS'}
                </h1>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
                    Executive Champions Field
                </p>

                {/* Role Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button type="button" onClick={() => setRole('admin')} style={toggleStyle(role === 'admin', '#8B1A2B')}>
                        ADMIN
                    </button>
                    <button type="button" onClick={() => setRole('staff')} style={toggleStyle(role === 'staff', '#C9A84C')}>
                        STAFF
                    </button>
                </div>

                <form onSubmit={handleLogin}>
                    <input
                        type="password"
                        placeholder={role === 'admin' ? 'Enter admin password...' : 'Enter staff password...'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            width: '100%', background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 2, padding: '14px 16px',
                            color: '#fff', fontSize: 14, textAlign: 'center',
                            letterSpacing: '0.2em', fontFamily: 'var(--font-ui)',
                            outline: 'none', marginBottom: 16,
                        }}
                    />
                    {error && (
                        <div style={{
                            background: 'rgba(139,26,43,0.15)', border: '1px solid rgba(139,26,43,0.4)',
                            borderRadius: 2, padding: '10px 16px', color: '#8B1A2B', fontSize: 13,
                            fontFamily: 'var(--font-ui)', marginBottom: 16,
                        }}>
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-futuristic"
                        style={{ width: '100%' }}
                    >
                        {loading ? 'AUTHENTICATING...' : role === 'admin' ? 'ACCESS DASHBOARD' : 'ACCESS TUCK SHOP'}
                        {!loading && <span className="btn-arrow">→</span>}
                    </button>
                </form>
            </div>
        </div>
    );
}

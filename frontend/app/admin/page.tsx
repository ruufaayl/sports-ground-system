'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const res = await fetch(`${base}/api/reports/summary`, {
                headers: { 'x-admin-secret': password },
            });
            if (res.ok) {
                localStorage.setItem('adminSecret', password);
                router.push('/admin/dashboard');
            } else {
                setError('Invalid password');
            }
        } catch {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

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
                    ADMIN ACCESS
                </h1>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
                    Executive Champions Field
                </p>
                <form onSubmit={handleLogin}>
                    <input
                        type="password"
                        placeholder="Enter admin password..."
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
                        {loading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD'}
                        {!loading && <span className="btn-arrow">→</span>}
                    </button>
                </form>
            </div>
        </div>
    );
}

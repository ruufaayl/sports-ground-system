'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '🏠', emoji: true },
    { name: 'All Bookings', href: '/admin/bookings', icon: '📋', emoji: true },
    { name: 'Reports', href: '/admin/reports', icon: '📊', emoji: true },
    { name: 'Tuck Shop', href: '/admin/tuckshop', icon: '🛒', emoji: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const isLogin = pathname === '/admin';

    useEffect(() => {
        const secret = localStorage.getItem('adminSecret');
        if (!secret && !isLogin) { router.push('/admin'); return; }
        if (secret && isLogin) { router.push('/admin/dashboard'); return; }
        setIsAuthenticated(true);
    }, [pathname]);

    if (!isAuthenticated && !isLogin) return null;

    if (isLogin) {
        return (
            <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
                {children}
            </div>
        );
    }

    const handleLogout = () => { localStorage.removeItem('adminSecret'); router.push('/admin'); };

    return (
        <div style={{ display: 'flex', background: '#0a0a0f', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", color: '#fff' }}>

            {/* Mobile backdrop */}
            {isMobileOpen && (
                <div
                    onClick={() => setIsMobileOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 30 }}
                />
            )}

            {/* Mobile toggle */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                style={{
                    display: 'none', position: 'fixed', bottom: 20, right: 20, zIndex: 50,
                    width: 48, height: 48, borderRadius: '50%', border: 'none',
                    background: '#00ff88', color: '#000', fontSize: 18, cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(0,255,136,0.4)', fontWeight: 700,
                }}
                className="mobile-fab"
            >
                {isMobileOpen ? '✕' : '☰'}
            </button>

            <style>{`
        @media (max-width: 768px) {
          .mobile-fab { display: flex !important; align-items: center; justify-content: center; }
          .admin-sidebar { transform: ${isMobileOpen ? 'translateX(0)' : 'translateX(-100%)'}; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>

            {/* SIDEBAR */}
            <div
                className="admin-sidebar"
                style={{
                    width: 260, flexShrink: 0, position: 'sticky', top: 0,
                    height: '100vh', background: '#0d0d1a',
                    borderRight: '1px solid rgba(0,255,136,0.12)',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '4px 0 32px rgba(0,255,136,0.03)',
                    transition: 'transform 0.3s ease',
                    zIndex: 40,
                }}
            >
                {/* Logo  */}
                <div style={{ height: 80, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,136,255,0.2))',
                        border: '1px solid rgba(0,255,136,0.25)',
                    }}>⚡</div>
                    <div style={{ marginLeft: 12 }}>
                        <div style={{
                            fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em',
                            background: 'linear-gradient(135deg, #00ff88 0%, #0088ff 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            GROUND ADMIN
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Control Panel</div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '24px 12px 12px', overflow: 'auto' }}>
                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: 8, marginBottom: 8 }}>
                        MAIN MENU
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {NAV.map(link => {
                            const active = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        height: 44, padding: '0 16px', borderRadius: 10,
                                        fontSize: 14, fontWeight: active ? 600 : 500, textDecoration: 'none',
                                        borderLeft: `3px solid ${active ? '#00ff88' : 'transparent'}`,
                                        paddingLeft: 14,
                                        background: active ? 'rgba(0,255,136,0.08)' : 'transparent',
                                        color: active ? '#00ff88' : '#9ca3af',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = active ? '#00ff88' : '#e5e7eb'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(0,255,136,0.08)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = active ? '#00ff88' : '#9ca3af'; }}
                                >
                                    <span style={{ fontSize: 18, flexShrink: 0 }}>{link.icon}</span>
                                    <span>{link.name}</span>
                                    {active && (
                                        <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88', flexShrink: 0 }} />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer */}
                <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 8,
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, #00ff88, #0088ff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 900, color: '#000',
                        }}>A</div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Administrator</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>Super Admin</div>
                        </div>
                        <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88', flexShrink: 0 }} />
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%', height: 38, borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)',
                            background: 'rgba(239,68,68,0.07)', color: '#ef4444',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.07)')}
                    >
                        🚪 Sign Out
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                    {children}
                </main>
            </div>
        </div>
    );
}

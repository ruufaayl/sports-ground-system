'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const NAV_SECTIONS = [
    {
        label: 'OVERVIEW',
        items: [
            { name: 'Dashboard', href: '/admin/dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z' },
            { name: 'Live Availability', href: '/admin/availability', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z' },
        ],
    },
    {
        label: 'BOOKINGS',
        items: [
            { name: 'All Bookings', href: '/admin/bookings', icon: 'M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z' },
            { name: 'New Booking', href: '/admin/availability', icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', isPlus: true },
            { name: 'Calendar View', href: '/admin/calendar', icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z' },
        ],
    },
    {
        label: 'REPORTS',
        items: [
            { name: 'Daily Report', href: '/admin/reports', icon: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z' },
            { name: 'Tuck Shop', href: '/admin/tuckshop', icon: 'M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.16 14.26l.04-.12.94-1.7h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020.04 4H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.45C4.52 15.37 5.48 17 7 17h12v-2H7l1.16-2.74z' },
        ],
    },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isAuthed, setIsAuthed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const isLogin = pathname === '/admin';

    useEffect(() => {
        const s = localStorage.getItem('adminSecret');
        if (!s && !isLogin) { router.push('/admin'); return; }
        if (s && isLogin) { router.push('/admin/dashboard'); return; }
        setIsAuthed(true);
    }, [pathname, isLogin, router]);

    if (!isAuthed && !isLogin) return null;
    if (isLogin) return <div style={{ background: '#0D0608', minHeight: '100vh', fontFamily: 'var(--font-ui)' }}>{children}</div>;

    const handleLogout = () => { localStorage.removeItem('adminSecret'); router.push('/admin'); };

    return (
        <div style={{ display: 'flex', background: '#0D0608', minHeight: '100vh', fontFamily: 'var(--font-ui)', color: '#fff' }}>
            {/* Mobile backdrop */}
            {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 30 }} />}

            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="admin-mobile-fab"
                style={{
                    display: 'none', position: 'fixed', bottom: 20, right: 20, zIndex: 50,
                    width: 48, height: 48, borderRadius: '50%', border: 'none',
                    background: '#8B1A2B', color: '#fff', fontSize: 18, cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(139,26,43,0.4)', fontWeight: 700,
                    alignItems: 'center', justifyContent: 'center',
                }}
            >
                {mobileOpen ? '✕' : '☰'}
            </button>

            <style>{`
                @media (max-width: 768px) {
                    .admin-mobile-fab { display: flex !important; }
                    .admin-sidebar-v2 { position: fixed !important; z-index: 40; transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}; transition: transform 0.3s ease; }
                }
            `}</style>

            {/* ═══ SIDEBAR ═══ */}
            <div
                className="admin-sidebar-v2"
                style={{
                    width: 280, flexShrink: 0, position: 'sticky', top: 0,
                    height: '100vh', background: '#0d0608',
                    borderRight: '1px solid rgba(139,26,43,0.2)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Top: Logo + title */}
                <div style={{ padding: '20px 20px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <Image src="/logo.png" alt="ECF" width={56} height={56} style={{ flexShrink: 0 }} />
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, letterSpacing: '0.25em', color: '#fff' }}>
                            EXECUTIVE<br />ADMIN
                        </div>
                    </div>
                    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', marginBottom: 12 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 2px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00a651', boxShadow: '0 0 8px #00a651', animation: 'pulse-dot 2s infinite' }} />
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>SYSTEM ONLINE</span>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '8px 12px', overflow: 'auto' }}>
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.label}>
                            <div style={{
                                fontSize: 10, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase',
                                color: 'rgba(201,168,76,0.6)', margin: '24px 0 8px 8px', fontFamily: 'var(--font-ui)',
                            }}>
                                {section.label}
                            </div>
                            {section.items.map((item) => {
                                const active = pathname === item.href || (item.href !== '/admin/availability' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            height: 44, padding: '0 12px', borderRadius: 4,
                                            fontSize: 14, fontWeight: 500, textDecoration: 'none',
                                            borderLeft: `3px solid ${active ? '#8B1A2B' : 'transparent'}`,
                                            paddingLeft: 17,
                                            background: active ? 'rgba(139,26,43,0.2)' : 'transparent',
                                            color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(139,26,43,0.15)'; e.currentTarget.style.color = '#fff'; } }}
                                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? '#8B1A2B' : 'rgba(255,255,255,0.5)'} style={{ flexShrink: 0 }}>
                                            <path d={item.icon} />
                                        </svg>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div style={{ padding: 16, borderTop: '1px solid rgba(139,26,43,0.15)' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12, padding: '0 4px' }}>
                        Administrator
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%', height: 38, borderRadius: 2,
                            border: '1px solid rgba(139,26,43,0.4)',
                            background: 'transparent', color: '#8B1A2B',
                            fontSize: 12, fontWeight: 600, letterSpacing: '0.15em',
                            cursor: 'pointer', fontFamily: 'var(--font-ui)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#8B1A2B'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B1A2B'; }}
                    >
                        SIGN OUT
                    </button>
                </div>
            </div>

            {/* ═══ MAIN ═══ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                    {children}
                </main>
            </div>

            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}

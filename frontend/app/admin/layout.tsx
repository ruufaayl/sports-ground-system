'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // If we are on the login page itself, just render children without sidebar
    const isLoginPage = pathname === '/admin';

    useEffect(() => {
        const handleAuth = () => {
            const secret = localStorage.getItem('adminSecret');
            if (!secret && !isLoginPage) {
                router.push('/admin');
            } else if (secret && isLoginPage) {
                router.push('/admin/dashboard');
            } else {
                setIsAuthenticated(true);
            }
        };
        handleAuth();
    }, [pathname, router, isLoginPage]);

    if (!isAuthenticated && !isLoginPage) return null;

    if (isLoginPage) {
        return <div className="bg-[#0a0a0f] text-white min-h-screen font-sans">{children}</div>;
    }

    const handleLogout = () => {
        localStorage.removeItem('adminSecret');
        router.push('/admin');
    };

    const navLinks = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
        { name: 'All Bookings', href: '/admin/bookings', icon: '📅' },
        { name: 'Reports', href: '/admin/reports', icon: '📈' },
        { name: 'Tuck Shop', href: '/admin/tuckshop', icon: '🛒' },
    ];

    return (
        <div className="bg-[#0a0a0f] text-white min-h-screen font-sans flex">
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden fixed z-50 bottom-4 right-4 bg-[#00ff88] text-black p-4 rounded-full shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            >
                {isMobileMenuOpen ? '✕' : '☰'}
            </button>

            {/* Sidebar */}
            <div className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-[#1a1a2e] border-r border-green-500/20 flex flex-col z-40
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="p-6">
                    <h1 className="text-xl font-black tracking-widest text-[#00ff88] drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]">
                        ⚡ GROUND ADMIN
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 shadow-[inset_0_0_10px_rgba(0,255,136,0.1)]'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="text-xl">{link.icon}</span>
                                <span className="font-semibold tracking-wide">{link.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-4 py-3 rounded-xl transition-all border border-red-500/20"
                    >
                        <span>🚪</span>
                        <span className="font-bold tracking-widest">LOGOUT</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

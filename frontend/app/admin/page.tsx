'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/summary`, {
                headers: {
                    'x-admin-secret': password
                }
            });

            if (res.ok) {
                localStorage.setItem('adminSecret', password);
                router.push('/admin/dashboard');
            } else {
                setError('Invalid password');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1a1a2e] border border-green-500/20 rounded-2xl p-8 backdrop-blur-xl">
                <div className="text-center mb-10">
                    <div className="inline-block p-4 rounded-full bg-green-500/10 mb-4">
                        <svg className="w-8 h-8 text-[#00ff88]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-[#00ff88] tracking-widest drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                        ADMIN LOGIN
                    </h1>
                    <p className="text-gray-400 mt-2">Secure Gateway</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            placeholder="Enter Admin Password..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-green-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all text-center tracking-widest"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#00ff88] hover:bg-[#00cc6a] text-black font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_15px_rgba(0,255,136,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD'}
                    </button>
                </form>
            </div>
        </div>
    );
}

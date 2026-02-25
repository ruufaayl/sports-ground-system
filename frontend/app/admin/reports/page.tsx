'use client';

import { useState, useEffect } from 'react';

export default function AdminReports() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchReport(date);
    }, [date]);

    const fetchReport = async (selectedDate: string) => {
        if (!selectedDate) return;
        setIsLoading(true);
        const secret = localStorage.getItem('adminSecret');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/daily/${selectedDate}`, {
                headers: { 'x-admin-secret': secret || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            } else {
                setReport(null);
            }
        } catch (err) {
            console.error('Failed to load report:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendReport = async () => {
        const secret = localStorage.getItem('adminSecret');
        try {
            if (!confirm('Send today\'s daily report to WhatsApp?')) return;
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/send-daily`, {
                method: 'POST',
                headers: { 'x-admin-secret': secret || '' }
            });
            if (res.ok) {
                alert('Daily Report sent successfully!');
            } else {
                alert('Failed to send report.');
            }
        } catch (err) {
            console.error(err);
            alert('Error sending report.');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount || 0);
    };

    // Safe percentage calculator
    const calcPercent = (part: number, total: number) => {
        if (!total || total === 0) return 0;
        return Math.round((part / total) * 100);
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] uppercase">
                    Daily Revenue Report
                </h2>

                <div className="flex items-center space-x-4">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-[#1a1a2e] border border-[#00ff88]/30 rounded-xl px-4 py-2 focus:outline-none focus:border-[#00ff88] text-white font-mono shadow-[0_0_10px_rgba(0,255,136,0.1)]"
                    />
                    <button
                        onClick={handleSendReport}
                        className="bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border border-[#00ff88]/30 text-[#00ff88] px-4 py-2 flex items-center space-x-2 rounded-xl font-bold transition-colors shadow-[0_0_10px_rgba(0,255,136,0.2)]"
                    >
                        <span>📱</span>
                        <span>SEND WHATSAPP DASHBOARD</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center text-[#00ff88] text-xl font-bold animate-pulse">
                    Loading Financial Data...
                </div>
            ) : !report ? (
                <div className="bg-[#1a1a2e] border border-red-500/20 rounded-2xl p-10 text-center text-red-400">
                    No data found or failed to load.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* GRAND TOTAL */}
                    <div className="lg:col-span-2 bg-[#1a1a2e] border border-[#00ff88]/20 rounded-2xl p-8 shadow-[inset_0_0_20px_rgba(0,255,136,0.05)] text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent opacity-50"></div>
                        <h3 className="text-gray-400 font-bold tracking-widest mb-2">GRAND TOTAL ALL REVENUE</h3>
                        <p className="text-5xl font-black text-[#00ff88] drop-shadow-[0_0_15px_rgba(0,255,136,0.4)]">
                            {formatCurrency(report.grandTotal)}
                        </p>
                    </div>

                    {/* BOOKINGS BREAKDOWN */}
                    <div className="bg-[#1a1a2e] border border-blue-500/20 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-2 flex justify-between">
                            <span>🏟️ Bookings Revenue</span>
                            <span className="text-[#0088ff]">{formatCurrency(report.bookings.total)}</span>
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-1 text-sm font-bold">
                                    <span className="text-gray-400">Cash collection ({calcPercent(report.bookings.cash, report.bookings.total)}%)</span>
                                    <span className="text-white">{formatCurrency(report.bookings.cash)}</span>
                                </div>
                                <div className="w-full bg-black/50 rounded-full h-3">
                                    <div className="bg-green-500 h-3 rounded-full" style={{ width: `${calcPercent(report.bookings.cash, report.bookings.total)}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-1 text-sm font-bold">
                                    <span className="text-gray-400">Online transfers ({calcPercent(report.bookings.online, report.bookings.total)}%)</span>
                                    <span className="text-white">{formatCurrency(report.bookings.online)}</span>
                                </div>
                                <div className="w-full bg-black/50 rounded-full h-3">
                                    <div className="bg-[#0088ff] h-3 rounded-full" style={{ width: `${calcPercent(report.bookings.online, report.bookings.total)}%` }}></div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <h4 className="text-sm font-bold text-gray-500 mb-3 tracking-widest uppercase">By Ground Performance</h4>
                                <div className="space-y-3">
                                    {Object.entries(report.bookings.byGround).map(([name, amount]: any) => (
                                        <div key={name} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300 font-medium">{name}</span>
                                            <span className="font-mono text-[#00ff88]">{formatCurrency(amount)}</span>
                                        </div>
                                    ))}
                                    {Object.keys(report.bookings.byGround).length === 0 && (
                                        <div className="text-xs text-gray-500 italic">No bookings paid today.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TUCK SHOP BREAKDOWN */}
                    <div className="bg-[#1a1a2e] border border-orange-500/20 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-2 flex justify-between">
                            <span>🛒 Tuck Shop Sales</span>
                            <span className="text-orange-400">{formatCurrency(report.tuckShop.total)}</span>
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-1 text-sm font-bold">
                                    <span className="text-gray-400">Counter Cash ({calcPercent(report.tuckShop.cash, report.tuckShop.total)}%)</span>
                                    <span className="text-white">{formatCurrency(report.tuckShop.cash)}</span>
                                </div>
                                <div className="w-full bg-black/50 rounded-full h-3">
                                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${calcPercent(report.tuckShop.cash, report.tuckShop.total)}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-1 text-sm font-bold">
                                    <span className="text-gray-400">Digital Methods ({calcPercent(report.tuckShop.online, report.tuckShop.total)}%)</span>
                                    <span className="text-white">{formatCurrency(report.tuckShop.online)}</span>
                                </div>
                                <div className="w-full bg-black/50 rounded-full h-3">
                                    <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${calcPercent(report.tuckShop.online, report.tuckShop.total)}%` }}></div>
                                </div>
                            </div>

                            <div className="pt-4 mt-8 flex h-full items-center justify-center">
                                <div className="text-center p-4 bg-orange-500/5 rounded-xl border border-orange-500/10 w-full max-w-sm">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Combined Cash Flow</div>
                                    <div className="text-2xl font-black text-white">
                                        {formatCurrency(report.bookings.cash + report.tuckShop.cash)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

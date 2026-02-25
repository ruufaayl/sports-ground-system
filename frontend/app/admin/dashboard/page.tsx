'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
    const [summary, setSummary] = useState<any>(null);
    const [todayBookings, setTodayBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        const secret = localStorage.getItem('adminSecret');
        try {
            // 1. Fetch Summary KPIs
            const sumRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/summary`, {
                headers: { 'x-admin-secret': secret || '' }
            });
            if (sumRes.ok) {
                const sumData = await sumRes.json();
                setSummary(sumData);
            }

            // 2. Fetch Today's Bookings
            const bookRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/today`, {
                headers: { 'x-admin-secret': secret || '' }
            });
            if (bookRes.ok) {
                const bookData = await bookRes.json();
                setTodayBookings(bookData.bookings || []);
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleMarkPaid = async (bookingRef: string) => {
        const secret = localStorage.getItem('adminSecret');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/${bookingRef}/confirm-payment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secret || ''
                },
                body: JSON.stringify({
                    paymentMethod: 'cash',
                    transactionId: 'CASH-' + Date.now()
                })
            });
            if (res.ok) {
                fetchDashboardData(); // Refresh table
            }
        } catch (err) {
            console.error('Failed to mark paid:', err);
        }
    };

    const handleSendReport = async () => {
        const secret = localStorage.getItem('adminSecret');
        try {
            if (!confirm('Send Daily Report to WhatsApp?')) return;
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/send-daily`, {
                method: 'POST',
                headers: { 'x-admin-secret': secret || '' }
            });
            if (res.ok) {
                alert('Report sent successfully!');
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

    // Group bookings by ground for the availability visual
    const groundsMap: Record<string, any[]> = {};
    ['G1', 'G2', 'G3', 'G4', 'G5'].forEach(g => groundsMap[g] = []);

    todayBookings.forEach(b => {
        const gName = b.grounds?.name || 'Unknown';
        if (!groundsMap[gName]) groundsMap[gName] = [];
        groundsMap[gName].push(b);
    });

    if (isLoading) {
        return <div className="flex justify-center items-center h-64 text-[#00ff88]">Loading Dashboard...</div>;
    }

    return (
        <div className="space-y-8 pb-10 gap-6 w-full">
            <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                DASHBOARD OVERVIEW
            </h2>

            {/* SECTION 1: Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "TODAY'S REVENUE", value: formatCurrency(summary?.revenueToday) },
                    { title: "THIS MONTH'S REVENUE", value: formatCurrency(summary?.totalRevenueThisMonth) },
                    { title: "TODAY'S BOOKINGS", value: summary?.bookingsToday?.toString() || '0' },
                    { title: "THIS MONTH'S BOOKINGS", value: summary?.totalBookingsThisMonth?.toString() || '0' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-[#1a1a2e] border border-green-500/20 rounded-2xl p-6 shadow-[inset_0_0_20px_rgba(0,255,136,0.05)]">
                        <h3 className="text-gray-400 text-sm font-bold tracking-wider mb-2">{kpi.title}</h3>
                        <p className="text-3xl font-black text-[#00ff88] drop-shadow-[0_0_10px_rgba(0,255,136,0.4)]">
                            {kpi.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* SECTION 4: Quick Actions */}
            <div className="bg-[#1a1a2e] border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">QUICK ACTIONS</h3>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={handleSendReport}
                        className="flex-1 min-w-[200px] bg-blue-500/10 hover:bg-blue-500/20 text-[#0088ff] border border-blue-500/30 rounded-xl py-3 px-4 font-bold tracking-wide transition-all shadow-[0_0_10px_rgba(0,136,255,0.1)] hover:shadow-[0_0_15px_rgba(0,136,255,0.3)]"
                    >
                        📤 SEND DAILY REPORT
                    </button>
                    <a
                        href="/admin/reports"
                        className="flex-1 min-w-[200px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl py-3 px-4 font-bold tracking-wide transition-all text-center shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    >
                        📊 VIEW WEEKLY REPORT
                    </a>
                    <a
                        href="/admin/tuckshop"
                        className="flex-1 min-w-[200px] bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl py-3 px-4 font-bold tracking-wide transition-all text-center shadow-[0_0_10px_rgba(249,115,22,0.1)] hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                    >
                        🥤 ADD TUCK SHOP SALE
                    </a>
                </div>
            </div>

            {/* SECTION 3: Ground Availability (Today) */}
            <div>
                <h3 className="text-2xl font-bold text-white mb-4">GROUND AVAILABILITY (TODAY)</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(groundsMap).map(([ground, slots]) => (
                        <div key={ground} className="bg-[#1a1a2e] border border-gray-700 rounded-xl p-4 flex flex-col items-center">
                            <div className="text-xl font-black text-[#00ff88] mb-4">{ground}</div>
                            <div className="w-full space-y-2">
                                {slots.length === 0 ? (
                                    <div className="text-sm text-center text-green-500/50 bg-green-500/10 py-2 rounded">Fully Free</div>
                                ) : (
                                    slots.map((b, idx) => {
                                        const isCancelled = b.booking_status === 'cancelled';
                                        return (
                                            <div
                                                key={idx}
                                                className={`text-xs text-center py-2 rounded font-mono font-bold
                          ${isCancelled ? 'bg-gray-800 text-gray-500 line-through' : 'bg-red-500/20 text-red-400 border border-red-500/20'}
                        `}
                                            >
                                                {b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 2: Today's Bookings Table */}
            <div className="bg-[#1a1a2e] border border-green-500/20 rounded-2xl p-6 overflow-hidden">
                <h3 className="text-2xl font-bold text-white mb-6">TODAY'S BOOKINGS</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-sm tracking-wider">
                                <th className="pb-3 px-4">BOOKING REF</th>
                                <th className="pb-3 px-4">GROUND</th>
                                <th className="pb-3 px-4">CUSTOMER</th>
                                <th className="pb-3 px-4">TIME</th>
                                <th className="pb-3 px-4">DURATION</th>
                                <th className="pb-3 px-4">AMOUNT</th>
                                <th className="pb-3 px-4 text-center">STATUS</th>
                                <th className="pb-3 px-4 text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {todayBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500 italic">No bookings scheduled for today.</td>
                                </tr>
                            ) : (
                                todayBookings.map((b) => {
                                    const isPaid = b.payment_status === 'paid';
                                    const isCancelled = b.booking_status === 'cancelled';
                                    return (
                                        <tr key={b.booking_ref} className={`transition-colors hover:bg-white/5 ${isCancelled ? 'opacity-50' : ''}`}>
                                            <td className="py-4 px-4 font-mono text-[#00ff88]">{b.booking_ref}</td>
                                            <td className="py-4 px-4 font-bold">{b.grounds?.name || b.ground_id}</td>
                                            <td className="py-4 px-4">
                                                <div>{b.customer_name}</div>
                                                <div className="text-xs text-gray-500">{b.customer_phone}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}
                                            </td>
                                            <td className="py-4 px-4">{b.duration_hours}h</td>
                                            <td className="py-4 px-4">{formatCurrency(b.base_price)}</td>
                                            <td className="py-4 px-4 text-center">
                                                {isCancelled ? (
                                                    <span className="bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded-full border border-red-500/20 font-bold">CANCELLED</span>
                                                ) : isPaid ? (
                                                    <span className="bg-green-500/20 text-[#00ff88] text-xs px-2 py-1 rounded-full border border-green-500/20 font-bold">PAID</span>
                                                ) : (
                                                    <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-full border border-orange-500/20 font-bold">PENDING</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {!isPaid && !isCancelled && (
                                                    <button
                                                        onClick={() => handleMarkPaid(b.booking_ref)}
                                                        className="bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold px-3 py-1 rounded shadow-[0_0_10px_rgba(249,115,22,0.4)] transition-transform hover:scale-105"
                                                    >
                                                        MARK PAID
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

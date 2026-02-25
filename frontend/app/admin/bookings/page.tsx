'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminBookings() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [page, setPage] = useState(1);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [groundId, setGroundId] = useState('');
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');

    const fetchBookings = useCallback(async () => {
        setIsLoading(true);
        const secret = localStorage.getItem('adminSecret');
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (groundId) params.append('ground_id', groundId);
            if (status) params.append('status', status);
            if (search) params.append('search', search);

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/all?${params.toString()}`, {
                headers: { 'x-admin-secret': secret || '' }
            });

            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
                setTotalRecords(data.total);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to load bookings:', err);
        } finally {
            setIsLoading(false);
        }
    }, [page, dateFrom, dateTo, groundId, status, search]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [dateFrom, dateTo, groundId, status, search]);

    const handleMarkPaid = async (bookingRef: string) => {
        const secret = localStorage.getItem('adminSecret');
        try {
            if (!confirm(`Mark booking ${bookingRef} as Paid via Cash?`)) return;
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
            if (res.ok) fetchBookings();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCancel = async (bookingRef: string) => {
        const secret = localStorage.getItem('adminSecret');
        try {
            if (!confirm(`Are you sure you want to CANCEL booking ${bookingRef}?`)) return;
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bookings/${bookingRef}/cancel`, {
                method: 'PUT',
                headers: { 'x-admin-secret': secret || '' }
            });
            if (res.ok) {
                fetchBookings();
            } else {
                const errData = await res.json();
                alert(errData.error || 'Failed to cancel');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const exportCSV = () => {
        if (bookings.length === 0) return;

        const headers = ['Ref', 'Ground', 'Customer', 'Phone', 'Date', 'Time', 'Duration', 'Total Amount', 'Advance', 'Remaining', 'Booking Status', 'Payment Status'];
        const rows = bookings.map(b => [
            b.booking_ref,
            b.grounds?.name || b.ground_id,
            b.customer_name,
            b.customer_phone,
            b.date,
            `${b.start_time}-${b.end_time}`,
            b.duration_hours,
            b.base_price,
            b.advance_amount,
            b.remaining_amount,
            b.booking_status,
            b.payment_status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount || 0);
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    ALL BOOKINGS
                </h2>
                <button
                    onClick={exportCSV}
                    className="bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500 hover:text-white transition-colors px-4 py-2 rounded-xl font-bold flex items-center space-x-2 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                >
                    <span>📥</span>
                    <span>EXPORT CSV</span>
                </button>
            </div>

            {/* FILTER BAR */}
            <div className="bg-[#1a1a2e] border border-blue-500/20 rounded-2xl p-4 flex flex-wrap gap-4 items-end shadow-lg">
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-gray-400 font-bold mb-1">DATE FROM</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 focus:border-[#00ff88] outline-none text-white text-sm" />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-gray-400 font-bold mb-1">DATE TO</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 focus:border-[#00ff88] outline-none text-white text-sm" />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-gray-400 font-bold mb-1">GROUND</label>
                    <select value={groundId} onChange={e => setGroundId(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#00ff88] outline-none">
                        <option value="">All Grounds</option>
                        <option value="f5d72f2e-ecb4-4e20-968e-0b13bed58d10">Ground 1 (7v7)</option>
                        <option value="a1c9e83f-1d2b-4e8c-9e20-1b23ced58d11">Ground 2 (7v7)</option>
                        <option value="b2d8f74a-2e3c-4f9d-8f31-2c34ded58d12">Ground 3 (7v7)</option>
                        <option value="c3e9a85b-3f4d-4a0e-9042-3d45eed58d13">Ground 4 (9v9)</option>
                        <option value="d4f0b96c-4a5e-4b1f-a153-4e56fed58d14">Ground 5 (11v11)</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-gray-400 font-bold mb-1">STATUS</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#00ff88] outline-none">
                        <option value="">All Statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div className="flex-[2] min-w-[200px]">
                    <label className="block text-xs text-gray-400 font-bold mb-1">SEARCH (PHONE/REF)</label>
                    <input type="text" placeholder="e.g. 0300... or GS-123..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 focus:border-[#00ff88] outline-none text-white text-sm" />
                </div>
                <div className="min-w-[100px]">
                    <button onClick={() => { setDateFrom(''); setDateTo(''); setGroundId(''); setStatus(''); setSearch(''); }} className="w-full text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 px-2 rounded-lg border border-red-500/30 transition-colors">
                        CLEAR
                    </button>
                </div>
            </div>

            {/* DATA TABLE */}
            <div className="bg-[#1a1a2e] border border-green-500/20 rounded-2xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,255,136,0.05)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-gray-800 bg-black/40 text-gray-400 text-xs tracking-wider">
                                <th className="py-4 px-4">REF</th>
                                <th className="py-4 px-4">GROUND</th>
                                <th className="py-4 px-4">CUSTOMER</th>
                                <th className="py-4 px-4">DATE & TIME</th>
                                <th className="py-4 px-4">TOTAL</th>
                                <th className="py-4 px-4">ADVANCE</th>
                                <th className="py-4 px-4">REMAINING</th>
                                <th className="py-4 px-4 text-center">STATUS</th>
                                <th className="py-4 px-4 text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50 text-sm">
                            {isLoading ? (
                                <tr><td colSpan={9} className="text-center py-10 text-[#00ff88]">Loading...</td></tr>
                            ) : bookings.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-10 text-gray-500 italic">No bookings found matching filters.</td></tr>
                            ) : (
                                bookings.map((b) => {
                                    const isPaid = b.payment_status === 'paid';
                                    const isCancelled = b.booking_status === 'cancelled';
                                    return (
                                        <tr key={b.booking_ref} className={`transition-colors hover:bg-white/5 ${isCancelled ? 'opacity-40' : ''}`}>
                                            <td className="py-3 px-4 font-mono text-[#00ff88]">{b.booking_ref}</td>
                                            <td className="py-3 px-4 font-bold">{b.grounds?.name || b.ground_id}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-white">{b.customer_name}</div>
                                                <div className="text-xs text-gray-400">{b.customer_phone}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-gray-300">{b.date}</div>
                                                <div className="text-xs text-gray-500">{b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)} ({b.duration_hours}h)</div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-300">{formatCurrency(b.base_price)}</td>
                                            <td className="py-3 px-4 text-gray-300">{formatCurrency(b.advance_amount)}</td>
                                            <td className="py-3 px-4 font-bold text-[#00ff88]">{formatCurrency(b.remaining_amount)}</td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex flex-col gap-1 items-center justify-center">
                                                    {isCancelled ? (
                                                        <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded-sm border border-red-500/20 font-bold uppercase w-16 text-center">CANCELLED</span>
                                                    ) : (
                                                        <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-sm border border-green-500/20 font-bold uppercase w-16 text-center">CONFIRM</span>
                                                    )}
                                                    {!isCancelled && (
                                                        isPaid ?
                                                            <span className="bg-blue-500/20 text-[#0088ff] text-[10px] px-2 py-0.5 rounded-sm border border-blue-500/20 font-bold uppercase w-16 text-center">PAID</span> :
                                                            <span className="bg-orange-500/20 text-orange-400 text-[10px] px-2 py-0.5 rounded-sm border border-orange-500/20 font-bold uppercase w-16 text-center">PENDING</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex justify-center items-center gap-2">
                                                    {!isPaid && !isCancelled && (
                                                        <button
                                                            onClick={() => handleMarkPaid(b.booking_ref)}
                                                            className="bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-black border border-orange-500/30 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                                                        >
                                                            PAY CASH
                                                        </button>
                                                    )}
                                                    {!isCancelled && (
                                                        <button
                                                            onClick={() => handleCancel(b.booking_ref)}
                                                            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                                                        >
                                                            CANCEL
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-800 bg-black/20 flex justify-between items-center text-sm">
                        <div className="text-gray-400">Total Records: <span className="text-white font-bold">{totalRecords}</span></div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="bg-[#1a1a2e] border border-gray-600 px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-1 bg-white/5 rounded border border-gray-800 font-mono text-[#00ff88]">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="bg-[#1a1a2e] border border-gray-600 px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

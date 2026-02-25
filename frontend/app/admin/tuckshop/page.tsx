'use client';

import { useState, useEffect } from 'react';

export default function AdminTuckShop() {
    const [sales, setSales] = useState<any[]>([]);
    const [totals, setTotals] = useState({ total: 0, cash: 0, online: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const fetchTodaySales = async () => {
        setIsLoading(true);
        const secret = localStorage.getItem('adminSecret');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tuckshop/today`, {
                headers: { 'x-admin-secret': secret || '' }
            });
            if (res.ok) {
                const data = await res.json();
                const salesList = data.sales || [];
                setSales(salesList);

                // Calculate breakdown
                let cash = 0, online = 0, total = 0;
                salesList.forEach((s: any) => {
                    const amt = Number(s.total_price);
                    total += amt;
                    if (s.payment_method === 'cash') cash += amt;
                    else online += amt;
                });
                setTotals({ total, cash, online });
            }
        } catch (err) {
            console.error('Failed to load tuck shop sales:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTodaySales();
    }, []);

    const handleAddSale = async (e: React.FormEvent) => {
        e.preventDefault();
        const secret = localStorage.getItem('adminSecret');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tuckshop/sale`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secret || ''
                },
                body: JSON.stringify({ itemName, quantity, unitPrice, paymentMethod })
            });
            if (res.ok) {
                setIsModalOpen(false);
                // Reset form
                setItemName('');
                setQuantity(1);
                setUnitPrice(0);
                setPaymentMethod('cash');
                // Refresh table
                fetchTodaySales();
            } else {
                const errData = await res.json();
                alert(errData.error || 'Failed to add sale');
            }
        } catch (err) {
            console.error(err);
            alert('Error submitting sale');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount || 0);
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] uppercase">
                    Tuck Shop POS
                </h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/50 text-orange-400 px-6 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                >
                    ➕ ADD SALE
                </button>
            </div>

            {/* TODAY'S TOTALS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1a1a2e] border border-orange-500/20 rounded-2xl p-6 shadow-[inset_0_0_20px_rgba(249,115,22,0.05)] text-center">
                    <h3 className="text-gray-400 font-bold tracking-widest mb-2">TODAY'S TOTAL</h3>
                    <p className="text-4xl font-black text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                        {formatCurrency(totals.total)}
                    </p>
                </div>
                <div className="bg-[#1a1a2e] border border-green-500/20 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center">
                    <h3 className="text-gray-400 font-bold tracking-widest mb-2">CASH COLLECTION</h3>
                    <p className="text-3xl font-black text-[#00ff88]">{formatCurrency(totals.cash)}</p>
                </div>
                <div className="bg-[#1a1a2e] border border-blue-500/20 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center">
                    <h3 className="text-gray-400 font-bold tracking-widest mb-2">ONLINE TRANSFERS</h3>
                    <p className="text-3xl font-black text-[#0088ff]">{formatCurrency(totals.online)}</p>
                </div>
            </div>

            {/* SALES TABLE */}
            <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl overflow-hidden shadow-xl mt-8">
                <div className="p-4 border-b border-gray-800 bg-black/20">
                    <h3 className="font-bold text-white tracking-widest">TODAY'S TRANSACTIONS</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-gray-800 bg-black/40 text-gray-400 text-xs tracking-wider">
                                <th className="py-4 px-4">TIME</th>
                                <th className="py-4 px-4 w-1/3">ITEM</th>
                                <th className="py-4 px-4 text-center">QTY</th>
                                <th className="py-4 px-4 text-right">UNIT PRICE</th>
                                <th className="py-4 px-4 text-right">TOTAL</th>
                                <th className="py-4 px-4 text-center">PAYMENT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50 text-sm">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-10 text-orange-400">Loading sales...</td></tr>
                            ) : sales.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-500 italic">No sales recorded today.</td></tr>
                            ) : (
                                sales.map((s) => (
                                    <tr key={s.id} className="transition-colors hover:bg-white/5">
                                        <td className="py-3 px-4 font-mono text-gray-500">
                                            {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-white">{s.item_name}</td>
                                        <td className="py-3 px-4 text-center text-gray-300">{s.quantity}</td>
                                        <td className="py-3 px-4 text-right text-gray-400">{formatCurrency(s.unit_price)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-orange-400">{formatCurrency(s.total_price)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-sm border font-bold uppercase ${s.payment_method === 'cash' ? 'bg-green-500/20 text-[#00ff88] border-green-500/20' : 'bg-blue-500/20 text-[#0088ff] border-blue-500/20'}`}>
                                                {s.payment_method}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* POS MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a2e] border border-orange-500/30 rounded-2xl w-full max-w-md p-6 shadow-[0_0_30px_rgba(249,115,22,0.15)] animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-orange-400 mb-6 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)] tracking-widest">
                            NEW SALE
                        </h2>

                        <form onSubmit={handleAddSale} className="space-y-4 text-sm font-medium">
                            <div>
                                <label className="block text-gray-400 mb-1 tracking-widest text-xs">ITEM NAME</label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    placeholder="e.g. Water Bottle"
                                    value={itemName}
                                    onChange={e => setItemName(e.target.value)}
                                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 mb-1 tracking-widest text-xs">QUANTITY</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={quantity}
                                        onChange={e => setQuantity(Number(e.target.value))}
                                        className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 tracking-widest text-xs">UNIT PRICE (PKR)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={unitPrice || ''}
                                        onChange={e => setUnitPrice(Number(e.target.value))}
                                        className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-1 tracking-widest text-xs mt-2">PAYMENT METHOD</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['cash', 'easypaisa', 'jazzcash'].map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-3 rounded-xl border font-bold uppercase text-[10px] tracking-widest transition-all ${paymentMethod === method
                                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500 shadow-[inset_0_0_10px_rgba(249,115,22,0.2)]'
                                                    : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-black/50 border border-orange-500/20 rounded-xl p-4 mt-6 flex justify-between items-center text-xl">
                                <span className="text-gray-400 tracking-widest text-sm">TOTAL</span>
                                <span className="font-black text-orange-400">{formatCurrency(quantity * unitPrice)}</span>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-orange-500 hover:bg-orange-400 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-transform hover:scale-105"
                                >
                                    PROCESS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

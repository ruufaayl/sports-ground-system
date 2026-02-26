'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function pad2(n: number) { return String(n).padStart(2, '0'); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function currentMonth() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function shiftMonth(m: string, delta: number) { const [y, mon] = m.split('-').map(Number); const d = new Date(y, mon - 1 + delta, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function fmt(n: number) { return Math.round(n).toLocaleString('en-PK'); }

// Dynamic import recharts to avoid SSR issues
const RechartsComponents = dynamic(() => import('./ReportsCharts'), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading charts...</div> });

type Tab = 'daily' | 'weekly' | 'monthly';

interface DailyReport {
    date: string;
    bookings: { total: number; count: number; cash: number; online: number; byGround: Record<string, number>; byHour: Record<string, number> };
    tuckShop: { total: number; cash: number; online: number; count: number };
    grandTotal: number;
    peakHour: string | null;
    occupancyRate: number;
}

interface WeeklyDay {
    date: string; dayName: string; bookingRevenue: number; bookingCount: number; tuckRevenue: number; total: number;
}

interface MonthlyReport {
    month: string; totalRevenue: number; totalBookings: number; avgDailyRevenue: number;
    bestDay: { date: string | null; revenue: number };
    bestGround: { name: string | null; revenue: number };
    byGround: Record<string, { revenue: number; count: number }>;
    byWeek: Array<{ week: number; revenue: number; count: number }>;
    peakHours: Array<{ hour: string; count: number }>;
    paymentSplit: { cash: number; online: number };
    dailyRevenue: Array<{ date: string; day: number; revenue: number }>;
}

export default function ReportsPage() {
    const [tab, setTab] = useState<Tab>('daily');
    const [dailyDate, setDailyDate] = useState(todayStr());
    const [daily, setDaily] = useState<DailyReport | null>(null);
    const [weekly, setWeekly] = useState<WeeklyDay[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth());
    const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
    const [sending, setSending] = useState(false);

    const adminSecret = typeof window !== 'undefined' ? localStorage.getItem('adminSecret') || '' : '';

    const loadDaily = useCallback(async () => {
        try {
            const res = await fetch(`${BASE}/api/reports/daily/${dailyDate}`, { headers: { 'x-admin-secret': adminSecret } });
            setDaily(await res.json());
        } catch { /* ignore */ }
    }, [dailyDate, adminSecret]);

    const loadWeekly = useCallback(async () => {
        try {
            const res = await fetch(`${BASE}/api/reports/weekly`, { headers: { 'x-admin-secret': adminSecret } });
            setWeekly(await res.json());
        } catch { /* ignore */ }
    }, [adminSecret]);

    const loadMonthly = useCallback(async () => {
        try {
            const res = await fetch(`${BASE}/api/reports/monthly?month=${selectedMonth}`, { headers: { 'x-admin-secret': adminSecret } });
            setMonthly(await res.json());
        } catch { /* ignore */ }
    }, [selectedMonth, adminSecret]);

    useEffect(() => { if (tab === 'daily') loadDaily(); }, [tab, loadDaily]);
    useEffect(() => { if (tab === 'weekly') loadWeekly(); }, [tab, loadWeekly]);
    useEffect(() => { if (tab === 'monthly') loadMonthly(); }, [tab, loadMonthly]);

    const handleSendWhatsApp = async () => {
        setSending(true);
        try { await fetch(`${BASE}/api/reports/send-daily`, { method: 'POST', headers: { 'x-admin-secret': adminSecret } }); alert('Report sent to WhatsApp!'); }
        catch { alert('Failed to send'); }
        finally { setSending(false); }
    };

    return (
        <div>
            <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', margin: '0 0 24px' }}>REPORTS</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['daily', 'weekly', 'monthly'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        background: tab === t ? '#8B1A2B' : 'transparent',
                        border: `1px solid ${tab === t ? '#8B1A2B' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: 2, color: '#fff', fontSize: 13, fontWeight: 600,
                        padding: '10px 24px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>{t}</button>
                ))}
            </div>

            {/* Pass data to charts component */}
            <RechartsComponents
                tab={tab}
                daily={daily}
                dailyDate={dailyDate}
                setDailyDate={setDailyDate}
                weekly={weekly}
                monthly={monthly}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                shiftMonth={shiftMonth}
                sending={sending}
                handleSendWhatsApp={handleSendWhatsApp}
                fmt={fmt}
            />
        </div>
    );
}

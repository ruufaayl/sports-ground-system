'use client';

import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    AreaChart, Area, ResponsiveContainer, Legend,
} from 'recharts';

/* eslint-disable @typescript-eslint/no-explicit-any */

const CRIMSON = '#8B1A2B';
const GOLD = '#C9A84C';
const GREEN = '#00a651';
const BLUE = '#0088ff';

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

interface Props {
    tab: 'daily' | 'weekly' | 'monthly';
    daily: DailyReport | null;
    dailyDate: string;
    setDailyDate: (d: string) => void;
    weekly: WeeklyDay[];
    monthly: MonthlyReport | null;
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    shiftMonth: (m: string, delta: number) => string;
    sending: boolean;
    handleSendWhatsApp: () => void;
    fmt: (n: number) => string;
}

const DarkTooltipStyle = {
    contentStyle: { background: '#111218', border: '1px solid rgba(139,26,43,0.4)', borderRadius: 4, fontFamily: 'Roboto Flex, sans-serif', fontSize: 13, color: '#fff' },
    labelStyle: { color: GOLD, fontWeight: 600 },
};

export default function ReportsCharts({ tab, daily, dailyDate, setDailyDate, weekly, monthly, selectedMonth, setSelectedMonth, shiftMonth, sending, handleSendWhatsApp, fmt }: Props) {
    // ═══ DAILY TAB ═══
    if (tab === 'daily') {
        if (!daily) return <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)', padding: 40, textAlign: 'center' }}>Loading daily report...</div>;

        const pieData = [
            { name: 'Booking Cash', value: daily.bookings.cash, color: CRIMSON },
            { name: 'Booking Online', value: daily.bookings.online, color: GOLD },
            { name: 'Tuck Shop', value: daily.tuckShop.total, color: BLUE },
        ].filter(d => d.value > 0);

        const groundData = Object.entries(daily.bookings.byGround).map(([name, amount]) => ({ name, amount }));

        const hourData = Array.from({ length: 18 }, (_, i) => {
            const h = i + 6; // 6AM to 11PM
            const key = String(h).padStart(2, '0');
            const label = `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`;
            return { hour: label, bookings: daily.bookings.byHour[key] || 0, isPeak: daily.peakHour === key + ':00' };
        });

        const paymentDonut = [
            { name: 'Cash', value: daily.bookings.cash, color: CRIMSON },
            { name: 'Online', value: daily.bookings.online, color: GOLD },
        ].filter(d => d.value > 0);

        return (
            <div>
                {/* Date + WhatsApp */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
                    <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{
                        background: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, color: '#fff',
                        fontSize: 13, padding: '8px 12px', fontFamily: 'var(--font-ui)', outline: 'none', colorScheme: 'dark',
                    }} />
                    <button onClick={handleSendWhatsApp} disabled={sending} className="btn-futuristic" style={{ fontSize: 11, height: 40, padding: '0 20px' }}>
                        {sending ? 'SENDING...' : 'SEND TO WHATSAPP'}
                    </button>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'TOTAL REVENUE', value: `PKR ${fmt(daily.grandTotal)}`, accent: GREEN },
                        { label: 'TOTAL BOOKINGS', value: String(daily.bookings.count), accent: CRIMSON },
                        { label: 'OCCUPANCY', value: `${daily.occupancyRate}%`, accent: GOLD },
                    ].map(c => (
                        <div key={c.label} style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 20, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{c.label}</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, color: '#fff' }}>{c.value}</div>
                        </div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="reports-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    {/* Revenue Split Pie */}
                    <ChartCard title="REVENUE SPLIT">
                        <ResponsiveContainer width="100%" height={250} className="reports-chart-container">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={(({ name, value }: any) => `${name}: ${fmt(value)}`) as any} labelLine={false}>
                                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Revenue by Ground */}
                    <ChartCard title="REVENUE BY GROUND">
                        <ResponsiveContainer width="100%" height={250} className="reports-chart-container">
                            <BarChart data={groundData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Roboto Flex' }} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                                <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                <Bar dataKey="amount" fill={CRIMSON} radius={[4, 4, 0, 0]} label={{ fill: '#fff', fontSize: 10, position: 'top' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Bookings by Hour */}
                    <ChartCard title="BOOKINGS BY HOUR">
                        <ResponsiveContainer width="100%" height={250} className="reports-chart-container">
                            <BarChart data={hourData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'Roboto Flex' }} interval={1} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                                <Tooltip {...DarkTooltipStyle} />
                                <Bar dataKey="bookings" fill={CRIMSON}>
                                    {hourData.map((entry, i) => <Cell key={i} fill={entry.isPeak ? GOLD : CRIMSON} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Payment Method Donut */}
                    <ChartCard title="PAYMENT METHOD">
                        <ResponsiveContainer width="100%" height={250} className="reports-chart-container">
                            <PieChart>
                                <Pie data={paymentDonut} cx="50%" cy="50%" outerRadius={90} innerRadius={60} dataKey="value">
                                    {paymentDonut.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                <Legend formatter={((value: any) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}</span>) as any} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>TOTAL</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 800, color: '#fff' }}>PKR {fmt(daily.bookings.total)}</div>
                        </div>
                    </ChartCard>
                </div>
            </div>
        );
    }

    // ═══ WEEKLY TAB ═══
    if (tab === 'weekly') {
        const summaryTotal = weekly.reduce((s, d) => s + d.total, 0);
        const summaryBookings = weekly.reduce((s, d) => s + d.bookingCount, 0);

        return (
            <div>
                {/* Grouped Bar Chart */}
                <ChartCard title="7-DAY REVENUE">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weekly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="dayName" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Roboto Flex' }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                            <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                            <Legend formatter={((value: any) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}</span>) as any} />
                            <Bar dataKey="bookingRevenue" name="Bookings" fill={CRIMSON} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="tuckRevenue" name="Tuck Shop" fill={GOLD} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Booking Count Line */}
                <ChartCard title="DAILY BOOKING COUNT" style={{ marginTop: 16 }}>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={weekly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="dayName" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Roboto Flex' }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                            <Tooltip {...DarkTooltipStyle} />
                            <Area type="monotone" dataKey="bookingCount" name="Bookings" stroke={CRIMSON} fill={`${CRIMSON}40`} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Summary Table */}
                <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Day', 'Date', 'Bookings', 'Revenue', 'Tuck Shop', 'Total'].map(h => (
                                    <th key={h} className={h === 'Tuck Shop' ? 'hide-mobile' : ''} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(139,26,43,0.3)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weekly.map((d, i) => (
                                <tr key={d.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: GOLD }}>{d.dayName}</td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{d.date}</td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: '#fff' }}>{d.bookingCount}</td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#fff' }}>PKR {fmt(d.bookingRevenue)}</td>
                                    <td className="hide-mobile" style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>PKR {fmt(d.tuckRevenue)}</td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: GOLD }}>PKR {fmt(d.total)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: 'rgba(139,26,43,0.08)', borderTop: '2px solid rgba(139,26,43,0.3)' }}>
                                <td colSpan={2} style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>{summaryBookings}</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>PKR {fmt(weekly.reduce((s, d) => s + d.bookingRevenue, 0))}</td>
                                <td className="hide-mobile" style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>PKR {fmt(weekly.reduce((s, d) => s + d.tuckRevenue, 0))}</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: GOLD }}>PKR {fmt(summaryTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ═══ MONTHLY TAB ═══
    if (tab === 'monthly' && monthly) {
        const groundBarData = Object.entries(monthly.byGround).map(([name, data]) => ({
            name, revenue: data.revenue, count: data.count,
            pct: monthly.totalRevenue > 0 ? Math.round((data.revenue / monthly.totalRevenue) * 100) : 0,
        }));

        const weekData = monthly.byWeek.map(w => ({ name: `Week ${w.week}`, revenue: w.revenue, count: w.count }));

        // Peak hours heatmap data
        const peakMap: Record<string, number> = {};
        for (const p of monthly.peakHours) { peakMap[p.hour] = p.count; }
        const maxPeak = Math.max(...monthly.peakHours.map(p => p.count), 1);

        return (
            <div>
                {/* Month selector */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
                    <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: '#fff', fontSize: 16, padding: '6px 12px', cursor: 'pointer' }}>←</button>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', minWidth: 160, textAlign: 'center' }}>
                        {new Date(selectedMonth + '-01T12:00:00').toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </span>
                    <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: '#fff', fontSize: 16, padding: '6px 12px', cursor: 'pointer' }}>→</button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'TOTAL REVENUE', value: `PKR ${fmt(monthly.totalRevenue)}`, accent: GOLD },
                        { label: 'TOTAL BOOKINGS', value: String(monthly.totalBookings), accent: CRIMSON },
                        { label: 'AVG DAILY', value: `PKR ${fmt(monthly.avgDailyRevenue)}`, accent: GREEN },
                        { label: 'BEST DAY', value: monthly.bestDay.date ? `${monthly.bestDay.date.split('-')[2]}th` : '—', accent: BLUE },
                        { label: 'CASH', value: `PKR ${fmt(monthly.paymentSplit.cash)}`, accent: CRIMSON },
                        { label: 'ONLINE', value: `PKR ${fmt(monthly.paymentSplit.online)}`, accent: GOLD },
                    ].map(c => (
                        <div key={c.label} style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 16, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{c.label}</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 800, color: '#fff' }}>{c.value}</div>
                        </div>
                    ))}
                </div>

                <div className="reports-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    {/* Weekly Breakdown */}
                    <ChartCard title="WEEKLY BREAKDOWN">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={weekData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Roboto Flex' }} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                                <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                <Bar dataKey="revenue" fill={CRIMSON} radius={[4, 4, 0, 0]} label={{ fill: '#fff', fontSize: 10, position: 'top' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Ground Performance Horizontal */}
                    <ChartCard title="GROUND PERFORMANCE">
                        <div style={{ padding: '0 16px' }}>
                            {groundBarData.map(g => (
                                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: CRIMSON, width: 40 }}>{g.name}</span>
                                    <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                                        <div style={{ width: `${g.pct}%`, height: '100%', background: `linear-gradient(90deg, ${CRIMSON}, ${GOLD})`, borderRadius: 5, transition: 'width 0.5s ease' }} />
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff', width: 90, textAlign: 'right' }}>PKR {fmt(g.revenue)}</span>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 35, textAlign: 'right' }}>{g.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </ChartCard>
                </div>

                {/* Peak Hours Heatmap */}
                <ChartCard title="PEAK HOURS" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 8px' }}>
                        {Array.from({ length: 24 }, (_, h) => {
                            const count = peakMap[String(h).padStart(2, '0')] || 0;
                            const intensity = count / maxPeak;
                            return (
                                <div key={h} title={`${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}: ${count} bookings`} style={{
                                    width: 36, height: 36, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: count > 0 ? `rgba(139,26,43,${0.1 + intensity * 0.7})` : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${count > 0 ? `rgba(139,26,43,${0.2 + intensity * 0.5})` : 'rgba(255,255,255,0.05)'}`,
                                    fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600,
                                    color: count > 0 ? '#fff' : 'rgba(255,255,255,0.25)', cursor: 'default',
                                }}>
                                    {h % 12 || 12}{h >= 12 ? 'P' : 'A'}
                                </div>
                            );
                        })}
                    </div>
                </ChartCard>

                {/* Month Revenue Trend */}
                <ChartCard title="DAILY REVENUE TREND">
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={monthly.dailyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                            <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                            <Area type="monotone" dataKey="revenue" stroke={CRIMSON} fill={`${CRIMSON}30`} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        );
    }

    return null;
}

// Shared chart card wrapper
function ChartCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div className="reports-chart-card" style={{
            background: '#111218', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 4, padding: 20, position: 'relative', ...style,
        }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>{title}</div>
            {children}

            {/* Mobile responsive chart styles */}
            <style>{`
                @media (max-width: 768px) {
                    .reports-chart-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .reports-chart-card {
                        padding: 16px !important;
                    }
                    .reports-chart-container {
                        height: 200px !important;
                    }
                }
            `}</style>
        </div>
    );
}

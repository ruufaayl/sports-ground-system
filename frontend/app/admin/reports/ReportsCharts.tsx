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

const axisStyle = {
    xTick: { fill: 'rgba(255,255,255,0.5)', fontSize: 11 },
    yTick: { fill: 'rgba(255,255,255,0.5)', fontSize: 11 },
    axisLine: { stroke: 'rgba(255,255,255,0.1)' },
};

function NoDataMsg() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
            No data for this period
        </div>
    );
}

export default function ReportsCharts({ tab, daily, dailyDate, setDailyDate, weekly, monthly, selectedMonth, setSelectedMonth, shiftMonth, sending, handleSendWhatsApp, fmt }: Props) {
    // ═══ DAILY TAB ═══
    if (tab === 'daily') {
        if (!daily) return <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)', padding: 40, textAlign: 'center' }}>Loading daily report...</div>;

        // Safe data extraction with Number() coercion
        const bookingCash = Number(daily.bookings?.cash) || 0;
        const bookingOnline = Number(daily.bookings?.online) || 0;
        const tuckTotal = Number(daily.tuckShop?.total) || 0;

        const rawPieData = [
            { name: 'Booking Cash', value: bookingCash, color: CRIMSON },
            { name: 'Booking Online', value: bookingOnline, color: GOLD },
            { name: 'Tuck Shop', value: tuckTotal, color: BLUE },
        ].filter(d => d.value > 0);
        const pieData = rawPieData.length > 0 ? rawPieData : [{ name: 'No Data', value: 1, color: '#333' }];
        const hasPieData = rawPieData.length > 0;

        // Ground data with fallback
        const rawGroundData = Object.entries(daily.bookings?.byGround || {}).map(([name, amount]) => ({
            name, revenue: Number(amount) || 0,
        }));
        const groundData = rawGroundData.length > 0 ? rawGroundData : [
            { name: 'G1', revenue: 0 }, { name: 'G2', revenue: 0 },
            { name: 'G3', revenue: 0 }, { name: 'G4', revenue: 0 }, { name: 'G5', revenue: 0 },
        ];
        const hasGroundData = rawGroundData.some(d => d.revenue > 0);

        // Hour data — always generate 18 hours (6AM-11PM)
        const hourData = Array.from({ length: 18 }, (_, i) => {
            const h = i + 6;
            const key = String(h).padStart(2, '0');
            const label = `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`;
            return {
                hour: label,
                bookings: Number(daily.bookings?.byHour?.[key]) || 0,
                isPeak: daily.peakHour === key + ':00',
            };
        });
        const hasHourData = hourData.some(d => d.bookings > 0);

        // Payment donut
        const rawPaymentDonut = [
            { name: 'Cash', value: bookingCash, color: CRIMSON },
            { name: 'Online', value: bookingOnline, color: GOLD },
        ].filter(d => d.value > 0);
        const paymentDonut = rawPaymentDonut.length > 0 ? rawPaymentDonut : [{ name: 'No Data', value: 1, color: '#333' }];
        const hasPaymentData = rawPaymentDonut.length > 0;

        return (
            <div>
                {/* Date + WhatsApp */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{
                        background: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, color: '#fff',
                        fontSize: 13, padding: '8px 12px', fontFamily: 'var(--font-ui)', outline: 'none', colorScheme: 'dark',
                    }} />
                    <button onClick={handleSendWhatsApp} disabled={sending} className="btn-futuristic" style={{ fontSize: 11, height: 40, padding: '0 20px' }}>
                        {sending ? 'SENDING...' : 'SEND TO WHATSAPP'}
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="reports-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'TOTAL REVENUE', value: `PKR ${fmt(Number(daily.grandTotal) || 0)}`, accent: GREEN },
                        { label: 'TOTAL BOOKINGS', value: String(Number(daily.bookings?.count) || 0), accent: CRIMSON },
                        { label: 'OCCUPANCY', value: `${Number(daily.occupancyRate) || 0}%`, accent: GOLD },
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
                        {hasPieData ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={(({ name, value }: any) => `${name}: ${fmt(value)}`) as any} labelLine={false}>
                                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <NoDataMsg />}
                    </ChartCard>

                    {/* Revenue by Ground */}
                    <ChartCard title="REVENUE BY GROUND">
                        {hasGroundData ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={groundData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
                                    <YAxis tick={axisStyle.yTick} axisLine={axisStyle.axisLine} />
                                    <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                    <Bar dataKey="revenue" fill={CRIMSON} radius={[4, 4, 0, 0]} label={{ fill: '#fff', fontSize: 10, position: 'top' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <NoDataMsg />}
                    </ChartCard>

                    {/* Bookings by Hour */}
                    <ChartCard title="BOOKINGS BY HOUR">
                        {hasHourData ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={hourData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="hour" tick={{ ...axisStyle.xTick, fontSize: 9 }} axisLine={axisStyle.axisLine} interval={1} />
                                    <YAxis tick={axisStyle.yTick} axisLine={axisStyle.axisLine} allowDecimals={false} />
                                    <Tooltip {...DarkTooltipStyle} />
                                    <Bar dataKey="bookings" fill={CRIMSON}>
                                        {hourData.map((entry, i) => <Cell key={i} fill={entry.isPeak ? GOLD : CRIMSON} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <NoDataMsg />}
                    </ChartCard>

                    {/* Payment Method Donut */}
                    <ChartCard title="PAYMENT METHOD">
                        {hasPaymentData ? (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
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
                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 800, color: '#fff' }}>PKR {fmt(Number(daily.bookings?.total) || 0)}</div>
                                </div>
                            </>
                        ) : <NoDataMsg />}
                    </ChartCard>
                </div>
            </div>
        );
    }

    // ═══ WEEKLY TAB ═══
    if (tab === 'weekly') {
        // Safe data transformation
        const weeklyData = (weekly || []).map(d => ({
            dayName: d.dayName || d.date?.slice(5) || 'N/A',
            date: d.date || '',
            bookingRevenue: Number(d.bookingRevenue) || 0,
            bookingCount: Number(d.bookingCount) || 0,
            tuckRevenue: Number(d.tuckRevenue) || 0,
            total: Number(d.total) || 0,
        }));

        const summaryTotal = weeklyData.reduce((s, d) => s + d.total, 0);
        const summaryBookings = weeklyData.reduce((s, d) => s + d.bookingCount, 0);
        const hasWeeklyData = weeklyData.some(d => d.total > 0);

        return (
            <div>
                {/* Grouped Bar Chart */}
                <ChartCard title="7-DAY REVENUE">
                    {hasWeeklyData ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="dayName" tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
                                <YAxis tick={axisStyle.yTick} axisLine={axisStyle.axisLine} />
                                <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                <Legend formatter={((value: any) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}</span>) as any} />
                                <Bar dataKey="bookingRevenue" name="Bookings" fill={CRIMSON} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="tuckRevenue" name="Tuck Shop" fill={GOLD} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <NoDataMsg />}
                </ChartCard>

                {/* Booking Count Line */}
                <ChartCard title="DAILY BOOKING COUNT" style={{ marginTop: 16 }}>
                    {hasWeeklyData ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="dayName" tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
                                <YAxis tick={axisStyle.yTick} axisLine={axisStyle.axisLine} allowDecimals={false} />
                                <Tooltip {...DarkTooltipStyle} />
                                <Area type="monotone" dataKey="bookingCount" name="Bookings" stroke={CRIMSON} fill={`${CRIMSON}40`} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <NoDataMsg />}
                </ChartCard>

                {/* Summary Table */}
                <div style={{ background: '#111218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Day', 'Date', 'Bookings', 'Revenue', 'Tuck Shop', 'Total'].map(h => (
                                    <th key={h} className={['Tuck Shop', 'Date'].includes(h) ? 'hide-mobile' : ''} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(139,26,43,0.3)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyData.map((d, i) => (
                                <tr key={d.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: GOLD }}>{d.dayName}</td>
                                    <td className="hide-mobile" style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{d.date}</td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: '#fff' }}>{d.bookingCount}</td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: '#fff' }}>PKR {fmt(d.bookingRevenue)}</td>
                                    <td className="hide-mobile" style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>PKR {fmt(d.tuckRevenue)}</td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: GOLD }}>PKR {fmt(d.total)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: 'rgba(139,26,43,0.08)', borderTop: '2px solid rgba(139,26,43,0.3)' }}>
                                <td colSpan={1} style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                                <td className="hide-mobile" style={{ padding: '12px 16px' }}></td>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>{summaryBookings}</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>PKR {fmt(weeklyData.reduce((s, d) => s + d.bookingRevenue, 0))}</td>
                                <td className="hide-mobile" style={{ padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#fff' }}>PKR {fmt(weeklyData.reduce((s, d) => s + d.tuckRevenue, 0))}</td>
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
        const groundBarData = Object.entries(monthly.byGround || {}).map(([name, data]) => ({
            name, revenue: Number(data.revenue) || 0, count: Number(data.count) || 0,
            pct: (Number(monthly.totalRevenue) || 0) > 0 ? Math.round(((Number(data.revenue) || 0) / Number(monthly.totalRevenue)) * 100) : 0,
        }));

        const weekData = (monthly.byWeek || []).map(w => ({ name: `Week ${w.week}`, revenue: Number(w.revenue) || 0, count: Number(w.count) || 0 }));
        const hasWeekData = weekData.some(w => w.revenue > 0);

        // Peak hours heatmap data
        const peakMap: Record<string, number> = {};
        for (const p of (monthly.peakHours || [])) { peakMap[p.hour] = Number(p.count) || 0; }
        const maxPeak = Math.max(...(monthly.peakHours || []).map(p => Number(p.count) || 0), 1);

        // Daily revenue trend
        const dailyRevData = (monthly.dailyRevenue || []).map(d => ({
            day: d.day || parseInt(String(d.date || '').slice(-2), 10) || 0,
            revenue: Number(d.revenue) || 0,
        }));
        const hasDailyRev = dailyRevData.some(d => d.revenue > 0);

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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'TOTAL REVENUE', value: `PKR ${fmt(Number(monthly.totalRevenue) || 0)}`, accent: GOLD },
                        { label: 'TOTAL BOOKINGS', value: String(Number(monthly.totalBookings) || 0), accent: CRIMSON },
                        { label: 'AVG DAILY', value: `PKR ${fmt(Number(monthly.avgDailyRevenue) || 0)}`, accent: GREEN },
                        { label: 'BEST DAY', value: monthly.bestDay?.date ? `${monthly.bestDay.date.split('-')[2]}th` : '—', accent: BLUE },
                        { label: 'CASH', value: `PKR ${fmt(Number(monthly.paymentSplit?.cash) || 0)}`, accent: CRIMSON },
                        { label: 'ONLINE', value: `PKR ${fmt(Number(monthly.paymentSplit?.online) || 0)}`, accent: GOLD },
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
                        {hasWeekData ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={weekData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
                                    <YAxis tick={axisStyle.yTick} axisLine={axisStyle.axisLine} />
                                    <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                    <Bar dataKey="revenue" fill={CRIMSON} radius={[4, 4, 0, 0]} label={{ fill: '#fff', fontSize: 10, position: 'top' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <NoDataMsg />}
                    </ChartCard>

                    {/* Ground Performance Horizontal */}
                    <ChartCard title="GROUND PERFORMANCE">
                        {groundBarData.length > 0 ? (
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
                        ) : <NoDataMsg />}
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
                    {hasDailyRev ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={dailyRevData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
                                <YAxis tick={axisStyle.yTick} axisLine={axisStyle.axisLine} />
                                <Tooltip {...DarkTooltipStyle} formatter={((v: any) => `PKR ${fmt(Number(v))}`) as any} />
                                <Area type="monotone" dataKey="revenue" stroke={CRIMSON} fill={`${CRIMSON}30`} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <NoDataMsg />}
                </ChartCard>
            </div>
        );
    }

    // Monthly loading state
    if (tab === 'monthly' && !monthly) {
        return (
            <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
                    <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: '#fff', fontSize: 16, padding: '6px 12px', cursor: 'pointer' }}>←</button>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', minWidth: 160, textAlign: 'center' }}>
                        {new Date(selectedMonth + '-01T12:00:00').toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </span>
                    <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: '#fff', fontSize: 16, padding: '6px 12px', cursor: 'pointer' }}>→</button>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)', padding: 40, textAlign: 'center' }}>Loading monthly report...</div>
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
        </div>
    );
}

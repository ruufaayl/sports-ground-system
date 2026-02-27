const express = require('express');
const supabase = require('../services/supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

const pad = (n) => String(n).padStart(2, '0');

// ═══ FIX 5: GET /api/reports/daily/:date — enhanced ═══
router.get('/daily/:date', async (req, res, next) => {
    try {
        const { date } = req.params;

        // All bookings for this date (not just paid)
        const { data: allBookings } = await supabase
            .from('bookings')
            .select('*, grounds(name)')
            .eq('date', date)
            .neq('booking_status', 'cancelled');

        // Paid bookings for revenue
        const paidBookings = (allBookings || []).filter(b => b.payment_status === 'paid');

        const bookingTotal = paidBookings.reduce((sum, b) => sum + Number(b.base_price), 0);
        const bookingCount = (allBookings || []).length;
        const bookingCash = paidBookings.filter(b => b.payment_method === 'cash').reduce((sum, b) => sum + Number(b.base_price), 0);
        const bookingOnline = bookingTotal - bookingCash;

        // By ground
        const byGround = {};
        for (const b of paidBookings) {
            const name = b.grounds?.name || 'Unknown';
            byGround[name] = (byGround[name] || 0) + Number(b.base_price);
        }

        // By hour — store BOOKING COUNTS per hour (frontend charts expect counts)
        const byHour = {};
        for (const b of (allBookings || [])) {
            const startHour = b.start_time.split(':')[0];
            byHour[startHour] = (byHour[startHour] || 0) + 1;
        }

        // Peak hour
        let peakHour = null;
        let peakCount = 0;
        for (const [hour, count] of Object.entries(byHour)) {
            if (count > peakCount) { peakHour = hour + ':00'; peakCount = count; }
        }

        // Tuck shop
        const { data: tuckSales } = await supabase
            .from('tuck_shop_sales')
            .select('*')
            .gte('sold_at', date + 'T00:00:00')
            .lte('sold_at', date + 'T23:59:59');

        const tuckTotal = (tuckSales || []).reduce((sum, s) => sum + Number(s.total_price || s.total || 0), 0);
        const tuckCash = (tuckSales || []).filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total_price || s.total || 0), 0);
        const tuckOnline = tuckTotal - tuckCash;

        // Occupancy: booked hours / (5 grounds × 18 operating hours)
        const totalBookedHours = (allBookings || []).reduce((sum, b) => sum + Number(b.duration_hours || 1), 0);
        const totalPossibleSlots = 5 * 18; // 5 grounds × 18 operating hours
        const occupancyRate = totalPossibleSlots > 0 ? Math.round((totalBookedHours / totalPossibleSlots) * 100) : 0;

        res.json({
            date,
            bookings: {
                total: bookingTotal,
                count: bookingCount,
                cash: bookingCash,
                online: bookingOnline,
                byGround,
                byHour,
            },
            tuckShop: { total: tuckTotal, cash: tuckCash, online: tuckOnline, count: (tuckSales || []).length },
            grandTotal: bookingTotal + tuckTotal,
            peakHour,
            occupancyRate,
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/reports/send-daily
router.post('/send-daily', async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: bookings } = await supabase
            .from('bookings')
            .select('*, grounds(name)')
            .eq('date', today)
            .eq('payment_status', 'paid');

        const { data: tuckSales } = await supabase
            .from('tuck_shop_sales')
            .select('*')
            .gte('sold_at', today + 'T00:00:00')
            .lte('sold_at', today + 'T23:59:59');

        const bookingTotal = (bookings || []).reduce((sum, b) => sum + Number(b.base_price), 0);
        const bookingCash = (bookings || []).filter(b => b.payment_method === 'cash').reduce((sum, b) => sum + Number(b.base_price), 0);
        const bookingOnline = bookingTotal - bookingCash;

        const byGround = {};
        for (const b of (bookings || [])) {
            const name = b.grounds?.name || 'Unknown';
            byGround[name] = (byGround[name] || 0) + Number(b.base_price);
        }

        const tuckTotal = (tuckSales || []).reduce((sum, s) => sum + Number(s.total_price || s.total || 0), 0);
        const tuckCash = (tuckSales || []).filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total_price || s.total || 0), 0);
        const tuckOnline = tuckTotal - tuckCash;

        const report = {
            date: today,
            bookings: { total: bookingTotal, cash: bookingCash, online: bookingOnline, byGround },
            tuckShop: { total: tuckTotal, cash: tuckCash, online: tuckOnline },
            grandTotal: bookingTotal + tuckTotal
        };

        try {
            await fetch(process.env.BOT_URL || 'http://localhost:3002/send-daily-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report })
            });
        } catch (botErr) {
            console.error('Bot send failed:', botErr.message);
        }

        res.json({ success: true, report });
    } catch (err) {
        next(err);
    }
});

// GET /api/reports/summary
router.get('/summary', async (req, res, next) => {
    try {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        const { data: monthBookings, error: mError } = await supabase
            .from('bookings').select('base_price').gte('date', firstOfMonth).eq('payment_status', 'paid');
        if (mError) throw mError;

        const { data: todayBookings, error: tError } = await supabase
            .from('bookings').select('base_price').eq('date', today).eq('payment_status', 'paid');
        if (tError) throw tError;

        res.json({
            totalBookingsThisMonth: monthBookings?.length || 0,
            totalRevenueThisMonth: (monthBookings || []).reduce((s, b) => s + (Number(b.base_price) || 0), 0),
            bookingsToday: todayBookings?.length || 0,
            revenueToday: (todayBookings || []).reduce((s, b) => s + (Number(b.base_price) || 0), 0),
        });
    } catch (err) {
        next(err);
    }
});

// ═══ FIX 6: GET /api/reports/weekly ═══
router.get('/weekly', async (req, res, next) => {
    try {
        const { start_date } = req.query;
        const baseDate = start_date ? new Date(start_date + 'T00:00:00') : new Date();
        const weeklyData = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const { data: bookings } = await supabase
                .from('bookings').select('base_price').eq('date', dateStr).eq('payment_status', 'paid');

            const bookingRevenue = (bookings || []).reduce((sum, b) => sum + Number(b.base_price), 0);
            const bookingCount = (bookings || []).length;

            const { data: tuckSales } = await supabase
                .from('tuck_shop_sales').select('total_price')
                .gte('sold_at', dateStr + 'T00:00:00').lte('sold_at', dateStr + 'T23:59:59');

            const tuckRevenue = (tuckSales || []).reduce((sum, s) => sum + Number(s.total_price || 0), 0);

            weeklyData.push({
                date: dateStr, dayName, bookingRevenue, bookingCount, tuckRevenue,
                total: bookingRevenue + tuckRevenue,
            });
        }

        res.json(weeklyData);
    } catch (err) {
        next(err);
    }
});

// ═══ FIX 7: GET /api/reports/monthly ═══
router.get('/monthly', async (req, res, next) => {
    try {
        const { month } = req.query;
        const now = new Date();
        const targetMonth = month || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const [year, mon] = targetMonth.split('-').map(Number);
        const lastDay = new Date(year, mon, 0).getDate();
        const startDate = `${targetMonth}-01`;
        const endDate = `${targetMonth}-${pad(lastDay)}`;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, grounds(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('payment_status', 'paid');

        if (error) throw error;

        const allBookings = bookings || [];
        const totalRevenue = allBookings.reduce((sum, b) => sum + Number(b.base_price), 0);
        const totalBookings = allBookings.length;
        const daysInMonth = lastDay;
        const avgDailyRevenue = daysInMonth > 0 ? Math.round(totalRevenue / daysInMonth) : 0;

        // Best day
        const dailyRevenue = {};
        for (const b of allBookings) {
            dailyRevenue[b.date] = (dailyRevenue[b.date] || 0) + Number(b.base_price);
        }
        let bestDay = { date: null, revenue: 0 };
        for (const [date, rev] of Object.entries(dailyRevenue)) {
            if (rev > bestDay.revenue) bestDay = { date, revenue: rev };
        }

        // By ground
        const byGround = {};
        for (const b of allBookings) {
            const name = b.grounds?.name || 'Unknown';
            if (!byGround[name]) byGround[name] = { revenue: 0, count: 0 };
            byGround[name].revenue += Number(b.base_price);
            byGround[name].count++;
        }

        // Best ground
        let bestGround = { name: null, revenue: 0 };
        for (const [name, data] of Object.entries(byGround)) {
            if (data.revenue > bestGround.revenue) bestGround = { name, revenue: data.revenue };
        }

        // By week
        const byWeek = [
            { week: 1, revenue: 0, count: 0 },
            { week: 2, revenue: 0, count: 0 },
            { week: 3, revenue: 0, count: 0 },
            { week: 4, revenue: 0, count: 0 },
            { week: 5, revenue: 0, count: 0 },
        ];
        for (const b of allBookings) {
            const day = parseInt(b.date.split('-')[2], 10);
            const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
            byWeek[weekIdx].revenue += Number(b.base_price);
            byWeek[weekIdx].count++;
        }

        // Peak hours
        const hourCounts = {};
        for (const b of allBookings) {
            const startHour = b.start_time.split(':')[0];
            hourCounts[startHour] = (hourCounts[startHour] || 0) + 1;
        }
        const peakHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => b.count - a.count);

        // Payment split
        const cashAmount = allBookings.filter(b => b.payment_method === 'cash').reduce((s, b) => s + Number(b.base_price), 0);
        const onlineAmount = totalRevenue - cashAmount;

        // Daily revenue for chart
        const dailyRevenueArray = [];
        for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${targetMonth}-${pad(d)}`;
            dailyRevenueArray.push({ date: dateStr, day: d, revenue: dailyRevenue[dateStr] || 0 });
        }

        res.json({
            month: targetMonth,
            totalRevenue,
            totalBookings,
            avgDailyRevenue,
            bestDay,
            bestGround,
            byGround,
            byWeek: byWeek.filter(w => w.count > 0 || w.week <= 4),
            peakHours,
            paymentSplit: { cash: cashAmount, online: onlineAmount },
            dailyRevenue: dailyRevenueArray,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

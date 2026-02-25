const express = require('express');
const supabase = require('../services/supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All reports require admin auth
router.use(requireAdmin);

// GET /api/reports/daily/:date  (YYYY-MM-DD)
router.get('/daily/:date', async (req, res, next) => {
    try {
        const { date } = req.params;
        const report = await generateDailyReport(date);
        res.json(report);
    } catch (err) {
        next(err);
    }
});

// POST /api/reports/send-daily
router.post('/send-daily', async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 2. Query paid bookings for today:
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*, grounds(name)')
            .eq('date', today)
            .eq('payment_status', 'paid');

        // 3. Query tuck shop sales for today:
        const { data: tuckSales } = await supabase
            .from('tuck_shop_sales')
            .select('*')
            .gte('sold_at', today + 'T00:00:00')
            .lte('sold_at', today + 'T23:59:59');

        // 4. Calculate totals:
        const bookingTotal = (bookings || []).reduce((sum, b) => sum + Number(b.base_price), 0);
        const bookingCash = (bookings || []).filter(b => b.payment_method === 'cash').reduce((sum, b) => sum + Number(b.base_price), 0);
        const bookingOnline = bookingTotal - bookingCash;

        const byGround = {};
        for (const b of (bookings || [])) {
            const name = b.grounds?.name || 'Unknown';
            byGround[name] = (byGround[name] || 0) + Number(b.base_price);
        }

        const tuckTotal = (tuckSales || []).reduce((sum, s) => sum + Number(s.total), 0);
        const tuckCash = (tuckSales || []).filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0);
        const tuckOnline = tuckTotal - tuckCash;

        const report = {
            date: today,
            bookings: { total: bookingTotal, cash: bookingCash, online: bookingOnline, byGround },
            tuckShop: { total: tuckTotal, cash: tuckCash, online: tuckOnline },
            grandTotal: bookingTotal + tuckTotal
        };

        // 5. Send to bot:
        try {
            await fetch(process.env.BOT_URL || 'http://localhost:3002/send-daily-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report })
            });
        } catch (botErr) {
            console.error('Bot send failed:', botErr.message);
        }

        // 6. Return
        res.json({ success: true, report });
    } catch (err) {
        next(err);
    }
});

// GET /api/reports/summary
router.get('/summary', async (req, res, next) => {
    try {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];
        const today = now.toISOString().split('T')[0];

        // This month bookings
        const { data: monthBookings, error: mError } = await supabase
            .from('bookings')
            .select('base_price')
            .gte('date', firstOfMonth)
            .eq('payment_status', 'paid');

        if (mError) throw mError;

        // Today's bookings
        const { data: todayBookings, error: tError } = await supabase
            .from('bookings')
            .select('base_price')
            .eq('date', today)
            .eq('payment_status', 'paid');

        if (tError) throw tError;

        const totalBookingsMonth = monthBookings?.length || 0;
        const totalRevenueMonth = (monthBookings || []).reduce(
            (sum, b) => sum + (Number(b.base_price) || 0),
            0
        );
        const bookingsToday = todayBookings?.length || 0;
        const revenueToday = (todayBookings || []).reduce(
            (sum, b) => sum + (Number(b.base_price) || 0),
            0
        );

        res.json({
            totalBookingsThisMonth: totalBookingsMonth,
            totalRevenueThisMonth: totalRevenueMonth,
            bookingsToday,
            revenueToday,
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/reports/weekly
router.get('/weekly', async (req, res, next) => {
    try {
        const weeklyData = [];

        // Loop through last 7 days (including today)
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const pad = (n) => String(n).padStart(2, '0');
            const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

            // Bookings revenue for this day
            const { data: bookings } = await supabase
                .from('bookings')
                .select('base_price')
                .eq('date', dateStr)
                .eq('payment_status', 'paid');

            const bookingRevenue = (bookings || []).reduce((sum, b) => sum + Number(b.base_price), 0);

            // Tuck shop revenue for this day
            const { data: tuckSales } = await supabase
                .from('tuck_shop_sales')
                .select('total')
                .gte('sold_at', dateStr + 'T00:00:00')
                .lte('sold_at', dateStr + 'T23:59:59');

            const tuckRevenue = (tuckSales || []).reduce((sum, s) => sum + Number(s.total), 0);

            weeklyData.push({
                date: dateStr,
                bookingRevenue,
                tuckRevenue,
                total: bookingRevenue + tuckRevenue
            });
        }

        res.json(weeklyData.reverse()); // latest day first
    } catch (err) {
        next(err);
    }
});

module.exports = router;

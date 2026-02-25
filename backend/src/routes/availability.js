const express = require('express');
const supabase = require('../services/supabase');
const { checkAvailability } = require('../services/availability');
const { calculatePrice } = require('../services/pricing');

const router = express.Router();

// POST /api/availability/check
router.post('/check', async (req, res, next) => {
    try {
        const { groundId, date, startTime, endTime } = req.body;

        if (!groundId || !date || !startTime || !endTime) {
            return res.status(400).json({ error: 'groundId, date, startTime, and endTime are required' });
        }

        const { available, conflictingBooking } = await checkAvailability(groundId, date, startTime, endTime);

        if (!available) {
            return res.json({
                available: false,
                price: null,
                conflict: conflictingBooking,
            });
        }

        const price = await calculatePrice(groundId, date, startTime, endTime);

        res.json({
            available: true,
            price: {
                duration: price.duration,
                pricePerHour: price.pricePerHour,
                basePrice: price.basePrice,
                advanceAmount: price.advanceAmount,
                remainingAmount: price.remainingAmount,
                dayType: price.dayType,
                slotType: price.slotType,
            },
            conflict: null,
        });
    } catch (err) {
        next(err);
    }
});
// GET /api/availability/reminders
router.get('/reminders', async (req, res, next) => {
    try {
        const now = new Date();
        const t1 = new Date(now.getTime() + 105 * 60000); // Now + 1h45m
        const t2 = new Date(now.getTime() + 135 * 60000); // Now + 2h15m

        const pad = (n) => String(n).padStart(2, '0');
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const startTime1 = `${pad(t1.getHours())}:${pad(t1.getMinutes())}:00`;
        const startTime2 = `${pad(t2.getHours())}:${pad(t2.getMinutes())}:00`;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                grounds (name)
            `)
            .eq('booking_status', 'confirmed')
            .eq('payment_status', 'paid')
            .eq('date', today)
            .gte('start_time', startTime1)
            .lte('start_time', startTime2);

        if (error) throw error;

        res.json({ bookings: bookings || [] });
    } catch (err) {
        next(err);
    }
});

// GET /api/availability/:groundId/:date — booked slots for a ground on a date
router.get('/:groundId/:date', async (req, res, next) => {
    try {
        const { groundId, date } = req.params;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('start_time, end_time, booking_ref')
            .eq('ground_id', groundId)
            .eq('date', date)
            .neq('booking_status', 'cancelled');

        if (error) throw error;

        const slots = (bookings || []).map((b) => ({
            startTime: b.start_time,
            endTime: b.end_time,
            bookingRef: b.booking_ref,
        }));

        res.json({ date, groundId, bookedSlots: slots });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

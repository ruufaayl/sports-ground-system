const express = require('express');
const supabase = require('../services/supabase');
const { checkAvailability } = require('../services/availability');
const { calculatePrice } = require('../services/pricing');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/** Generate a booking reference like GS-123456 */
function generateBookingRef() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `GS-${num}`;
}

const pad = (n) => String(n).padStart(2, '0');

// POST /api/bookings/create
router.post('/create', async (req, res, next) => {
    try {
        console.log('Received booking request:', req.body);
        const { groundId, date, startTime, endTime, customerName, customerPhone, teamDetails } = req.body;

        if (!groundId || !date || !startTime || !endTime || !customerName || !customerPhone) {
            return res.status(400).json({
                error: 'groundId, date, startTime, endTime, customerName, and customerPhone are required',
            });
        }

        const { available, conflictingBooking } = await checkAvailability(groundId, date, startTime, endTime);
        if (!available) {
            return res.status(409).json({ error: 'Slot not available', conflict: conflictingBooking });
        }

        const price = await calculatePrice(groundId, date, startTime, endTime);
        let bookingRef = generateBookingRef();

        // Upsert customer
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, total_bookings')
            .eq('phone', customerPhone)
            .single();

        if (existingCustomer) {
            await supabase
                .from('customers')
                .update({ total_bookings: existingCustomer.total_bookings + 1, name: customerName })
                .eq('phone', customerPhone);
        } else {
            await supabase.from('customers').insert({
                name: customerName, phone: customerPhone, total_bookings: 1,
            });
        }

        const { data: booking, error: insertError } = await supabase
            .from('bookings')
            .insert({
                booking_ref: bookingRef, ground_id: groundId, date,
                start_time: startTime, end_time: endTime,
                customer_name: customerName, customer_phone: customerPhone,
                team_details: teamDetails || null,
                duration_hours: price.duration, base_price: price.basePrice,
                advance_amount: price.advanceAmount, remaining_amount: price.remainingAmount,
                payment_status: 'pending', booking_status: 'confirmed',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        const { data: ground } = await supabase.from('grounds').select('name').eq('id', groundId).single();

        try {
            await fetch(process.env.BOT_URL || 'http://localhost:3002/send-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking, groundName: ground?.name || 'Ground' })
            });
        } catch (whatsappErr) {
            console.error('WhatsApp notification failed:', whatsappErr.message);
        }

        res.status(201).json({ booking });
    } catch (err) {
        next(err);
    }
});

// ═══ FIX 1: GET /api/bookings/today ═══
router.get('/today', requireAdmin, async (req, res, next) => {
    try {
        const now = new Date();
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, grounds (name)')
            .eq('date', today)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        res.json({ bookings: bookings || [] });
    } catch (err) {
        next(err);
    }
});

// ═══ FIX 3: GET /api/bookings/all — all filters fixed ═══
router.get('/all', requireAdmin, async (req, res, next) => {
    try {
        const { date_from, date_to, ground_id, status, payment_status, search, page = 1, limit = 20 } = req.query;

        let query = supabase
            .from('bookings')
            .select('*, grounds (name)', { count: 'exact' });

        if (date_from) query = query.gte('date', date_from);
        if (date_to) query = query.lte('date', date_to);

        // Ground filter: support comma-separated string OR array
        if (ground_id) {
            const raw = Array.isArray(ground_id) ? ground_id : ground_id.split(',').map(s => s.trim()).filter(Boolean);
            if (raw.length === 1) {
                query = query.eq('ground_id', raw[0]);
            } else if (raw.length > 1) {
                query = query.in('ground_id', raw);
            }
        }

        // Status filter: support comma-separated string OR array
        if (status) {
            const raw = Array.isArray(status) ? status : status.split(',').map(s => s.trim()).filter(Boolean);
            if (raw.length === 1) {
                query = query.eq('booking_status', raw[0]);
            } else if (raw.length > 1) {
                query = query.in('booking_status', raw);
            }
        }

        if (payment_status) {
            query = query.eq('payment_status', payment_status);
        }

        if (search) {
            query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,booking_ref.ilike.%${search}%`);
        }

        const from = (Number(page) - 1) * Number(limit);
        const to = from + Number(limit) - 1;

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: bookings, count, error } = await query;
        if (error) throw error;

        res.json({
            bookings: bookings || [],
            page: Number(page),
            limit: Number(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / Number(limit)),
        });
    } catch (err) {
        next(err);
    }
});

// ═══ FIX 4: GET /api/bookings/calendar?month=YYYY-MM ═══
router.get('/calendar', requireAdmin, async (req, res, next) => {
    try {
        const { month } = req.query;
        if (!month) return res.status(400).json({ error: 'month is required (YYYY-MM)' });

        const [year, mon] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const lastDay = new Date(year, mon, 0).getDate();
        const endDate = `${month}-${pad(lastDay)}`;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, grounds (name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .neq('booking_status', 'cancelled')
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Group by day
        const days = {};
        for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${month}-${pad(d)}`;
            days[dateStr] = { count: 0, bookings: [], revenue: 0 };
        }
        for (const b of (bookings || [])) {
            if (days[b.date]) {
                days[b.date].count++;
                days[b.date].bookings.push(b);
                days[b.date].revenue += Number(b.base_price || 0);
            }
        }

        res.json({ month, days });
    } catch (err) {
        next(err);
    }
});

// ═══ GET /api/bookings/slot-status ═══
router.get('/slot-status', requireAdmin, async (req, res) => {
    try {
        const { ground_id, date } = req.query;
        if (!ground_id || !date) return res.status(400).json({ error: 'ground_id and date are required' });

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('ground_id', ground_id)
            .eq('date', date)
            .neq('booking_status', 'cancelled')
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Generate all 24 hourly slots
        const slots = [];
        for (let hour = 0; hour < 24; hour++) {
            const startTime = hour.toString().padStart(2, '0') + ':00';
            const endHour = (hour + 1) % 24;
            const endTime = endHour.toString().padStart(2, '0') + ':00';
            slots.push({
                hour,
                startTime,
                endTime,
                status: 'available',
                booking: null,
                bookingContinues: false,
                isContinuation: false,
            });
        }

        // Mark booked slots (handle midnight crossover)
        for (const b of (bookings || [])) {
            const bookingStart = parseInt(b.start_time.split(':')[0], 10);
            const bookingEnd = parseInt(b.end_time.split(':')[0], 10);

            // Handle midnight crossover
            let endAdjusted = bookingEnd;
            if (bookingEnd <= bookingStart) endAdjusted = bookingEnd + 24;

            let isFirst = true;
            for (let h = bookingStart; h < endAdjusted; h++) {
                const hourIdx = h % 24;
                if (slots[hourIdx]) {
                    slots[hourIdx].status = 'booked';
                    if (isFirst) {
                        slots[hourIdx].booking = b;
                        slots[hourIdx].isContinuation = false;
                        isFirst = false;
                    } else {
                        slots[hourIdx].bookingContinues = true;
                        slots[hourIdx].isContinuation = true;
                        slots[hourIdx].booking = b;
                    }
                }
            }
        }

        res.json({ slots, date, groundId: ground_id, bookings: bookings || [] });
    } catch (err) {
        console.error('slot-status error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/bookings/:bookingRef
router.get('/:bookingRef', async (req, res, next) => {
    try {
        const { bookingRef } = req.params;
        const { data: booking, error } = await supabase
            .from('bookings')
            .select('*, grounds (*)')
            .eq('booking_ref', bookingRef)
            .single();

        if (error) throw error;
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json({ booking });
    } catch (err) {
        next(err);
    }
});

// PUT /api/bookings/:bookingRef/confirm-payment
router.put('/:bookingRef/confirm-payment', async (req, res, next) => {
    try {
        const { bookingRef } = req.params;
        const { transactionId, paymentMethod } = req.body;

        const { data: booking, error } = await supabase
            .from('bookings')
            .update({
                payment_status: 'paid',
                safepay_transaction_id: transactionId || null,
                payment_method: paymentMethod || null,
            })
            .eq('booking_ref', bookingRef)
            .select()
            .single();

        if (error) throw error;
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json({ booking });
    } catch (err) {
        next(err);
    }
});

// PUT /api/bookings/:bookingRef/cancel
router.put('/:bookingRef/cancel', async (req, res, next) => {
    try {
        const { bookingRef } = req.params;

        const { data: existing, error: fetchError } = await supabase
            .from('bookings')
            .select('date, start_time, booking_status')
            .eq('booking_ref', bookingRef)
            .single();

        if (fetchError) throw fetchError;
        if (!existing) return res.status(404).json({ error: 'Booking not found' });

        const bookingDateTime = new Date(`${existing.date}T${existing.start_time}:00`);
        const now = new Date();
        const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilBooking < 24) {
            return res.status(400).json({ error: 'Cannot cancel within 24 hours of booking' });
        }

        const { data: booking, error: updateError } = await supabase
            .from('bookings')
            .update({ booking_status: 'cancelled' })
            .eq('booking_ref', bookingRef)
            .select()
            .single();

        if (updateError) throw updateError;
        res.json({ message: 'Booking cancelled successfully', booking });
    } catch (err) {
        next(err);
    }
});

// GET /api/bookings/customer/:phone
router.get('/customer/:phone', async (req, res, next) => {
    try {
        const { phone } = req.params;
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, grounds (name)')
            .eq('customer_phone', phone)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ bookings: bookings || [] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

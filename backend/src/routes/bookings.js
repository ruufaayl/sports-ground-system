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

// POST /api/bookings/create
router.post('/create', async (req, res, next) => {
    try {
        console.log('Received booking request:', req.body);

        const { groundId, date, startTime, endTime, customerName, customerPhone, teamDetails } = req.body;

        // Validate required fields
        if (!groundId || !date || !startTime || !endTime || !customerName || !customerPhone) {
            return res.status(400).json({
                error: 'groundId, date, startTime, endTime, customerName, and customerPhone are required',
            });
        }

        // Check availability
        const { available, conflictingBooking } = await checkAvailability(groundId, date, startTime, endTime);
        if (!available) {
            return res.status(409).json({
                error: 'Slot not available',
                conflict: conflictingBooking,
            });
        }

        // Calculate price
        const price = await calculatePrice(groundId, date, startTime, endTime);

        // Generate unique booking ref (retry on collision — very unlikely)
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
                name: customerName,
                phone: customerPhone,
                total_bookings: 1,
            });
        }

        // Insert booking
        const { data: booking, error: insertError } = await supabase
            .from('bookings')
            .insert({
                booking_ref: bookingRef,
                ground_id: groundId,
                date,
                start_time: startTime,
                end_time: endTime,
                customer_name: customerName,
                customer_phone: customerPhone,
                team_details: teamDetails || null,
                duration_hours: price.duration,
                base_price: price.basePrice,
                advance_amount: price.advanceAmount,
                remaining_amount: price.remainingAmount,
                payment_status: 'pending',
                booking_status: 'confirmed',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Get ground name for the WhatsApp message
        const { data: ground } = await supabase
            .from('grounds')
            .select('name')
            .eq('id', groundId)
            .single();

        // Send WhatsApp confirmation
        try {
            await fetch(process.env.BOT_URL || 'http://localhost:3002/send-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking, groundName: ground?.name || 'Ground' })
            });
        } catch (whatsappErr) {
            console.error('WhatsApp notification failed:', whatsappErr.message);
            // Never fail the booking if WhatsApp fails
        }

        res.status(201).json({ booking });
    } catch (err) {
        next(err);
    }
});

// GET /api/bookings/today — all bookings for today (Admin only)
router.get('/today', requireAdmin, async (req, res, next) => {
    try {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                grounds (name)
            `)
            .eq('date', today)
            .order('start_time', { ascending: true });

        if (error) throw error;

        res.json({ bookings: bookings || [] });
    } catch (err) {
        next(err);
    }
});

// GET /api/bookings/all — all bookings with filtering and pagination (Admin only)
router.get('/all', requireAdmin, async (req, res, next) => {
    try {
        const { date_from, date_to, ground_id, status, search, page = 1, limit = 20 } = req.query;

        let query = supabase
            .from('bookings')
            .select(`
                *,
                grounds (name)
            `, { count: 'exact' });

        // Apply filters
        if (date_from) query = query.gte('date', date_from);
        if (date_to) query = query.lte('date', date_to);
        if (ground_id) query = query.eq('ground_id', ground_id);
        if (status) query = query.eq('booking_status', status);

        if (search) {
            // Supabase OR filter for search terms
            query = query.or(`customer_phone.ilike.%${search}%,booking_ref.ilike.%${search}%`);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: bookings, count, error } = await query;

        if (error) throw error;

        res.json({
            bookings: bookings || [],
            page: Number(page),
            limit: Number(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/bookings/:bookingRef — booking with ground details
router.get('/:bookingRef', async (req, res, next) => {
    try {
        const { bookingRef } = req.params;

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
        *,
        grounds (*)
      `)
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

        // Fetch the booking first
        const { data: existing, error: fetchError } = await supabase
            .from('bookings')
            .select('date, start_time, booking_status')
            .eq('booking_ref', bookingRef)
            .single();

        if (fetchError) throw fetchError;
        if (!existing) return res.status(404).json({ error: 'Booking not found' });

        // Check cancellation window (must be >24 hrs before booking)
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

// GET /api/bookings/customer/:phone — all bookings by customer phone
router.get('/customer/:phone', async (req, res, next) => {
    try {
        const { phone } = req.params;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
        *,
        grounds (name)
      `)
            .eq('customer_phone', phone)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ bookings: bookings || [] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

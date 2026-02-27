const express = require('express');
const supabase = require('../services/supabase');
const { requireStaff } = require('../middleware/auth');

const router = express.Router();

// POST /api/tuckshop/sale
router.post('/sale', requireStaff, async (req, res) => {
    try {
        const { itemName, quantity, unitPrice, paymentMethod } = req.body;

        console.log('Tuck shop sale request:', req.body);

        if (!itemName || !quantity || !unitPrice || !paymentMethod) {
            return res.status(400).json({
                error: 'itemName, quantity, unitPrice and paymentMethod are required',
            });
        }

        const total = Number(quantity) * Number(unitPrice);

        const { data, error } = await supabase
            .from('tuck_shop_sales')
            .insert({
                item_name: itemName,
                quantity: Number(quantity),
                unit_price: Number(unitPrice),
                total_price: total,
                payment_method: paymentMethod,
                sale_date: new Date().toISOString().split('T')[0],
                sold_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }

        console.log('Sale created:', data);
        res.status(201).json({ sale: data, success: true });
    } catch (err) {
        console.error('Add sale error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tuckshop/today
router.get('/today', requireStaff, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Try sold_at first, fallback to sale_date
        let { data: sales, error } = await supabase
            .from('tuck_shop_sales')
            .select('*')
            .gte('sold_at', today + 'T00:00:00.000Z')
            .lte('sold_at', today + 'T23:59:59.999Z')
            .order('sold_at', { ascending: false });

        // If sold_at query returns nothing, try sale_date
        if ((!sales || sales.length === 0) && !error) {
            const fallback = await supabase
                .from('tuck_shop_sales')
                .select('*')
                .eq('sale_date', today)
                .order('created_at', { ascending: false });
            if (!fallback.error) {
                sales = fallback.data;
            }
        }

        if (error) throw error;

        const allSales = sales || [];
        const total = allSales.reduce((sum, s) => sum + Number(s.total_price || s.total || 0), 0);
        const cash = allSales
            .filter(s => s.payment_method === 'cash')
            .reduce((sum, s) => sum + Number(s.total_price || s.total || 0), 0);
        const online = total - cash;

        res.json({
            sales: allSales,
            total, // backward compat
            summary: { total, cash, online, count: allSales.length },
        });
    } catch (err) {
        console.error('Tuckshop today error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

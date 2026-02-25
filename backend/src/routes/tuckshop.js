const express = require('express');
const supabase = require('../services/supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All tuck shop routes require admin auth
router.use(requireAdmin);

// POST /api/tuckshop/sale
router.post('/sale', async (req, res, next) => {
    try {
        const { itemName, quantity, unitPrice, paymentMethod } = req.body;

        if (!itemName || !quantity || !unitPrice || !paymentMethod) {
            return res.status(400).json({
                error: 'itemName, quantity, unitPrice, and paymentMethod are required',
            });
        }

        const total = Number(quantity) * Number(unitPrice);
        const saleDate = new Date().toISOString().split('T')[0];

        const { data: sale, error } = await supabase
            .from('tuck_shop_sales')
            .insert({
                item_name: itemName,
                quantity: Number(quantity),
                unit_price: Number(unitPrice),
                total_price: total,
                payment_method: paymentMethod,
                sale_date: saleDate,
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ sale });
    } catch (err) {
        next(err);
    }
});

// GET /api/tuckshop/today
router.get('/today', async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: sales, error } = await supabase
            .from('tuck_shop_sales')
            .select('*')
            .eq('sale_date', today)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const total = (sales || []).reduce((sum, s) => sum + (Number(s.total_price) || 0), 0);

        res.json({ date: today, sales: sales || [], total });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

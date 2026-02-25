const express = require('express');
const supabase = require('../services/supabase');

const router = express.Router();

// GET /api/grounds — all active grounds with pricing rules
router.get('/', async (req, res, next) => {
    try {
        const { data: grounds, error } = await supabase
            .from('grounds')
            .select(`
        *,
        pricing_rules (*)
      `)
            .eq('status', 'active')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({ grounds });
    } catch (err) {
        next(err);
    }
});

// GET /api/grounds/:id — single ground with pricing rules
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const { data: ground, error } = await supabase
            .from('grounds')
            .select(`
        *,
        pricing_rules (*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!ground) return res.status(404).json({ error: 'Ground not found' });

        res.json({ ground });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

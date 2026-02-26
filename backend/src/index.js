require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cron = require('node-cron');

// Routes
const groundsRouter = require('./routes/grounds');
const availabilityRouter = require('./routes/availability');
const bookingsRouter = require('./routes/bookings');
const reportsRouter = require('./routes/reports');
const tuckshopRouter = require('./routes/tuckshop');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS — allow localhost + production Vercel URL ───────────────────────────
app.use(
    cors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://165.245.191.201:3001',
            'https://executivechampionsfield.vercel.app',
            process.env.FRONTEND_URL,
        ].filter(Boolean),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-admin-secret'],
        credentials: true,
    })
);

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/grounds', groundsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/reports', reportsRouter);       // admin protected
app.use('/api/tuckshop', tuckshopRouter);     // admin protected

// ─── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong', message: err.message });
});

// ─── Scheduled Tasks ───────────────────────────────────────────────────────────
// Every day at 11:55 PM
cron.schedule('55 23 * * *', async () => {
    console.log('⏰ Sending daily report...');
    try {
        const response = await fetch(`http://localhost:${PORT}/api/reports/send-daily`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': process.env.ADMIN_SECRET
            }
        });

        const data = await response.json();
        console.log('✅ Daily report sent:', data);
    } catch (err) {
        console.error('❌ Daily report failed:', err.message);
    }
}, {
    timezone: 'Asia/Karachi'
});

console.log('⏰ Daily report scheduled for 11:55 PM PKT');

// ─── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

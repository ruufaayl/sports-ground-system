require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const QRCode = require('qrcode-terminal');
const cron = require('node-cron');
const axios = require('axios');
const http = require('http');

// Environment variables
const MANAGER_PHONE = process.env.MANAGER_PHONE || '923000000000';
const BOOKING_URL = process.env.BOOKING_URL || 'http://localhost:3000/book';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Global socket instance
let sock = null;
let isConnecting = false;

// ─── Anti-spam state ──────────────────────────────────────────────────────────
// Tracks users who have already received the welcome message
const welcomedUsers = new Set();
// Reset every 24 hours so users get the welcome again the next day
cron.schedule('0 0 * * *', () => {
    welcomedUsers.clear();
    console.log('🔄 welcomedUsers reset for new day');
});

// Prevents duplicate confirmation messages
const confirmationsSent = new Set();

// Prevents duplicate reminders per booking per day
const remindersSent = new Set();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const formatPhone = (phone) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('03')) {
        cleaned = '92' + cleaned.substring(1);
    }
    return `${cleaned}@s.whatsapp.net`;
};

const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:${minutes} ${ampm}`;
};

// ─── Message templates ────────────────────────────────────────────────────────
const WELCOME_MSG = `👋 *Welcome to Sports Ground Booking!*

Book your ground in minutes:
🏟️ 5 Premium Grounds Available
⚡ Instant Confirmation
💳 30% Advance Online | 70% at Ground
🕐 Open 24/7

👇 *Click here to book your slot:*
${BOOKING_URL}

_Reply HELP for assistance_`;

const HELP_MSG = `🆘 *Need Help?*

For booking issues contact:
📞 ${MANAGER_PHONE}

*Common questions:*
- To cancel: Contact us 24hrs before your slot
- Payment: 30% advance secures your slot
- Remaining 70% paid at the ground
- To check your booking: visit the booking link`;

// ==========================================
// PART 1: CONNECTION
// ==========================================
async function connectToWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        console.log('🔄 Initializing WhatsApp connection...');
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

        sock = makeWASocket({
            version,
            auth: state,
            logger: P({ level: 'silent' }),
            browser: ['Sports Ground Bot', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 2000,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                QRCode.generate(qr, { small: true });
                console.log('📱 Scan the QR code above with WhatsApp');
            }

            if (connection === 'close') {
                isConnecting = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connection closed. Status code:', statusCode);
                if (shouldReconnect) {
                    console.log('🔄 Reconnecting in 10 seconds...');
                    setTimeout(connectToWhatsApp, 10000);
                } else {
                    console.log('🚪 Logged out. Delete auth_info_baileys folder and restart.');
                }
            } else if (connection === 'open') {
                isConnecting = false;
                console.log('✅ WhatsApp Bot Connected and stable!');
            }
        });

        // ==========================================
        // PART 2: INCOMING MESSAGE HANDLER
        // ==========================================
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                // Guard 1: ignore messages the bot sent itself
                if (!msg.message || msg.key.fromMe === true) continue;

                const remoteJid = msg.key.remoteJid || '';

                // Guard 2: ignore groups, broadcast, and status
                if (remoteJid.includes('@g.us')) continue;
                if (remoteJid.includes('broadcast')) continue;
                if (remoteJid.includes('status')) continue;

                // Guard 3: ignore old messages (e.g. queued during offline period)
                const messageAge = Date.now() - (msg.messageTimestamp * 1000);
                if (messageAge > 30000) continue;

                const sender = remoteJid;
                const messageText =
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text || '';
                if (!messageText) continue;

                const textLower = messageText.toLowerCase().trim();

                // User has NOT received a welcome yet → send welcome, track them
                if (!welcomedUsers.has(sender)) {
                    welcomedUsers.add(sender);
                    await delay(1000);
                    try {
                        await sock.sendMessage(sender, { text: WELCOME_MSG });
                        console.log(`👋 Welcome sent to ${sender}`);
                    } catch (err) {
                        console.error('Failed to send welcome message:', err);
                    }
                    continue;
                }

                // User already welcomed → only respond to "help"
                if (textLower === 'help') {
                    await delay(1000);
                    try {
                        await sock.sendMessage(sender, { text: HELP_MSG });
                        console.log(`🆘 Help sent to ${sender}`);
                    } catch (err) {
                        console.error('Failed to send help message:', err);
                    }
                    continue;
                }

                // All other messages from welcomed users → ignore completely
            }
        });

    } catch (err) {
        isConnecting = false;
        console.error('Connection error:', err.message);
        setTimeout(connectToWhatsApp, 10000);
    }
}

// ==========================================
// PART 3: SEND BOOKING CONFIRMATION
// ==========================================
async function sendBookingConfirmation(booking, groundName) {
    if (!sock) {
        console.error('Bot not connected. Cannot send confirmation.');
        return;
    }

    // Deduplicate: never send the same confirmation twice
    if (confirmationsSent.has(booking.booking_ref)) {
        console.log(`⚠️ Confirmation already sent for ${booking.booking_ref}, skipping.`);
        return;
    }
    confirmationsSent.add(booking.booking_ref);

    try {
        const jid = formatPhone(booking.customer_phone);

        const dateObj = new Date(booking.date);
        const prettyDate = dateObj.toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
        });

        const startTime = formatTime(booking.start_time);
        const endTime = formatTime(booking.end_time);

        const msg =
            `✅ *BOOKING CONFIRMED!*\n\n` +
            `*Booking Reference:* ${booking.booking_ref}\n` +
            `*Ground:* ${groundName}\n` +
            `*Date:* ${prettyDate}\n` +
            `*Time:* ${startTime} → ${endTime}\n` +
            `*Duration:* ${booking.duration_hours} hours\n\n` +
            `💰 *Payment Summary:*\n` +
            `Total: PKR ${booking.base_price.toLocaleString('en-PK')}\n` +
            `✅ Advance Paid: PKR ${booking.advance_amount.toLocaleString('en-PK')}\n` +
            `⏳ Remaining at Ground: PKR ${booking.remaining_amount.toLocaleString('en-PK')}\n\n` +
            `👤 *Your Details:*\n` +
            `Name: ${booking.customer_name}\n` +
            `Phone: ${booking.customer_phone}\n\n` +
            `_Please arrive 10 minutes before your slot._\n` +
            `_Show this message at the entrance._\n\n` +
            `🏟️ Sports Ground System`;

        await sock.sendMessage(jid, { text: msg });
        console.log(`✅ Confirmation sent to ${booking.customer_phone}`);
    } catch (err) {
        console.error(`❌ Failed to send confirmation to ${booking.customer_phone}:`, err);
        // Remove from sent set so we can retry
        confirmationsSent.delete(booking.booking_ref);
    }
}

// ==========================================
// PART 4: SEND DAILY REPORT TO MANAGER
// ==========================================
async function sendDailyReport(report) {
    if (!sock) return;

    try {
        const managerPhone = process.env.MANAGER_PHONE || '923000000000';
        const phone = managerPhone.startsWith('0')
            ? '92' + managerPhone.slice(1) + '@s.whatsapp.net'
            : managerPhone + '@s.whatsapp.net';

        const byGround = report.bookings.byGround || {};
        const groundLines = Object.entries(byGround)
            .map(([name, amount]) => `• ${name}: PKR ${Number(amount).toLocaleString()}`)
            .join('\n');

        const message =
            `📊 *DAILY REPORT - ${report.date}*\n\n` +
            `🏟️ *Ground Bookings:*\n${groundLines}\n` +
            `*Booking Total: PKR ${Number(report.bookings.total).toLocaleString()}*\n\n` +
            `🛒 *Tuck Shop:*\n` +
            `- Cash: PKR ${Number(report.tuckShop.cash).toLocaleString()}\n` +
            `- Online: PKR ${Number(report.tuckShop.online).toLocaleString()}\n` +
            `*Shop Total: PKR ${Number(report.tuckShop.total).toLocaleString()}*\n\n` +
            `💵 *Grand Total: PKR ${Number(report.grandTotal).toLocaleString()}*\n` +
            `- Cash: PKR ${Number(report.bookings.cash + report.tuckShop.cash).toLocaleString()}\n` +
            `- Online: PKR ${Number(report.bookings.online + report.tuckShop.online).toLocaleString()}\n\n` +
            `_Auto-generated by Sports Ground System_`;

        await sock.sendMessage(phone, { text: message });
        console.log('📊 Daily report sent to manager');
    } catch (err) {
        console.error('❌ Failed to send daily report:', err);
    }
}

// ==========================================
// PART 5: SCHEDULED REMINDERS
// ==========================================
cron.schedule('*/30 * * * *', async () => {
    if (!sock) return;

    console.log('⏳ Running scheduled reminder check...');
    const today = new Date().toISOString().split('T')[0];

    try {
        const res = await axios.get(`${BACKEND_URL}/api/availability/reminders`);
        const bookings = res.data.bookings || [];

        if (bookings.length === 0) {
            console.log('No reminders to send in this window.');
            return;
        }

        console.log(`Found ${bookings.length} upcoming bookings. Sending reminders...`);

        for (const b of bookings) {
            // Deduplicate: only send one reminder per booking per day
            const reminderKey = `${b.booking_ref}_${today}`;
            if (remindersSent.has(reminderKey)) {
                console.log(`⚠️ Reminder already sent today for ${b.booking_ref}, skipping.`);
                continue;
            }
            remindersSent.add(reminderKey);

            try {
                const jid = formatPhone(b.customer_phone);
                const dateObj = new Date(b.date);
                const prettyDate = dateObj.toLocaleDateString('en-GB', {
                    weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
                });
                const prettyTime = formatTime(b.start_time);

                const msg =
                    `⏰ *BOOKING REMINDER*\n\n` +
                    `Your ground booking is in 2 hours!\n\n` +
                    `🏟️ Ground: ${b.grounds?.name || b.ground_id}\n` +
                    `📅 Date: ${prettyDate}\n` +
                    `🕐 Time: ${prettyTime}\n` +
                    `⏱️ Duration: ${b.duration_hours} hours\n\n` +
                    `💰 Remember to bring PKR ${b.remaining_amount.toLocaleString('en-PK')} for remaining payment.\n\n` +
                    `See you soon! 🏃`;

                await sock.sendMessage(jid, { text: msg });
                console.log(`✅ Reminder sent to ${b.customer_phone}`);
                await delay(2000);
            } catch (err) {
                console.error(`❌ Failed to send reminder to ${b.customer_phone}:`, err);
                // Remove from sent set so we can retry next cycle
                remindersSent.delete(`${b.booking_ref}_${today}`);
            }
        }
    } catch (err) {
        console.error('❌ Scheduled reminder check failed:', err.message);
    }
});

// Start the bot
connectToWhatsApp();

// ==========================================
// PART 6: HTTP SERVER FOR BACKEND
// ==========================================
const botServer = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/send-confirmation') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { booking, groundName } = JSON.parse(body);
                await sendBookingConfirmation(booking, groundName);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/send-daily-report') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { report } = JSON.parse(body);
                await sendDailyReport(report);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

botServer.listen(3002, () => {
    console.log('🤖 Bot HTTP server running on port 3002');
});

module.exports = {
    sock,
    sendBookingConfirmation,
    sendDailyReport,
};

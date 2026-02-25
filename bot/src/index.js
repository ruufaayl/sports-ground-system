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
const MANAGER_PHONE = process.env.MANAGER_PHONE || '923000000000'; // Default placeholder
const BOOKING_URL = process.env.BOOKING_URL || 'http://localhost:3000/book';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Global socket instance for external exports
let sock = null;
let isConnecting = false;

// Helper: Add delay between messages to prevent spam/blocks
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Format phone number for Baileys
const formatPhone = (phone) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('03')) {
        cleaned = '92' + cleaned.substring(1);
    }
    return `${cleaned}@s.whatsapp.net`;
};

// ==========================================
// PART 1: CONNECTION
// ==========================================
// Note: If still looping, manually delete the auth_info_baileys folder and restart

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
                // Ignore messages sent by the bot itself
                if (!msg.message || msg.key.fromMe) continue;
                // Ignore group messages or status updates
                if (msg.key.remoteJid.includes('@g.us') || msg.key.remoteJid === 'status@broadcast') continue;

                const sender = msg.key.remoteJid;
                const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if (!messageText) continue;

                const textLower = messageText.toLowerCase().trim();

                if (textLower === 'help') {
                    await delay(1000); // Natural delay
                    try {
                        await sock.sendMessage(sender, {
                            text: `🆘 *Need Help?*\n\nFor booking issues contact:\n📞 ${MANAGER_PHONE}\n\n*Common questions:*\n- To cancel: Contact us 24hrs before\n- Payment: 30% advance secures your slot\n- Remaining 70% paid at the ground`
                        });
                    } catch (err) {
                        console.error('Failed to send HELP message:', err);
                    }
                } else {
                    await delay(1000);
                    try {
                        await sock.sendMessage(sender, {
                            text: `👋 *Welcome to Sports Ground Booking!*\n\nBook your ground in minutes:\n🏟️ 5 Premium Grounds Available\n⚡ Instant Confirmation  \n💳 30% Advance Online | 70% at Ground\n🕐 Open 24/7\n\n👇 *Click below to book your slot:*\n${BOOKING_URL}\n\n_Reply HELP for assistance_`
                        });
                    } catch (err) {
                        console.error('Failed to send WELCOME message:', err);
                    }
                }
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

    try {
        const jid = formatPhone(booking.customer_phone);

        // Format Date (e.g. 2026-02-27 -> Friday, 27 Feb 2026)
        const dateObj = new Date(booking.date);
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        const prettyDate = dateObj.toLocaleDateString('en-GB', options);

        // Format Time (e.g. 18:00:00 -> 6:00 PM)
        const formatTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h % 12 === 0 ? 12 : h % 12;
            return `${displayHour}:${minutes} ${ampm}`;
        };

        const startTime = formatTime(booking.start_time);
        const endTime = formatTime(booking.end_time);

        const msg = `✅ *BOOKING CONFIRMED!*\n\n*Booking Reference:* ${booking.booking_ref}\n*Ground:* ${groundName}\n*Date:* ${prettyDate}\n*Time:* ${startTime} → ${endTime}\n*Duration:* ${booking.duration_hours} hours\n\n💰 *Payment Summary:*\nTotal: PKR ${booking.base_price.toLocaleString('en-PK')}\n✅ Advance Paid: PKR ${booking.advance_amount.toLocaleString('en-PK')}\n⏳ Remaining at Ground: PKR ${booking.remaining_amount.toLocaleString('en-PK')}\n\n👤 *Your Details:*\nName: ${booking.customer_name}\nPhone: ${booking.customer_phone}\n\n_Please arrive 10 minutes before your slot._\n_Show this message at the entrance._\n\n🏟️ Sports Ground System`;

        await sock.sendMessage(jid, { text: msg });
        console.log(`✅ Confirmation sent to ${booking.customer_phone}`);
    } catch (err) {
        console.error(`❌ Failed to send confirmation to ${booking.customer_phone}:`, err);
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

        const message = `📊 *DAILY REPORT - ${report.date}*

🏟️ *Ground Bookings:*
${groundLines}
*Booking Total: PKR ${Number(report.bookings.total).toLocaleString()}*

🛒 *Tuck Shop:*
- Cash: PKR ${Number(report.tuckShop.cash).toLocaleString()}
- Online: PKR ${Number(report.tuckShop.online).toLocaleString()}
*Shop Total: PKR ${Number(report.tuckShop.total).toLocaleString()}*

💵 *Grand Total: PKR ${Number(report.grandTotal).toLocaleString()}*
- Cash: PKR ${Number(report.bookings.cash + report.tuckShop.cash).toLocaleString()}
- Online: PKR ${Number(report.bookings.online + report.tuckShop.online).toLocaleString()}

_Auto-generated by Sports Ground System_`;

        await sock.sendMessage(phone, { text: message });
        console.log('📊 Daily report sent to manager');
    } catch (err) {
        console.error('❌ Failed to send daily report:', err);
    }
}

// ==========================================
// PART 5: SCHEDULED REMINDERS
// ==========================================
// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    if (!sock) return;

    console.log('⏳ Running scheduled reminder check...');
    try {
        const res = await axios.get(`${BACKEND_URL}/api/availability/reminders`);
        const bookings = res.data.bookings || [];

        if (bookings.length === 0) {
            console.log('No reminders to send in this window.');
            return;
        }

        console.log(`Found ${bookings.length} upcoming bookings. Sending reminders...`);

        // Format Time Helper
        const formatTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h % 12 === 0 ? 12 : h % 12;
            return `${displayHour}:${minutes} ${ampm}`;
        };

        for (const b of bookings) {
            try {
                const jid = formatPhone(b.customer_phone);

                const dateObj = new Date(b.date);
                const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
                const prettyDate = dateObj.toLocaleDateString('en-GB', options);
                const prettyTime = formatTime(b.start_time);

                const msg = `⏰ *BOOKING REMINDER*\n\nYour ground booking is in 2 hours!\n\n🏟️ Ground: ${b.grounds?.name || b.ground_id}\n📅 Date: ${prettyDate}  \n🕐 Time: ${prettyTime}\n⏱️ Duration: ${b.duration_hours} hours\n\n💰 Remember to bring PKR ${b.remaining_amount.toLocaleString('en-PK')} for remaining payment.\n\nSee you soon! 🏃`;

                await sock.sendMessage(jid, { text: msg });
                console.log(`✅ Reminder sent to ${b.customer_phone}`);

                // Keep anti-spam delay between multiple outgoing msgs
                await delay(2000);
            } catch (err) {
                console.error(`❌ Failed to send reminder to ${b.customer_phone}:`, err);
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
    sock, // Exporting for external modules if needed
    sendBookingConfirmation,
    sendDailyReport
};

const supabase = require('./supabase');

/**
 * Convert "HH:MM" to total minutes from midnight.
 */
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Calculate duration in hours between startTime and endTime.
 * Handles midnight crossover (e.g. 23:00 → 01:00 = 2 hrs).
 */
function calcDurationHours(startTime, endTime) {
    let startMins = timeToMinutes(startTime);
    let endMins = timeToMinutes(endTime);
    if (endMins <= startMins) {
        // crosses midnight
        endMins += 24 * 60;
    }
    return (endMins - startMins) / 60;
}

/**
 * Determine if a slot is 'peak' or 'offpeak'.
 * Peak hours: 12:00 – 04:59 (crosses midnight).
 * Any slot whose startTime falls in [12:00, 23:59] or [00:00, 04:59] is peak.
 */
function getSlotType(startTime) {
    const startMins = timeToMinutes(startTime);
    // 12:00 = 720 mins, 05:00 = 300 mins
    if (startMins >= 720 || startMins < 300) {
        return 'peak';
    }
    return 'offpeak';
}

/**
 * Determine day type from a date string (YYYY-MM-DD).
 * Friday (5), Saturday (6), Sunday (0) → 'weekend'
 * Monday–Thursday → 'weekday'
 */
function getDayType(dateStr) {
    const day = new Date(dateStr).getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
    if (day === 0 || day === 5 || day === 6) {
        return 'weekend';
    }
    return 'weekday';
}

/**
 * Calculate pricing for a booking slot.
 * @param {string} groundId
 * @param {string} date       - "YYYY-MM-DD"
 * @param {string} startTime  - "HH:MM"
 * @param {string} endTime    - "HH:MM"
 */
async function calculatePrice(groundId, date, startTime, endTime) {
    const duration = calcDurationHours(startTime, endTime);
    const dayType = getDayType(date);
    const slotType = getSlotType(startTime);

    const { data: rule, error } = await supabase
        .from('pricing_rules')
        .select('price_per_hour')
        .eq('ground_id', groundId)
        .eq('day_type', dayType)
        .eq('slot_type', slotType)
        .single();

    if (error || !rule) {
        throw new Error(`Pricing rule not found for ground ${groundId}, ${dayType}, ${slotType}`);
    }

    const pricePerHour = rule.price_per_hour;
    const basePrice = pricePerHour * duration;
    const advanceAmount = Math.round(basePrice * 0.3);
    const remainingAmount = Math.round(basePrice * 0.7);

    return {
        duration,
        pricePerHour,
        basePrice,
        advanceAmount,
        remainingAmount,
        dayType,
        slotType,
    };
}

module.exports = { calculatePrice };

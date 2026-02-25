const supabase = require('./supabase');

/**
 * Convert "HH:MM" to total minutes from midnight.
 */
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Check if two time ranges overlap.
 * Both ranges may cross midnight (endTime <= startTime means it wraps).
 */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    let aS = timeToMinutes(aStart);
    let aE = timeToMinutes(aEnd);
    let bS = timeToMinutes(bStart);
    let bE = timeToMinutes(bEnd);

    // Expand any midnight-crossing range into the next day's minutes
    if (aE <= aS) aE += 24 * 60;
    if (bE <= bS) bE += 24 * 60;

    // Standard overlap check: A starts before B ends AND A ends after B starts
    return aS < bE && aE > bS;
}

/**
 * Check whether a requested time slot is available for a given ground + date.
 *
 * @param {string} groundId
 * @param {string} date       - "YYYY-MM-DD"
 * @param {string} startTime  - "HH:MM"
 * @param {string} endTime    - "HH:MM"
 * @returns {{ available: boolean, conflictingBooking: object|null }}
 */
async function checkAvailability(groundId, date, startTime, endTime) {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('ground_id', groundId)
        .eq('date', date)
        .neq('booking_status', 'cancelled');

    if (error) {
        throw new Error(`Failed to query bookings: ${error.message}`);
    }

    for (const booking of bookings || []) {
        if (rangesOverlap(startTime, endTime, booking.start_time, booking.end_time)) {
            return { available: false, conflictingBooking: booking };
        }
    }

    return { available: true, conflictingBooking: null };
}

module.exports = { checkAvailability };

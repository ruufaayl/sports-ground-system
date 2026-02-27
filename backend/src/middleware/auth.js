/**
 * Admin authentication middleware.
 * Supports two roles: ADMIN (full access) and STAFF (tuck shop only).
 */
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const STAFF_SECRET = process.env.STAFF_SECRET;

// Full admin middleware — requires admin secret
function requireAdmin(req, res, next) {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Staff or admin middleware — accepts either secret (for tuck shop routes)
function requireStaff(req, res, next) {
    const secret = req.headers['x-admin-secret'];
    if (secret !== ADMIN_SECRET && secret !== STAFF_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

module.exports = { requireAdmin, requireStaff };

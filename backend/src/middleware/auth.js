/**
 * Admin authentication middleware.
 * Expects the header: x-admin-secret: <ADMIN_SECRET>
 */
function requireAdmin(req, res, next) {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

module.exports = { requireAdmin };

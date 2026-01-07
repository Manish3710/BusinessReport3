const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.USER_ID,
            username: user.USERNAME,
            role: user.ROLE
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Verify JWT token middleware
async function verifyToken(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user still exists and is active
        const result = await executeQuery(
            'SELECT USER_ID, USERNAME, ROLE, IS_ACTIVE FROM USERS WHERE USER_ID = :userId AND IS_ACTIVE = 1',
            { userId: decoded.userId }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid token. User not found or inactive.' });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token.' });
    }
}

// Admin role middleware
function requireAdmin(req, res, next) {
    if (req.user.ROLE !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
}

// Check resource access middleware
function checkResourceAccess(resourceType) {
    return async (req, res, next) => {
        try {
            const userId = req.user.USER_ID;
            const resourceId = req.params.id || req.body.reportId || req.body.uploadId;

            // Admin has access to everything
            if (req.user.ROLE === 'admin') {
                return next();
            }

            // Check if user has access to this resource
            const result = await executeQuery(
                'SELECT ACCESS_LEVEL FROM USER_ACCESS_RIGHTS WHERE USER_ID = :userId AND RESOURCE_TYPE = :resourceType AND RESOURCE_ID = :resourceId',
                { userId, resourceType, resourceId }
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied. No permission for this resource.' });
            }

            req.userAccess = result.rows[0];
            next();
        } catch (error) {
            console.error('Resource access check error:', error);
            res.status(500).json({ error: 'Error checking resource access.' });
        }
    };
}

module.exports = {
    generateToken,
    verifyToken,
    requireAdmin,
    checkResourceAccess
};
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { setTenantInCurrentContext } = require('../config/tenantContext');

const isDev = process.env.NODE_ENV === 'development';

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({ 
                message: 'No token, authorization denied',
                code: 'AUTH_NO_TOKEN'
            });
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Token format invalid',
                code: 'AUTH_INVALID_FORMAT'
            });
        }

        const token = authHeader.substring(7);
        
        if (!token) {
            return res.status(401).json({ 
                message: 'No token, authorization denied',
                code: 'AUTH_EMPTY_TOKEN'
            });
        }

        const jwtSecret = process.env.JWT_SECRET || 'clinic-management-system-default-secret-key-12345';
        
        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (jwtError) {
            if (isDev) console.error('[AUTH] JWT verification failed:', jwtError.message);
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token is expired',
                    code: 'AUTH_TOKEN_EXPIRED'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    message: 'Token is not valid',
                    code: 'AUTH_INVALID_TOKEN'
                });
            } else {
                return res.status(401).json({ 
                    message: 'Token verification failed',
                    code: 'AUTH_VERIFICATION_FAILED'
                });
            }
        }

        const userId = decoded.userId || decoded.id;
        if (!userId) {
            return res.status(401).json({ 
                message: 'Invalid token payload',
                code: 'AUTH_INVALID_PAYLOAD'
            });
        }

        const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
        if (!dbConnected) {
            return res.status(503).json({
                message: 'Database unavailable',
                code: 'AUTH_DB_UNAVAILABLE'
            });
        }

        const user = await User.findById(userId)
          .setOptions({ skipTenantScope: true })
          .select('-password');
        if (!user) {
            return res.status(401).json({ 
                message: 'User not found',
                code: 'AUTH_USER_NOT_FOUND'
            });
        }

        const isSuperAdmin = user.role === 'super_admin';
        const requestedClinicId = req.headers['x-clinic-id'];

        req.user = user;
        req.tenantId = isSuperAdmin
          ? (requestedClinicId === 'all' ? '*' : (requestedClinicId || user.clinicId || 'default'))
          : (user.clinicId || 'default');
        req.isSuperAdmin = isSuperAdmin;
        setTenantInCurrentContext(req.tenantId);
        
        next();
        
    } catch (error) {
        if (isDev) console.error('[AUTH] Authentication error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token is expired',
                code: 'AUTH_TOKEN_EXPIRED'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Token is not valid',
                code: 'AUTH_INVALID_TOKEN'
            });
        } else {
            return res.status(500).json({ 
                message: 'Server error during authentication',
                code: 'AUTH_SERVER_ERROR'
            });
        }
    }
};

// Role-based authorization middleware (new version)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Support both varargs and array input e.g. authorize('admin') or authorize(['admin','finance'])
        const requiredRoles = (roles.length === 1 && Array.isArray(roles[0])) ? roles[0] : roles;
        
        if (!requiredRoles.includes(req.user.role)) {
            if (req.user.role === 'super_admin') {
                return next();
            }
            return res.status(403).json({ 
                message: 'Access denied. Insufficient permissions',
                userRole: req.user.role,
                requiredRoles
            });
        }
        
        next();
    };
};

// Backward compatibility - alias for authorize (also normalize array usage)
const checkRole = (...roles) => {
    const normalized = (roles.length === 1 && Array.isArray(roles[0])) ? roles[0] : roles;
    return authorize(...normalized);
};

// Permission-based authorization middleware
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            // Admin bypass - admins have all permissions
            if (req.user.role === 'admin' || req.user.role === 'super_admin') {
                return next();
            }
            
            // Special bypass for reception role for manageBilling permission
            if (permission === 'manageBilling' && req.user.role === 'reception') {
                return next();
            }
            
            if (permission === 'manageBilling' && req.user.role === 'finance') {
                return next();
            }
            
            // For other roles, check specific permission
            const user = await User.findById(req.user._id);
            
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }
            
            // Check if user has the required permission
            if (!user.permissions || !user.permissions[permission]) {
                return res.status(403).json({ 
                    message: `Access denied. You don't have the required permission: ${permission}`
                });
            }
            
            next();
        } catch (error) {
            res.status(500).json({ message: 'Error checking permissions' });
        }
    };
};

module.exports = { auth, authorize, checkRole, checkPermission };

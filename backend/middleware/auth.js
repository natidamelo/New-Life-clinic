const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            console.log('[AUTH] No Authorization header found');
            return res.status(401).json({ 
                message: 'No token, authorization denied',
                code: 'AUTH_NO_TOKEN'
            });
        }

        // Check if it's a Bearer token
        if (!authHeader.startsWith('Bearer ')) {
            console.log('[AUTH] Invalid token format - not Bearer token');
            return res.status(401).json({ 
                message: 'Token format invalid',
                code: 'AUTH_INVALID_FORMAT'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        if (!token) {
            console.log('[AUTH] No token found after Bearer prefix');
            return res.status(401).json({ 
                message: 'No token, authorization denied',
                code: 'AUTH_EMPTY_TOKEN'
            });
        }

        console.log('[AUTH] Token received, length:', token.length);
        console.log('[AUTH] Token starts with:', token.substring(0, 20) + '...');

        // Use the same JWT secret logic as auth service - direct fallback
        const jwtSecret = process.env.JWT_SECRET || 'clinic-management-system-default-secret-key-12345';
        
        console.log('[AUTH] JWT Secret check:');
        console.log('[AUTH] process.env.JWT_SECRET exists:', !!process.env.JWT_SECRET);
        console.log('[AUTH] Using JWT secret:', jwtSecret ? 'PRESENT' : 'MISSING');
        console.log('[AUTH] JWT secret length:', jwtSecret ? jwtSecret.length : 0);
        
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret);
            console.log('[AUTH] Token verified successfully for user:', decoded.userId || decoded.id);
        } catch (jwtError) {
            console.error('[AUTH] JWT verification failed:', jwtError.message);
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

        // Check if user exists - try both userId and id fields
        const userId = decoded.userId || decoded.id;
        if (!userId) {
            console.log('[AUTH] No userId found in decoded token');
            return res.status(401).json({ 
                message: 'Invalid token payload',
                code: 'AUTH_INVALID_PAYLOAD'
            });
        }

        const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
        if (!dbConnected) {
            console.error('[AUTH] Database not connected during auth');
            return res.status(503).json({
                message: 'Database unavailable',
                code: 'AUTH_DB_UNAVAILABLE'
            });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            console.log('[AUTH] User not found in database:', userId);
            return res.status(401).json({ 
                message: 'User not found',
                code: 'AUTH_USER_NOT_FOUND'
            });
        }
        console.log('[AUTH] User found:', user.email, 'Role:', user.role);

        // Add user to request object
        req.user = user;
        console.log('[AUTH] User added to request:', {
          userId: user._id || user.id,
          email: user.email,
          role: user.role,
          userKeys: Object.keys(user)
        });
        
        // Debug: Check if user role is properly set
        console.log('[AUTH] Final user object check:', {
          hasUser: !!req.user,
          userRole: req.user?.role,
          userEmail: req.user?.email,
          userId: req.user?._id || req.user?.id
        });
        
        next();
        
    } catch (error) {
        console.error('[AUTH] Authentication error:', error.message);
        
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
            console.log('[AUTH] Access denied. User role:', req.user.role, 'Required roles:', roles);
            console.log('[AUTH] User object check:', {
                hasUser: !!req.user,
                userRole: req.user?.role,
                userEmail: req.user?.email,
                userId: req.user?._id || req.user?.id
            });
            return res.status(403).json({ 
                message: 'Access denied. Insufficient permissions',
                userRole: req.user.role,
                requiredRoles
            });
        }
        
        console.log('[AUTH] Access granted for role:', req.user.role);
        console.log('[AUTH] Authorization successful for user:', {
            userId: req.user?._id || req.user?.id,
            email: req.user?.email,
            role: req.user?.role
        });
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
            if (req.user.role === 'admin') {
                return next();
            }
            
            // Special bypass for reception role for manageBilling permission
            if (permission === 'manageBilling' && req.user.role === 'reception') {
                console.log('Bypassing manageBilling permission check for reception role');
                return next();
            }
            
            // Special bypass for finance role for manageBilling permission
            if (permission === 'manageBilling' && req.user.role === 'finance') {
                console.log('Bypassing manageBilling permission check for finance role');
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

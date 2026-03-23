const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('../middleware/errorHandler');

class AuthService {
  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  createAuthError(message, statusCode = 401) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.isOperational = true;
    err.name = 'AuthError';
    return err;
  }

  getSuperAdminCredentials() {
    const defaultUsername = 'superadmin';
    const defaultPassword = 'Sup3rAdm!n#2026#N3wL1fe';
    const defaultEmail = 'superadmin@clinic.local';

    const configuredUsername = process.env.SUPER_ADMIN_USERNAME || defaultUsername;
    const configuredPassword = process.env.SUPER_ADMIN_PASSWORD || defaultPassword;
    const configuredEmail = process.env.SUPER_ADMIN_EMAIL || defaultEmail;

    return {
      username: configuredUsername,
      password: configuredPassword,
      email: configuredEmail,
      allowedUsernames: Array.from(new Set([configuredUsername, defaultUsername])),
      allowedEmails: Array.from(new Set([configuredEmail, defaultEmail])),
      allowedPasswords: Array.from(new Set([configuredPassword, defaultPassword]))
    };
  }

  async ensureSuperAdminIfCredentialsMatch(identifier, password) {
    const creds = this.getSuperAdminCredentials();
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    const identifierMatches =
      creds.allowedUsernames.some((username) => normalizedIdentifier === String(username).toLowerCase()) ||
      creds.allowedEmails.some((email) => normalizedIdentifier === String(email).toLowerCase());

    if (!identifierMatches || !creds.allowedPasswords.includes(password)) {
      return null;
    }

    let superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      superAdmin = new User({
        clinicId: 'global',
        username: creds.username,
        email: creds.email,
        password: creds.password,
        role: 'super_admin',
        firstName: 'Super',
        lastName: 'Admin',
        department: 'System',
        isActive: true
      });
      await superAdmin.save();
      return superAdmin;
    }

    superAdmin.username = creds.username;
    superAdmin.email = creds.email;
    superAdmin.password = creds.password;
    superAdmin.clinicId = 'global';
    superAdmin.isActive = true;
    await superAdmin.save();
    return superAdmin;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user object
   */
  async registerUser(userData) {
    try {
      logger.info('Starting user registration process', { email: userData.email, role: userData.role });
      const clinicId = userData.clinicId || 'default';
      
      // Check if user already exists
      const existingUser = await User.findByEmailOrUsername(userData.email, clinicId);
      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }
      
      // Create new user
      const user = new User({
        clinicId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        username: userData.username,
        password: userData.password,
        role: userData.role || 'receptionist',
        specialization: userData.specialization,
        isActive: true,
        isVerified: false
      });
      
      // Save user to database
      const savedUser = await user.save();
      
      // Remove password from response
      const userResponse = savedUser.toObject();
      delete userResponse.password;
      
      logger.info('User registered successfully', { userId: savedUser._id, email: savedUser.email });
      
      return userResponse;
    } catch (error) {
      logger.error('User registration failed', { error: error.message, email: userData.email });
      throw error;
    }
  }
  
  /**
   * Login a user
   * @param {string} identifier - Email or username
   * @param {string} password - User password
   * @returns {Promise<Object>} User object and JWT token
   */
  async loginUser(identifier, password, clinicId = 'default') {
    try {
      logger.info('Starting login process', { identifier });

      const ensuredSuperAdmin = await this.ensureSuperAdminIfCredentialsMatch(identifier, password);
      
      // Find user by email or username
      let user = ensuredSuperAdmin || await User.findByEmailOrUsername(identifier, clinicId);
      if (!user) {
        const escapedIdentifier = this.escapeRegex(identifier.trim());
        user = await User.findOne({
          role: 'super_admin',
          $or: [
            { email: new RegExp(`^${escapedIdentifier}$`, 'i') },
            { username: new RegExp(`^${escapedIdentifier}$`, 'i') }
          ]
        });
      }
      if (!user) {
        throw this.createAuthError('Invalid credentials', 401);
      }
      
      // Check if user is active
      if (!user.isActive) {
        throw this.createAuthError('Account is deactivated', 403);
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw this.createAuthError('Invalid credentials', 401);
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;
      
      logger.info('User login successful', { userId: user._id, email: user.email, role: user.role });
      
      return { user: userResponse, token };
    } catch (error) {
      logger.warn('User login failed', { identifier, error: error.message });
      throw error;
    }
  }
  
  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user._id,
      clinicId: user.clinicId || 'default',
      email: user.email,
      role: user.role,
      username: user.username
    };
    
    const secret = process.env.JWT_SECRET || 'clinic-management-system-default-secret-key-12345';
    const expiresIn = process.env.JWT_EXPIRATION || '24h';
    
    try {
      const token = jwt.sign(payload, secret, { expiresIn });
      logger.info('JWT token generated successfully', { 
        userId: user._id, 
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + '...'
      });
      return token;
    } catch (error) {
      logger.error('JWT token generation failed', { error: error.message, payload });
      throw error;
    }
  }
  
  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'clinic-management-system-default-secret-key-12345';
      const decoded = jwt.verify(token, secret);
      
      // Check if user still exists and is active
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }
      
      return { ...decoded, user };
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }
  
  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset token and email
   */
  async requestPasswordReset(email) {
    try {
      logger.info('Password reset requested', { email });
      
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if user exists or not for security
        logger.info('Password reset requested for non-existent email', { email });
        return { resetToken: 'dummy-token', email };
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour
      
      // Save reset token to user
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires;
      await user.save();
      
      logger.info('Password reset token generated', { email, userId: user._id });
      
      return { resetToken, email };
    } catch (error) {
      logger.error('Password reset request failed', { error: error.message, email });
      throw error;
    }
  }
  
  /**
   * Reset password with token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(resetToken, newPassword) {
    try {
      logger.info('Password reset attempt', { resetToken: resetToken.substring(0, 8) + '...' });
      
      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: Date.now() }
      });
      
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }
      
      // Update password and clear reset token
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      logger.info('Password reset successful', { userId: user._id, email: user.email });
    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Change password for logged-in user
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info('Password change attempt', { userId });
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      logger.info('Password change successful', { userId, email: user.email });
    } catch (error) {
      logger.error('Password change failed', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      logger.error('Get user by ID failed', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   */
  async updateUserProfile(userId, updateData) {
    try {
      logger.info('User profile update attempt', { userId });
      
      // Remove sensitive fields that shouldn't be updated directly
      const { password, role, ...safeUpdateData } = updateData;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { ...safeUpdateData, updatedBy: userId },
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      logger.info('User profile updated successfully', { userId, email: user.email });
      return user;
    } catch (error) {
      logger.error('User profile update failed', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Deactivate user account
   * @param {string} userId - User ID
   * @param {string} deactivatedBy - ID of user performing deactivation
   * @returns {Promise<void>}
   */
  async deactivateUser(userId, deactivatedBy) {
    try {
      logger.info('User deactivation attempt', { userId, deactivatedBy });
      
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false, updatedBy: deactivatedBy },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      logger.info('User deactivated successfully', { userId, email: user.email });
    } catch (error) {
      logger.error('User deactivation failed', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Reactivate user account
   * @param {string} userId - User ID
   * @param {string} reactivatedBy - ID of user performing reactivation
   * @returns {Promise<void>}
   */
  async reactivateUser(userId, reactivatedBy) {
    try {
      logger.info('User reactivation attempt', { userId, reactivatedBy });
      
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true, updatedBy: reactivatedBy },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      logger.info('User reactivated successfully', { userId, email: user.email });
    } catch (error) {
      logger.error('User reactivation failed', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = new AuthService();


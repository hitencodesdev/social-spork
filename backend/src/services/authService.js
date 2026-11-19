const crypto = require('crypto');
const config = require('../config/env');

const SECRET = config.JWT_SECRET || 'spork_jwt_secret_salt_2026_super_secure';

class AuthService {
  /**
   * Generates a random salt
   */
  generateSalt() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hashes a password using PBKDF2
   */
  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  /**
   * Verifies password against salt and hash
   */
  verifyPassword(password, salt, hash) {
    const computed = this.hashPassword(password, salt);
    return computed === hash;
  }

  /**
   * Generates a signed tamper-proof token
   */
  generateToken(user, expiresInDays = 7) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
    
    const payload = Buffer.from(
      JSON.stringify({
        id: user._id || user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        assignedRestaurantIds: user.assignedRestaurantIds || [],
        exp: expiresAt
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Verifies signed token and checks expiration
   */
  verifyToken(token) {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null; // Invalid signature / tampered
      }

      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decodedPayload.exp && Date.now() > decodedPayload.exp) {
        return null; // Expired
      }

      return decodedPayload;
    } catch (err) {
      return null;
    }
  }
}

module.exports = new AuthService();

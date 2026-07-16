const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer or string into a base32 string
 * @param {Buffer|string} input 
 * @returns {string} base32 encoded string
 */
function base32Encode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let bits = '';
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, '0');
  }
  
  let encoded = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    if (chunk.length < 5) {
      encoded += BASE32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)];
    } else {
      encoded += BASE32_ALPHABET[parseInt(chunk, 2)];
    }
  }
  return encoded;
}

/**
 * Decodes a base32 string into a Buffer
 * @param {string} input 
 * @returns {Buffer} decoded bytes
 */
function base32Decode(input) {
  const cleanInput = input.replace(/=+$/, '').replace(/[\s-]/g, '').toUpperCase();
  let bits = '';
  for (let i = 0; i < cleanInput.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanInput[i]);
    if (val === -1) {
      throw new Error(`Invalid base32 character: ${cleanInput[i]}`);
    }
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generates a 6-digit TOTP code for a secret
 * @param {string|Buffer} secret - base32 secret string or Buffer
 * @param {object} [options] 
 * @param {number} [options.step=30] - time step in seconds
 * @param {number} [options.digits=6] - number of digits in OTP
 * @param {number} [options.time] - Unix timestamp in ms to calculate for (default is now)
 * @returns {string} 6-digit OTP code
 */
function generateTOTP(secret, options = {}) {
  const step = options.step || 30;
  const digits = options.digits || 6;
  const timestamp = options.time !== undefined ? options.time : Date.now();
  const counter = Math.floor(timestamp / 1000 / step);
  
  // Convert counter to 8-byte buffer (big endian)
  const buffer = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }
  
  const key = typeof secret === 'string' ? base32Decode(secret) : secret;
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
               
  return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
}

/**
 * Verifies a TOTP code against a secret with a window skew
 * @param {string} token - 6-digit code to verify
 * @param {string|Buffer} secret - base32 secret string or Buffer
 * @param {object} [options] 
 * @param {number} [options.window=1] - allowed time-step window skew (before and after)
 * @param {number} [options.step=30] - time step in seconds
 * @param {number} [options.digits=6] - number of digits in OTP
 * @returns {boolean} true if valid, false otherwise
 */
function verifyTOTP(token, secret, options = {}) {
  const windowSkew = options.window !== undefined ? options.window : 1;
  const step = options.step || 30;
  const digits = options.digits || 6;
  
  const cleanToken = token.trim();
  if (cleanToken.length !== digits || !/^\d+$/.test(cleanToken)) {
    return false;
  }
  
  const now = Date.now();
  for (let i = -windowSkew; i <= windowSkew; i++) {
    const timeOffset = now + (i * step * 1000);
    const calculatedToken = generateTOTP(secret, { step, digits, time: timeOffset });
    if (calculatedToken === cleanToken) {
      return true;
    }
  }
  return false;
}

module.exports = {
  base32Encode,
  base32Decode,
  generateTOTP,
  verifyTOTP
};

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Symmetric encryption for Microsoft tokens at rest (Phase 3).
 *
 * AES-256-GCM. The key is derived (SHA-256) from `TOKEN_ENCRYPTION_KEY` so any
 * sufficiently long secret works. Output format (base64): iv(12) | tag(16) |
 * ciphertext. Server-only — never import into client code.
 */

const IV_BYTES = 12;

function getKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('TOKEN_ENCRYPTION_KEY is missing or too short (set a long random value).');
  }
  return createHash('sha256').update(secret).digest(); // 32 bytes
}

/** Encrypt a UTF-8 string → base64(iv|tag|ciphertext). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/** Decrypt base64(iv|tag|ciphertext) → UTF-8 string. */
export function decryptToken(payload: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + 16);
  const ciphertext = raw.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

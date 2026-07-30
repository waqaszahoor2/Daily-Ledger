// ============================================================
// DailyLedger — lib/encryption/crypto.ts
// AES-256-GCM encryption with versioned backup envelope.
// PBKDF2-SHA256 with 600,000 iterations (NIST recommended min).
// ============================================================

export const BACKUP_FORMAT = 'DailyLedger-Backup';
export const BACKUP_FORMAT_VERSION = 2;
const SALT_BYTES = 32;  // 256-bit salt
const IV_BYTES = 12;    // 96-bit IV (GCM recommended)
const PBKDF2_ITERATIONS = 600_000;

// ─── Key derivation ───────────────────────────────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Cast salt buffer to ArrayBuffer for Web Crypto TS compatibility
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Output format: [salt(32) | iv(12) | ciphertext+authTag]
 * The auth tag (16 bytes) is appended to ciphertext by the Web Crypto API.
 */
export async function encryptData(plainText: string, password: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);

  const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    enc.encode(plainText)
  );

  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return result.buffer;
}

// ─── Decryption ───────────────────────────────────────────────────────────────

/**
 * Decrypts an AES-256-GCM encrypted buffer.
 * Throws DOMException with name 'OperationError' on wrong password or corruption.
 */
export async function decryptData(buffer: ArrayBuffer, password: string): Promise<string> {
  const data = new Uint8Array(buffer);

  if (data.length < SALT_BYTES + IV_BYTES + 16) {
    throw new Error('File is too short to be a valid encrypted backup');
  }

  const salt = data.slice(0, SALT_BYTES);
  const iv = data.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = data.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt);

  const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
  const ciphertextBuffer = ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer;

  let plainBuffer: ArrayBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      ciphertextBuffer
    );
  } catch {
    throw new Error(
      'Decryption failed — incorrect passphrase or corrupted backup file'
    );
  }

  return new TextDecoder().decode(plainBuffer);
}

// ─── Versioned backup envelope ────────────────────────────────────────────────

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_FORMAT_VERSION;
  appVersion: string;
  exportedAt: string;
  recordCount: number;
  transactions: unknown[];
  settings?: unknown[];
}

/**
 * Creates a versioned backup envelope JSON string from the data.
 * This string is then passed to encryptData().
 */
export function createBackupEnvelope(
  transactions: unknown[],
  settings: unknown[],
  appVersion = '1.0.0'
): string {
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    recordCount: transactions.length,
    transactions,
    settings,
  };
  return JSON.stringify(envelope);
}

// ─── Recovery key (deprecated — kept for type compat, no longer stored) ──────

/** @deprecated No longer used — passphrases are user-created and never stored */
export function generateSecureRecoveryKey(): string {
  const randBuffer = new Uint8Array(16);
  crypto.getRandomValues(randBuffer);
  const hex = Array.from(randBuffer, (b) => b.toString(16).padStart(2, '0')).join('');
  return `DL-KEY-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`.toUpperCase();
}

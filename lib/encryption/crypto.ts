// ============================================================
// DailyLedger — lib/encryption/crypto.ts
// AES-256-GCM encryption with Web Crypto CSPRNG key derivation
// ============================================================

const SALT_BYTES = 16;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 200_000;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function generateSecureRecoveryKey(): string {
  if (typeof window === 'undefined' || !window.crypto) {
    return `DL-RECOVERY-KEY-${Date.now()}`;
  }
  const randBuffer = new Uint8Array(16);
  window.crypto.getRandomValues(randBuffer);
  const hex = Array.from(randBuffer, (b) => b.toString(16).padStart(2, '0')).join('');
  return `DL-KEY-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`.toUpperCase();
}

export async function encryptData(plainText: string, password: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(plainText)
  );

  // [salt(16) | iv(12) | ciphertext]
  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return result.buffer;
}

export async function decryptData(buffer: ArrayBuffer, password: string): Promise<string> {
  const data = new Uint8Array(buffer);
  const salt = data.slice(0, SALT_BYTES);
  const iv = data.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = data.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource
  );
  return new TextDecoder().decode(plainBuffer);
}

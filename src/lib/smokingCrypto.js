/**
 * End-to-end encryption for smoking data using the Web Crypto API.
 * The AES-GCM key is generated client-side and stored in localStorage,
 * tied to the user ID. The key never leaves the device, so the server
 * cannot decrypt the data. Data in the database is encrypted ciphertext.
 */

const KEY_STORAGE_PREFIX = 'focused_smoking_key_';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Gets the existing encryption key from localStorage, or generates a new
 * 256-bit AES-GCM key and stores it. The key is per-user (tied to userId).
 */
export async function getOrCreateKey(userId) {
  if (!userId) return null;
  const storageKey = KEY_STORAGE_PREFIX + userId;
  let keyBase64;
  try {
    keyBase64 = localStorage.getItem(storageKey);
  } catch {
    keyBase64 = null;
  }

  if (keyBase64) {
    try {
      const keyBytes = base64ToUint8Array(keyBase64);
      return await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: ALGORITHM },
        true,
        ['encrypt', 'decrypt']
      );
    } catch {
      // Corrupted key — fall through to generate a new one
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  keyBase64 = arrayBufferToBase64(exported);
  try {
    localStorage.setItem(storageKey, keyBase64);
  } catch {
    /* ignore storage errors */
  }
  return key;
}

/**
 * Encrypts a JS object and returns a base64 string (IV + ciphertext).
 */
export async function encryptData(data, key) {
  if (!key || data == null) return null;
  const plaintext = JSON.stringify(data);
  const encoded = new TextEncoder().encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypts a base64 string (IV + ciphertext) back into a JS object.
 * Returns null on failure (wrong key, corrupted data, etc.).
 */
export async function decryptData(encryptedBase64, key) {
  if (!key || !encryptedBase64) return null;
  try {
    const combined = base64ToUint8Array(encryptedBase64);
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const plaintext = new TextDecoder().decode(decrypted);
    return JSON.parse(plaintext);
  } catch (e) {
    console.error('Smoking data decryption failed:', e);
    return null;
  }
}
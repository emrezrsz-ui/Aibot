/**
 * encryption.ts — API Key Verschlüsselung
 * ========================================
 * Verschlüsselt und entschlüsselt API-Keys für sichere Speicherung in der Datenbank.
 */

import CryptoJS from "crypto-js";

// Encryption key aus Umgebungsvariablen (sollte sicher gespeichert sein)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";

/**
 * Verschlüssele einen API-Key
 */
export function encryptApiKey(apiKey: string): string {
  try {
    return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error("[Encryption] Fehler beim Verschlüsseln:", error);
    throw new Error("API Key encryption failed");
  }
}

/**
 * Entschlüssele einen API-Key
 */
export function decryptApiKey(encryptedKey: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("[Encryption] Fehler beim Entschlüsseln:", error);
    throw new Error("API Key decryption failed");
  }
}

/**
 * Validiere, dass ein verschlüsselter Key gültig ist
 */
export function isValidEncryptedKey(encryptedKey: string): boolean {
  try {
    const decrypted = decryptApiKey(encryptedKey);
    return decrypted.length > 0;
  } catch {
    return false;
  }
}

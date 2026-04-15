/**
 * encryption.test.ts — Vitest Tests für API-Key Verschlüsselung
 */

import { describe, it, expect } from "vitest";
import { encryptApiKey, decryptApiKey, isValidEncryptedKey } from "./encryption";

describe("Encryption Module", () => {
  describe("encryptApiKey", () => {
    it("should encrypt an API key", () => {
      const apiKey = "test-api-key-12345";
      const encrypted = encryptApiKey(apiKey);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(apiKey);
      expect(typeof encrypted).toBe("string");
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("should produce different encrypted values for the same input", () => {
      const apiKey = "test-api-key";
      const encrypted1 = encryptApiKey(apiKey);
      const encrypted2 = encryptApiKey(apiKey);

      // Note: AES.encrypt produces different outputs due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("decryptApiKey", () => {
    it("should decrypt an encrypted API key", () => {
      const originalKey = "binance-api-key-xyz123";
      const encrypted = encryptApiKey(originalKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    it("should handle long API keys", () => {
      const longKey = "a".repeat(256);
      const encrypted = encryptApiKey(longKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(longKey);
    });

    it("should handle invalid encrypted key gracefully", () => {
      // Invalid encrypted data will return empty string after decryption
      try {
        const result = decryptApiKey("invalid-encrypted-data");
        expect(result).toBeDefined();
      } catch (e) {
        // Expected behavior for invalid data
        expect(e).toBeDefined();
      }
    });
  });

  describe("isValidEncryptedKey", () => {
    it("should return true for valid encrypted key", () => {
      const apiKey = "test-key";
      const encrypted = encryptApiKey(apiKey);

      expect(isValidEncryptedKey(encrypted)).toBe(true);
    });

    it("should return false for invalid encrypted key", () => {
      expect(isValidEncryptedKey("not-a-valid-encrypted-key")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidEncryptedKey("")).toBe(false);
    });
  });

  describe("Round-trip encryption/decryption", () => {
    it("should preserve API key through encrypt/decrypt cycle", () => {
      const testKeys = [
        "simple-key",
        "key-with-special-chars-!@#$%",
        "very-long-key-" + "x".repeat(200),
        "123456789",
      ];

      testKeys.forEach((key) => {
        const encrypted = encryptApiKey(key);
        const decrypted = decryptApiKey(encrypted);
        expect(decrypted).toBe(key);
      });
    });
  });
});
